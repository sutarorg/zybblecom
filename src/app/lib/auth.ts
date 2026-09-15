import { db, now, uid } from "./db";
import { isRemote, remoteUserFromToken, accessToken, supabase } from "./remote";
import type { AuthToken, AuthUser, PlanId, Session } from "./types";

// ————————————————————————————————————————————————————————————
// Authentication.
//   Production : Supabase Auth (email/password, magic link,
//                password recovery; sessions via JWT).
//   Local dev  : salted SHA-256 credential vault with the same
//                interface, so the UI never branches.
// ————————————————————————————————————————————————————————————

const SESSION_KEY = "zybble.v1.session";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function currentSession(): Session | null {
  if (isRemote()) {
    const u = remoteUserFromToken();
    const token = accessToken();
    if (!u || !token) return null;
    return { token, user_id: u.id, created_at: now() };
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    const exists = db.one<AuthUser>("auth_users", (u) => u.id === s.user_id);
    return exists ? s : null;
  } catch {
    return null;
  }
}

export function currentUserId(): string | null {
  return currentSession()?.user_id ?? null;
}

function openSession(userId: string): Session {
  const session: Session = { token: uid(), user_id: userId, created_at: now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  db.insert("sessions", { id: uid(), ...session });
  return session;
}

export function logout() {
  if (isRemote()) {
    void supabase().auth.signOut();
    return;
  }
  localStorage.removeItem(SESSION_KEY);
}

const appUrl = () =>
  `${window.location.origin}${window.location.pathname}`;

// ———————————————— Sign up ————————————————

export async function signup(input: {
  email: string;
  password: string;
  name: string;
}): Promise<Session> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (input.password.length < 8)
    throw new Error("Password must be at least 8 characters.");
  if (!input.name.trim()) throw new Error("Tell us your name.");

  if (isRemote()) {
    const { data, error } = await supabase().auth.signUp({
      email,
      password: input.password,
      options: {
        data: { name: input.name.trim() },
        emailRedirectTo: `${appUrl()}#/login`,
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session || !data.user)
      throw new Error(
        "Account created — check your inbox to confirm your email, then sign in."
      );
    return { token: data.session.access_token, user_id: data.user.id, created_at: now() };
  }

  if (db.one<AuthUser>("auth_users", (u) => u.email === email))
    throw new Error("An account with this email already exists.");

  const userId = uid();
  const salt = uid();
  const user: AuthUser = {
    id: userId,
    email,
    pass_hash: await sha256(salt + input.password),
    salt,
    created_at: now(),
  };
  db.insert("auth_users", user);

  // Post-signup provisioning: profile + free subscription + usage bucket.
  db.insert("profiles", {
    id: userId,
    email,
    name: input.name.trim(),
    company: "",
    from_name: input.name.trim(),
    created_at: now(),
  });
  db.insert("subscriptions", {
    id: uid(),
    user_id: userId,
    plan: "free" as PlanId,
    status: "active",
    current_period_end: null,
    razorpay_subscription_id: null,
    created_at: now(),
    updated_at: now(),
  });
  db.insert("usage", {
    id: uid(),
    user_id: userId,
    month: new Date().toISOString().slice(0, 7),
    leads_used: 0,
    updated_at: now(),
  });

  return openSession(userId);
}

// ———————————————— Sign in ————————————————

export async function login(input: {
  email: string;
  password: string;
}): Promise<Session> {
  const email = input.email.trim().toLowerCase();

  if (isRemote()) {
    const { data, error } = await supabase().auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (error) throw new Error(error.message);
    return { token: data.session.access_token, user_id: data.user.id, created_at: now() };
  }

  const user = db.one<AuthUser>("auth_users", (u) => u.email === email);
  if (!user) throw new Error("No account found for this email.");
  const hash = await sha256(user.salt + input.password);
  if (hash !== user.pass_hash) throw new Error("Incorrect password.");
  return openSession(user.id);
}

// ———————————————— One-time tokens (local mode) ————————————————

function issueToken(userId: string, type: AuthToken["type"]): AuthToken {
  const token: AuthToken = {
    id: uid(),
    token: uid() + uid().replace(/-/g, ""),
    user_id: userId,
    type,
    expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    used: false,
  };
  db.insert("tokens", token);
  return token;
}

/** Magic link. Remote: emailed by Supabase (returns null). Local: returns the link for display. */
export async function requestMagicLink(emailRaw: string): Promise<string | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (isRemote()) {
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl()}#/login` },
    });
    if (error) throw new Error(error.message);
    return null;
  }
  const user = db.one<AuthUser>("auth_users", (u) => u.email === email);
  if (!user) throw new Error("No account found for this email.");
  const t = issueToken(user.id, "magic");
  return `#/login?magic=${t.token}`;
}

export function consumeMagicLink(token: string): Session {
  if (isRemote()) {
    const u = remoteUserFromToken();
    if (!u) throw new Error("This sign-in link is invalid or has expired.");
    return { token: accessToken()!, user_id: u.id, created_at: now() };
  }
  const t = db.one<AuthToken>(
    "tokens",
    (r) => r.token === token && r.type === "magic"
  );
  if (!t || t.used || new Date(t.expires_at).getTime() < Date.now())
    throw new Error("This sign-in link is invalid or has expired.");
  db.update<AuthToken>("tokens", t.id, { used: true });
  return openSession(t.user_id);
}

export async function requestPasswordReset(emailRaw: string): Promise<string | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (isRemote()) {
    const { error } = await supabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl()}#/reset`,
    });
    if (error) throw new Error(error.message);
    return null;
  }
  const user = db.one<AuthUser>("auth_users", (u) => u.email === email);
  if (!user) throw new Error("No account found for this email.");
  const t = issueToken(user.id, "reset");
  return `#/reset?token=${t.token}`;
}

export async function resetPassword(
  token: string,
  password: string
): Promise<Session> {
  if (password.length < 8)
    throw new Error("Password must be at least 8 characters.");
  if (isRemote()) {
    const { error } = await supabase().auth.updateUser({ password });
    if (error) throw new Error(error.message);
    const u = remoteUserFromToken();
    if (!u) throw new Error("This reset link is invalid or has expired.");
    return { token: accessToken()!, user_id: u.id, created_at: now() };
  }
  const t = db.one<AuthToken>(
    "tokens",
    (r) => r.token === token && r.type === "reset"
  );
  if (!t || t.used || new Date(t.expires_at).getTime() < Date.now())
    throw new Error("This reset link is invalid or has expired.");
  const salt = uid();
  db.update<AuthUser>("auth_users", t.user_id, {
    pass_hash: await sha256(salt + password),
    salt,
  });
  db.update<AuthToken>("tokens", t.id, { used: true });
  return openSession(t.user_id);
}
