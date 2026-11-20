import { NextResponse } from "next/server";
import { authClient, authSettings } from "@/lib/backend/supabase";
import {
  clearRecovery,
  setRecovery,
  verifySession,
} from "@/lib/backend/session";
import { ingressActor, limitActor, privateHeaders } from "@/lib/backend/http";

export async function GET(request: Request) {
  const config = authSettings();
  if (!config)
    return new Response(null, { status: 503, headers: privateHeaders });
  const go = (path: string) =>
    NextResponse.redirect(new URL(path, config.origin), {
      status: 303,
      headers: privateHeaders,
    });
  const q = new URL(request.url).searchParams;
  const type = q.get("type");
  const token = q.get("token_hash");
  const code = q.get("code");
  if (
    (!token && !code) ||
    (token && code) ||
    (token &&
      (!["email", "signup", "recovery"].includes(type ?? "") ||
        !/^[A-Za-z0-9_-]{8,512}$/.test(token))) ||
    (code && (!/^[A-Za-z0-9_-]{8,512}$/.test(code) || type === "recovery"))
  )
    return go("/auth/callback");
  try {
    await limitActor("auth_callback_ip", ingressActor(request), 50, 600);
    const auth = (await authClient(true))!;
    const exchange = token
      ? await auth.auth.verifyOtp({
          token_hash: token,
          type: type as "email" | "signup" | "recovery",
        })
      : await auth.auth.exchangeCodeForSession(code!);
    if (exchange.error || !exchange.data.session) return go("/auth/callback");
    try {
      const { profile } = await verifySession(true);
      await clearRecovery();
      if (token && type === "recovery") {
        await setRecovery(auth);
        return go("/reset-password");
      }
      return go(profile.onboarding_completed ? "/dashboard" : "/onboarding");
    } catch {
      await auth.auth.signOut({ scope: "local" });
      return go("/auth/callback");
    }
  } catch {
    return go("/auth/callback");
  }
}
