/**
 * Test Helper for Supabase Edge Functions
 * Shims Deno global environment and captures Edge Function request handlers.
 */

const envMap: Record<string, string> = {
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  OPENAI_API_KEY: 'test-openai-key',
  PAYSTACK_SECRET_KEY: 'test-paystack-key',
};

let currentHandler: ((req: Request) => Promise<Response>) | null = null;
const functionHandlers = new Map<string, (req: Request) => Promise<Response>>();

// Initialize global Deno shim
(globalThis as any).Deno = {
  env: {
    get: (key: string) => envMap[key] ?? process.env[key] ?? '',
  },
  serve: (fn: (req: Request) => Promise<Response>) => {
    currentHandler = fn;
    return {} as any;
  },
};

export async function loadEdgeFunction(name: string, importPath: string): Promise<(req: Request) => Promise<Response>> {
  if (functionHandlers.has(name)) {
    return functionHandlers.get(name)!;
  }

  currentHandler = null;
  await import(/* @vite-ignore */ importPath);

  if (!currentHandler) {
    throw new Error(`Deno.serve handler was not registered when loading ${name}`);
  }

  functionHandlers.set(name, currentHandler);
  return currentHandler;
}

export function setTestEnv(key: string, value: string) {
  envMap[key] = value;
}
