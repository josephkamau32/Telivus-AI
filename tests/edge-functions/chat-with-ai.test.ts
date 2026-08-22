/**
 * Edge Functions Adversarial Test Suite — Finding C-02 & H-04: Chat With AI
 * Tests:
 * 1. Unauthenticated request rejection (401)
 * 2. Session Hijacking / IDOR Prevention: User B cannot access User A's session (404 / Chat session not found or unauthorized)
 * 3. Legitimate user accessing own session (200)
 * 4. Atomic Pay-Per-Chat balance deduction and exhaustion (H-04)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadEdgeFunction } from './test-helper';

// Shared mock database state
let mockUser: { id: string; email: string } | null = null;
let mockSessions: Array<{ id: string; user_id: string }> = [];
let mockSubscriptions: Array<{
  id: string;
  user_id: string;
  subscription_type: string;
  status: string;
  chats_remaining: number;
  expires_at?: string | null;
}> = [];
let mockMessages: Array<{ session_id: string; user_id: string; role: string; content: string }> = [];
let mockRpcConsumeResult: { success: boolean; chats_remaining?: number } | null = null;

// Mock @supabase/supabase-js
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
        if (funcName === 'consume_chat_atomic') {
          if (mockRpcConsumeResult) {
            return { data: mockRpcConsumeResult, error: null };
          }
          const sub = mockSubscriptions.find(s => s.id === params.p_subscription_id && s.user_id === params.p_user_id);
          if (sub && sub.chats_remaining > 0) {
            sub.chats_remaining -= 1;
            return { data: { success: true, chats_remaining: sub.chats_remaining }, error: null };
          }
          return { data: { success: false, error: 'NO_CHATS_REMAINING' }, error: null };
        }
        return { data: null, error: new Error('Unknown RPC') };
      }),
      from: (table: string) => {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation(async (data: any) => {
            if (table === 'chat_messages') {
              mockMessages.push(data);
            }
            return { data, error: null };
          }),
          update: vi.fn().mockImplementation((updateData: any) => ({
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            select: vi.fn().mockResolvedValue({ data: [updateData], error: null }),
          })),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            queryBuilder._filters = queryBuilder._filters || {};
            queryBuilder._filters[col] = val;
            return queryBuilder;
          }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(async () => {
            const filters = queryBuilder._filters || {};
            if (table === 'chat_sessions') {
              const found = mockSessions.find(s => {
                if (filters.id && s.id !== filters.id) return false;
                if (filters.user_id && s.user_id !== filters.user_id) return false;
                return true;
              });
              return { data: found || null, error: null };
            }
            if (table === 'chat_subscriptions') {
              const found = mockSubscriptions.find(s => {
                if (filters.user_id && s.user_id !== filters.user_id) return false;
                if (filters.status && s.status !== filters.status) return false;
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

describe('Finding C-02 & H-04: Chat With AI Edge Function', () => {
  let handler: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockMessages = [];
    mockRpcConsumeResult = null;

    // Mock global fetch for OpenAI call
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('openai.com')) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'This is a test AI medical response.' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    handler = await loadEdgeFunction('chat-with-ai', '../../supabase/functions/chat-with-ai/index.ts');
  });

  it('rejects unauthenticated request missing Authorization header (401)', async () => {
    mockUser = null;
    const req = new Request('http://localhost/functions/v1/chat-with-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello', sessionId: 'session-123' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized|authentication|missing authorization/i);
  });

  it('C-02 IDOR Defense: Rejects user attempting to access another user\'s session (404)', async () => {
    // User A owns session-A
    mockSessions = [{ id: 'session-A', user_id: 'user-A' }];
    // Attacker User B calls with session-A
    mockUser = { id: 'user-B', email: 'attacker@example.com' };

    const req = new Request('http://localhost/functions/v1/chat-with-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-user-b-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ message: 'Give me user A medical history', sessionId: 'session-A' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Chat session not found');
    expect(mockMessages.length).toBe(0); // No message written
  });

  it('allows user to send message in their own session', async () => {
    mockUser = { id: 'user-A', email: 'victim@example.com' };
    mockSessions = [{ id: 'session-A', user_id: 'user-A' }];
    mockSubscriptions = [
      { id: 'sub-1', user_id: 'user-A', subscription_type: 'unlimited', status: 'active', chats_remaining: 999 },
    ];

    const req = new Request('http://localhost/functions/v1/chat-with-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-user-a-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ message: 'I have a mild headache', sessionId: 'session-A' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('This is a test AI medical response');
  });

  it('H-04: Atomically decrements pay-per-chat balance and blocks when exhausted', async () => {
    mockUser = { id: 'user-pay', email: 'pay@example.com' };
    mockSessions = [{ id: 'session-pay', user_id: 'user-pay' }];
    // 0 chats remaining
    mockSubscriptions = [
      { id: 'sub-pay', user_id: 'user-pay', subscription_type: 'pay_per_chat', status: 'active', chats_remaining: 0 },
    ];
    mockRpcConsumeResult = { success: false };

    const req = new Request('http://localhost/functions/v1/chat-with-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-pay-user-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ message: 'Can I chat?', sessionId: 'session-pay' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.needsPayment).toBe(true);
    expect(body.message).toContain('Payment required');
  });
});
