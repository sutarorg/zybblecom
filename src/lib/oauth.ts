export const STATE_COOKIE = "zybble_oauth_state";

export function appOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}
