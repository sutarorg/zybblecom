import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { resolveAuthSettings } from "./auth-config";

export function authSettings() {
  return resolveAuthSettings(process.env);
}
export async function authClient(write = false) {
  const settings = authSettings();
  if (!settings) return null;
  const store = await cookies();
  return createServerClient(settings.url, settings.key, {
    cookieOptions: {
      httpOnly: true,
      secure: settings.secure,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        if (write)
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
      },
    },
  });
}
export function privilegedDB() {
  const settings = authSettings();
  if (!settings) throw new Error("Backend not configured");
  return createClient(settings.url, settings.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
