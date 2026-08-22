// Serve shim for legacy Deno serve import
export function serve(handler: (req: Request) => Promise<Response>) {
  if ((globalThis as any).Deno?.serve) {
    return (globalThis as any).Deno.serve(handler);
  }
  return handler;
}
