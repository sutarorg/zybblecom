import { supabase } from "./remote";

// ————————————————————————————————————————————————————————————
// Authentication — Supabase Auth only.
// Email/password, magic link and password recovery. Sessions are
// JWTs managed and refreshed by the Supabase client.
// ————————————————————————————————————————————————————————————

export interface Session {
  token: string;
  user_id: string;
  created_at: string;
}

const appUrl = () => `${window.location.origin}${window.location.pathname}`;

export function logout() {
  void supabase().auth.signOut();
}

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
  return {
    token: data.session.access_token,
    user_id: data.user.id,
    created_at: new Date().toISOString(),
  };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<Session> {
  const { data, error } = await supabase().auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) throw new Error(error.message);
  return {
    token: data.session.access_token,
    user_id: data.user.id,
    created_at: new Date().toISOString(),
  };
}

/** Magic link. Supabase emails it; nothing is returned to the browser. */
export async function requestMagicLink(emailRaw: string): Promise<null> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl()}#/login` },
  });
  if (error) throw new Error(error.message);
  return null;
}

export async function requestPasswordReset(emailRaw: string): Promise<null> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  const { error } = await supabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}#/reset`,
  });
  if (error) throw new Error(error.message);
  return null;
}

export async function resetPassword(password: string): Promise<void> {
  if (password.length < 8)
    throw new Error("Password must be at least 8 characters.");
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
