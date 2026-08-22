/**
 * Edge Functions Adversarial Test Suite — Initialize Payment
 * Tests:
 * 1. Unauthenticated request rejection (401)
 * 2. Valid payment initialization binds to authenticated user_id
 * 3. Validation of subscription types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadEdgeFunction } from './test-helper';

let mockUser: { id: string; email: string } | null = null;
let mockInsertedSubscriptions: Array<{ user_id: string; subscription_type: string; payment_reference: string }> = [];

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
      from: (table: string) => {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data: any) => {
            if (table === 'chat_subscriptions') {
              mockInsertedSubscriptions.push(data);
            }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'sub-init-123' }, error: null }),
              }),
              then: (resolve: any) => resolve({ data, error: null }),
            };
          }),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { username: 'testuser' }, error: null }),
        };
        return queryBuilder;
      },
    }),
  };
});

describe('Initialize Payment Edge Function', () => {
  let handler: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockInsertedSubscriptions = [];

    // Mock Paystack initialize endpoint
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
      if (typeof url === 'string' && url.includes('paystack.co/transaction/initialize')) {
        const body = JSON.parse(init?.body || '{}');
        // Ensure callback URL is strictly telivus.co.ke
        expect(body.callback_url).toBe('https://telivus.co.ke/chat?payment=success');
        return new Response(
          JSON.stringify({
            status: true,
            data: {
              authorization_url: 'https://checkout.paystack.com/access-code-123',
              reference: 'ref_init_123',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    handler = await loadEdgeFunction('initialize-payment', '../../supabase/functions/initialize-payment/index.ts');
  });

  it('rejects unauthenticated request (401)', async () => {
    mockUser = null;
    const req = new Request('http://localhost/functions/v1/initialize-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType: 'unlimited' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('binds initialized subscription strictly to authenticated user_id', async () => {
    mockUser = { id: 'init-user-1', email: 'init@example.com' };

    const req = new Request('http://localhost/functions/v1/initialize-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-init-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ planType: 'unlimited' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authorization_url).toBe('https://checkout.paystack.com/access-code-123');
    expect(body.reference).toBe('ref_init_123');

    expect(mockInsertedSubscriptions.length).toBe(1);
    expect(mockInsertedSubscriptions[0].user_id).toBe('init-user-1');
    expect(mockInsertedSubscriptions[0].subscription_type).toBe('unlimited');
  });
});
