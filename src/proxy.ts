import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authSettings } from "@/lib/backend/supabase";

export async function proxy(request: NextRequest) {
  const settings = authSettings();
  if (!settings) return NextResponse.next();
  if (request.nextUrl.pathname === "/auth/callback") {
    if (
      !request.nextUrl.searchParams.has("token_hash") &&
      !request.nextUrl.searchParams.has("code")
    )
      return NextResponse.next();
    const internal = request.nextUrl.clone();
    internal.pathname = "/api/auth/callback";
    return NextResponse.rewrite(internal, {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(settings.url, settings.key, {
    cookieOptions: {
      httpOnly: true,
      secure: settings.secure,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {}))
          response.headers.set(name, value);
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  // Refresh only. Permissions are checked using the authoritative user and database rows.
  await supabase.auth.getClaims();
  return response;
}
export const config = {
  matcher: [
    "/auth/callback",
    // Public pages with a session-aware header also need cookie refresh.
    "/",
    "/blog/:path*",
    "/contact",
    "/examples",
    "/faq",
    "/features",
    "/help",
    "/how-it-works",
    "/pricing/:path*",
    "/privacy",
    "/refund-policy",
    "/terms",
    "/resources",
    "/use-cases",
    "/login",
    "/admin/:path*",
    "/dashboard/:path*",
    "/projects/:path*",
    "/clips/:path*",
    "/credits/:path*",
    "/settings/:path*",
    "/support",
    "/onboarding",
    "/verify-email",
    "/reset-password",
    "/checkout/:path*",
  ],
};
