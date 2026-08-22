/**
 * Edge Functions Adversarial Test Suite — Finding C-03 & C-04: Medical Report Generator
 * Tests:
 * 1. Unauthenticated request rejection (401) (C-03)
 * 2. Cross-user caching deletion test: Verifies that report_cache is not accessed or shared (C-04)
 * 3. Validation failure on malformed input (400)
 * 4. Legitimate generation stores report bound strictly to caller user_id
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadEdgeFunction } from './test-helper';

let mockUser: { id: string; email: string } | null = null;
let mockInsertedReports: Array<{ user_id: string; chief_complaint: string }> = [];
let tablesQueried: string[] = [];

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
        tablesQueried.push(table);
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          insert: vi.fn().mockImplementation((data: any) => {
            if (table === 'health_reports') {
              mockInsertedReports.push(data);
            }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'report-uuid-123' }, error: null }),
              }),
              then: (resolve: any) => resolve({ data, error: null }),
            };
          }),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: { id: 'report-uuid-123' }, error: null }),
        };
        return queryBuilder;
      },
    }),
  };
});

describe('Finding C-03 & C-04: Generate Medical Report Edge Function', () => {
  let handler: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockInsertedReports = [];
    tablesQueried = [];

    // Mock OpenAI API
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('openai.com')) {
        const mockReport = {
          chief_complaint: 'Severe migraine headache',
          assessment: 'Tension headache vs migraine without aura',
          history_present_illness: 'Patient reports persistent headache for 2 days',
          diagnostic_plan: ['Rest in dark room', 'Hydrate', 'Follow up if symptoms worsen'],
          otc_recommendations: [
            { medicine: 'Acetaminophen', dosage: '500mg', purpose: 'Pain relief', precautions: 'Do not exceed 3000mg/day' },
          ],
        };
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(mockReport) } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    handler = await loadEdgeFunction('generate-medical-report', '../../supabase/functions/generate-medical-report/index.ts');
  });

  it('C-03: Rejects unauthenticated requests missing bearer token (401)', async () => {
    mockUser = null;
    const req = new Request('http://localhost/functions/v1/generate-medical-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feelings: 'Headache and fever', name: 'Anonymous', age: 30 }),
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized|authentication|missing authorization/i);
  });

  it('C-04: Cross-User Cache Elimination — Verifies report_cache table is never queried', async () => {
    mockUser = { id: 'patient-A-uuid', email: 'patientA@example.com' };

    const req = new Request('http://localhost/functions/v1/generate-medical-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-jwt-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({
        feelings: 'Headache with sensitive light response',
        symptoms: ['headache', 'light sensitivity'],
        name: 'Patient A',
        age: 28,
        gender: 'female',
      }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    // Assert that report_cache was NEVER touched (preventing cross-user cache leakage)
    expect(tablesQueried).not.toContain('report_cache');
    // Assert that the generated report was strictly bound to patient-A-uuid
    expect(mockInsertedReports.length).toBe(1);
    expect(mockInsertedReports[0].user_id).toBe('patient-A-uuid');
  });

  it('rejects invalid payload with missing required fields (400)', async () => {
    mockUser = { id: 'patient-test', email: 'test@example.com' };

    const req = new Request('http://localhost/functions/v1/generate-medical-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-jwt-token',
        'Origin': 'https://telivus.co.ke',
      },
      body: JSON.stringify({ age: 25 }), // Missing 'feelings'
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Validation failed');
  });
});
