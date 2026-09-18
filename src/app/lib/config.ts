const viteEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

const SUPABASE_URL = viteEnv?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = viteEnv?.VITE_SUPABASE_ANON_KEY;

/** Public configuration check kept separate so marketing pages do not load the app client. */
export function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
