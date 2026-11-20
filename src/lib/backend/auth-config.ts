/** Resolve server configuration without using request hosts or exposing secrets to forms. */
export function resolveAuthSettings(
  env: Readonly<Record<string, string | undefined>>,
) {
  const url = env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const secret = env.SUPABASE_SECRET_KEY?.trim();
  const recoveryKey = env.AUTH_STATE_SECRET;
  const origin = env.APP_ORIGIN?.trim().replace(/\/$/, "");
  if (
    !url ||
    !key ||
    key.startsWith("sb_secret_") ||
    !secret ||
    !origin ||
    !recoveryKey ||
    recoveryKey.trim().length < 32
  )
    return null;
  try {
    const parsed = new URL(origin);
    const supabase = new URL(url);
    if (
      parsed.origin !== origin ||
      !permittedProtocol(parsed) ||
      !permittedProtocol(supabase) ||
      supabase.origin !== url.replace(/\/$/, "")
    )
      return null;
    return {
      url: supabase.origin,
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
