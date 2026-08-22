/**
 * Edge Functions Adversarial Test Suite — Finding H-03 & H-04: Verify Payment
 * Tests:
 * 1. Unauthenticated request rejection (401)
 * 2. Caller ownership check (H-03): User B cannot verify User A's subscription (403/Forbidden)
 * 3. Idempotency test: Already active subscription returns early without duplicate activation
 * 4. Atomic activation via RPC (H-04)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadEdgeFunction } from './test-helper';

let mockUser: { id: string; email: string } | null = null;
let mockSubscriptions: Array<{
  id: string;
  user_id: string;
  subscription_type: string;
  status: string;
  payment_reference: string;
  expires_at?: string | null;
}> = [];
let mockRpcActivateResult: { success: boolean; already_active?: boolean; subscription_type?: string; error?: string } | null = null;
let mockRpcError: Error | null = null;

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      auth: {
        getUser: vi.fn().mockImplementation(async (token?: string) => {
          if (!mockUser || !token || token.includes('invalid')) {
            return { data: { user: null }, error: new Error('Invalid token') };
          }
          return { data: { user: mockUser }, error: null };
        }),
      },
      rpc: vi.fn().mockImplementation(async (funcName: string, params: any) => {
        if (funcName === 'activate_subscription_atomic') {
          if (mockRpcError) {
            return { data: null, error: mockRpcError };
          }
          if (mockRpcActivateResult) {
            return { data: mockRpcActivateResult, error: null };
          }
          const sub = mockSubscriptions.find(s => s.id === params.p_subscription_id && s.user_id === params.p_user_id);
          if (!sub) {
            return { data: { success: false, error: 'SUBSCRIPTION_NOT_FOUND' }, error: null };
          }
          if (sub.status === 'active') {
            return { data: { success: true, already_active: true, subscription_type: sub.subscription_type }, error: null };
          }
          sub.status = 'active';
          sub.expires_at = params.p_expires_at;
          return { data: { success: true, already_active: false, subscription_type: sub.subscription_type }, error: null };
        }
        return { data: null, error: new Error('Unknown RPC') };
      }),
      from: (table: string) => {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockImplementation((updateData: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: any) => ({
              eq: vi.fn().mockImplementation((col2: string, val2: any) => ({
                neq: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            queryBuilder._filters = queryBuilder._filters || {};
            queryBuilder._filters[col] = val;
            return queryBuilder;
          }),
          maybeSingle: vi.fn().mockImplementation(async () => {
            const filters = queryBuilder._filters || {};
            if (table === 'chat_subscriptions') {
              const found = mockSubscriptions.find(s => {
                if (filters.payment_reference && s.payment_reference !== filters.payment_reference) return false;
                if (filters.user_id && s.user_id !== filters.user_id) return false;
                return true;
              });
              return { data: found || null, error: null };
            }
            return { data: null, error: null };
          }),
        };
        return queryBuilder;
      },
    }),
  };
});

describe('Finding H-03 & H-04: Verify Payment Edge Function', () => {
  let handler: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    mockSubscriptions = [];
    mockRpcActivateResult = null;
    mockRpcError = null;

    // Mock Paystack verification endpoint
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('paystack.co/transaction/verify')) {
        return new Response(
          JSON.stringify({
            status: true,
            data: { status: 'success', reference: 'ref-123', amount: 1000 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    handler = await loadEdgeFunction('verify-payment', '../../supabase/functions/verify-payment/index.ts');
  });

  it('rejects unauthenticated request (401)', async () => {
    mockUser = null;
    const req = new Request('http://localhost/functions/v1/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: 'ref-123' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('H-03 Caller Ownership Enforcement: User B cannot verify or hijack User A\'s subscription (403)', async () => {
    // Subscription belongs to User A
    mockSubscriptions = [
      { id: 'sub-A', user_id: 'user-A', subscription_type: 'unlimited', status: 'pending', payment_reference: 'ref-123' },
    ];
    // User B attempts to verify payment with reference ref-123
    mockUser = { id: 'user-B', email: 'attacker@example.com' };

    const req = new Request('http://localhost/functions/v1/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-user-b-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ reference: 'ref-123' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('H-04 Idempotency Check: Returns already active status on duplicate verification', async () => {
    mockUser = { id: 'user-A', email: 'userA@example.com' };
    mockSubscriptions = [
      { id: 'sub-A', user_id: 'user-A', subscription_type: 'unlimited', status: 'active', payment_reference: 'ref-already-active' },
    ];

    const req = new Request('http://localhost/functions/v1/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-user-a-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ reference: 'ref-already-active' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.already_active).toBe(true);
  });

  it('H-04 Atomic Activation: Successfully verifies and activates pending subscription for owner', async () => {
    mockUser = { id: 'user-legit', email: 'legit@example.com' };
    mockSubscriptions = [
      { id: 'sub-legit', user_id: 'user-legit', subscription_type: 'unlimited', status: 'pending', payment_reference: 'ref-legit' },
    ];

    const req = new Request('http://localhost/functions/v1/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-legit-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ reference: 'ref-legit' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.subscription_type).toBe('unlimited');
  });

  it('H-04 Fail-Closed: Rejects verification with 500 when RPC activate_subscription_atomic errors out', async () => {
    mockUser = { id: 'user-legit', email: 'legit@example.com' };
    mockSubscriptions = [
      { id: 'sub-legit', user_id: 'user-legit', subscription_type: 'unlimited', status: 'pending', payment_reference: 'ref-fail-rpc' },
    ];
    mockRpcError = new Error('Database connection reset / lock timeout');

    const req = new Request('http://localhost/functions/v1/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-legit-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ reference: 'ref-fail-rpc' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('unable to activate subscription atomically');
  });
});
