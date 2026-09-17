import { handleApplication } from "./_lib/application";

// Vercel's explicit function entry point. vercel.json rewrites
// /api/<path> -> /api/router?path=<path>. Reconstructing the original URL here
// keeps the internal router independent of deployment rewrite semantics.
export default async function handler(req: Request): Promise<Response> {
  // The shared router reads Vercel's `path` rewrite parameter directly, which
  // preserves raw webhook body bytes and avoids cloning streamed POST bodies.
  return handleApplication(req);
}