import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, KeyRound, Mail, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import Logo from "../../components/Logo";
import {
  login,
  requestMagicLink,
  requestPasswordReset,
  resetPassword,
  signup,
} from "../lib/auth";
import { Button, Field, Input } from "../ui/kit";

function AuthFrame({
  children,
  heading,
  sub,
}: {
  children: React.ReactNode;
  heading: string;
  sub: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/4 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.07),rgba(56,189,248,0.04)_45%,transparent_70%)] blur-2xl"
      />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[400px]"
      >
        <div className="flex justify-center">
          <a href="#/">
            <Logo />
          </a>
        </div>
        <div className="mt-8 rounded-[24px] border border-black/[0.06] bg-white p-7 shadow-[0_1px_2px_rgba(20,18,15,0.04),0_32px_80px_-32px_rgba(20,18,15,0.18)] sm:p-8">
          <h1 className="text-center font-display text-[22px] font-semibold tracking-[-0.02em] text-neutral-950">
            {heading}
          </h1>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-neutral-500">{sub}</p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-[11.5px] text-neutral-400">
          <a href="#/" className="inline-flex items-center gap-1.5 transition-colors hover:text-neutral-700">
            <ArrowLeft className="h-3 w-3" />
            Back to zybble.com
          </a>
        </p>
      </motion.div>
    </div>
  );
}

function ErrorNote({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-200/70 bg-red-50/70 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">
      {msg}
    </div>
  );
}

function InfoNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-sky-200/70 bg-sky-50/70 px-3.5 py-3 text-[12.5px] leading-relaxed text-sky-800">
      <p className="flex items-center gap-1.5 font-semibold">
        <Sparkles className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function AuthPage({ route }: { route: string }) {
  const isSignup = route.startsWith("/signup");
  const isForgot = route.startsWith("/forgot");
  const isReset = route.startsWith("/reset");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sentLink, setSentLink] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = (fn: () => Promise<unknown> | unknown) => async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.startsWith("Account created")) setNotice(msg);
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const requestLink = run(async () => {
    const link = isForgot
      ? await requestPasswordReset(email)
      : await requestMagicLink(email);
    if (link) setSentLink(link);
    else setEmailed(true);
  });

  if (isForgot) {
    return (
      <AuthFrame heading="Reset your password" sub="We'll create a secure reset link for your account.">
        <form onSubmit={requestLink} className="space-y-4">
          <ErrorNote msg={error} />
          {emailed && !sentLink && (
            <InfoNote title="Check your inbox">
              We emailed you a secure reset link. It expires in 30 minutes.
            </InfoNote>
          )}
          {sentLink && (
            <InfoNote title="Reset link created">
              In production this arrives by email. In this environment,{" "}
              <a href={sentLink} className="font-semibold underline underline-offset-2">
                open your reset link
              </a>
              .
            </InfoNote>
          )}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Send reset link
            <KeyRound className="h-3.5 w-3.5" />
          </Button>
          <p className="text-center text-[12.5px] text-neutral-500">
            Remembered it?{" "}
            <a href="#/login" className="font-semibold text-neutral-950 hover:underline underline-offset-4">
              Sign in
            </a>
          </p>
        </form>
      </AuthFrame>
    );
  }

  if (isReset) {
    return (
      <AuthFrame heading="Choose a new password" sub="At least 8 characters.">
        <form
          onSubmit={run(async () => {
            // Supabase authenticates the recovery link before this renders.
            await resetPassword(password);
            window.location.hash = "#/app/dashboard";
          })}
          className="space-y-4"
        >
          <ErrorNote msg={error} />
          <Field label="New password">
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Reset password
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      heading={isSignup ? "Start finding leads" : "Sign in to Zybble"}
      sub={isSignup ? "Free plan included — 100 leads every month." : "Welcome back."}
    >
      <form
        onSubmit={run(async () => {
          if (isSignup) await signup({ email, password, name });
          else await login({ email, password });
          window.location.hash = "#/app/dashboard";
        })}
        className="space-y-4"
      >
        <ErrorNote msg={error} />
        {notice && <InfoNote title="Almost there">{notice}</InfoNote>}
        {emailed && !sentLink && (
          <InfoNote title="Check your inbox">
            We emailed you a secure sign-in link. It expires in 30 minutes.
          </InfoNote>
        )}
        {sentLink && (
          <InfoNote title="Magic link created">
            In production this is emailed to you. Here,{" "}
            <a href={sentLink} className="font-semibold underline underline-offset-2">
              use your magic link
            </a>
            .
          </InfoNote>
        )}
        {isSignup && (
          <Field label="Full name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
          </Field>
        )}
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Password" hint={isSignup ? "At least 8 characters." : undefined}>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Button type="submit" loading={busy} className="w-full">
          {isSignup ? "Create free account" : "Sign in"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>

        {!isSignup && (
          <div className="flex items-center justify-between text-[12.5px]">
            <button
              type="button"
              onClick={requestLink}
              className="inline-flex items-center gap-1 font-medium text-neutral-600 transition-colors hover:text-neutral-950"
            >
              <Mail className="h-3.5 w-3.5" />
              Email me a magic link
            </button>
            <a href="#/forgot" className="font-medium text-neutral-600 transition-colors hover:text-neutral-950">
              Forgot password?
            </a>
          </div>
        )}

        <p className="border-t border-black/[0.05] pt-4 text-center text-[12.5px] text-neutral-500">
          {isSignup ? "Already have an account? " : "New to Zybble? "}
          <a
            href={isSignup ? "#/login" : "#/signup"}
            className="font-semibold text-neutral-950 hover:underline underline-offset-4"
          >
            {isSignup ? "Sign in" : "Start for free"}
          </a>
        </p>
      </form>
    </AuthFrame>
  );
}
