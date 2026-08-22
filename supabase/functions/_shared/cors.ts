// Strict CORS allowlist for Telivus AI Supabase Edge Functions
// Allowed origins: Production custom domain + local dev servers

const ALLOWED_ORIGINS = new Set([
  'https://telivus.co.ke',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8000',
  'http://localhost:8080',
]);

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const isAllowed = requestOrigin ? ALLOWED_ORIGINS.has(requestOrigin) : false;
  const origin = isAllowed ? requestOrigin! : 'https://telivus.co.ke';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}
