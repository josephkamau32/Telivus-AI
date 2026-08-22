/**
 * Edge Functions Adversarial Test Suite — Finding H-06: Strict CORS
 * Verifies that Edge Functions reject unauthorized origins and only allow configured domains.
 */

import { describe, it, expect } from 'vitest';
import { getCorsHeaders, handleCorsPreflight } from '../../supabase/functions/_shared/cors';

describe('Edge Function Strict CORS (H-06)', () => {
  it('allows production domain https://telivus.co.ke', () => {
    const headers = getCorsHeaders('https://telivus.co.ke');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://telivus.co.ke');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
  });

  it('allows localhost dev server origins', () => {
    const localhost5173 = getCorsHeaders('http://localhost:5173');
    expect(localhost5173['Access-Control-Allow-Origin']).toBe('http://localhost:5173');

    const localhost3000 = getCorsHeaders('http://localhost:3000');
    expect(localhost3000['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('rejects attacker/arbitrary origin by falling back to production domain (browser cross-origin block)', () => {
    const attackerOrigin = 'https://malicious-attacker.com';
    const headers = getCorsHeaders(attackerOrigin);
    // Origin does not match attacker's origin, causing browser to reject cross-origin response
    expect(headers['Access-Control-Allow-Origin']).toBe('https://telivus.co.ke');
    expect(headers['Access-Control-Allow-Origin']).not.toBe(attackerOrigin);
  });

  it('rejects wildcard origin', () => {
    const headers = getCorsHeaders(null);
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
  });

  it('handles OPTIONS preflight for allowed origin', () => {
    const req = new Request('http://localhost/functions/v1/test', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    });

    const res = handleCorsPreflight(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(204);
    expect(res!.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('handles OPTIONS preflight for unauthorized origin without reflecting attacker origin', () => {
    const req = new Request('http://localhost/functions/v1/test', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.org' },
    });

    const res = handleCorsPreflight(req);
    expect(res).not.toBeNull();
    expect(res!.headers.get('Access-Control-Allow-Origin')).toBe('https://telivus.co.ke');
    expect(res!.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.example.org');
  });
});
