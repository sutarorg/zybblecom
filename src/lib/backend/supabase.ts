import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function authSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const recoveryKey = process.env.AUTH_STATE_SECRET;
  const origin = process.env.APP_ORIGIN;
  if (
    !url ||
    !key ||
    !secret ||
    !origin ||
    !recoveryKey ||
    recoveryKey.length < 32
  )
    return null;
  try {
    const parsed = new URL(origin);
    const supabase = new URL(url);
    if (
      parsed.origin !== origin ||
      !permittedProtocol(parsed) ||
      !permittedProtocol(supabase)
    )
      return null;
    return {
      url,
      key,
      secret,
      origin,
      recoveryKey,
      secure: parsed.protocol === "https:",
    };
  } catch {
    return null;
  }
}
function permittedProtocol(url: URL) {
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname))
  );
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
