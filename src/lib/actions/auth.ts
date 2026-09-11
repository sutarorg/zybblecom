"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  destroySession,
  hashPassword,
  homeFor,
  isAdminEmail,
  verifyPassword,
} from "@/lib/auth";

export type AuthState = { error?: string };

function safeNext(next: string | undefined, fallback: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

// Authentication must never surface a raw 500. When the database is
// misconfigured or the schema was never pushed, the user gets a readable
// message instead of a generic crash page.
function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === "42P01" || code === "42P05") {
    return "This deployment's database hasn't been set up yet. Ask the site owner to run the schema setup (drizzle-kit push).";
  }
  return "We couldn't reach the server right now. Please try again in a moment.";
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["creator", "buyer"]),
  next: z.string().optional(),
});

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") === "creator" ? "creator" : "buyer",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const { name, email, password, role, next } = parsed.data;

  let user;
  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) return { error: "An account with this email already exists. Try logging in." };

    const finalRole = isAdminEmail(email) ? "admin" : role;
    const [created] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password), role: finalRole })
      .returning();
    await createSession(created.id);
    user = created;
  } catch (err) {
    console.error("[auth] signup failed:", err);
    return { error: authErrorMessage(err) };
  }
  redirect(safeNext(next, homeFor(user)));
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }
  const { email, password, next } = parsed.data;

  let user;
  try {
    const [found] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      return { error: "Incorrect email or password." };
    }
    await createSession(found.id);
    user = found;
  } catch (err) {
    console.error("[auth] login failed:", err);
    return { error: authErrorMessage(err) };
  }
  redirect(safeNext(next, homeFor(user)));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
