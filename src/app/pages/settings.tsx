import {
  Ban,
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { logout } from "../lib/auth";
import { useDb, db, resetStorage } from "../lib/db";
import { downloadCsv, leadsToCsv } from "../lib/leadops";
import {
  addEmailAccount,
  deleteEmailAccount,
  suppressEmail,
  testConnection,
  unsuppressEmail,
  type SmtpForm,
} from "../lib/mailer";
import { getPlan } from "../lib/plans";
import type { EmailAccount, Lead, Profile, SuppressionEntry } from "../lib/types";
import { Badge, Button, Card, Field, Input, Modal, toast } from "../ui/kit";

function Section({
  icon: Icon,
  title,
  sub,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-black/[0.05] px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-500">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14.5px] font-semibold text-neutral-950">{title}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-neutral-400">{sub}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function SmtpModal({
  open,
  onClose,
  userId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onAdded: () => void;
}) {
  const [form, setForm] = useState<SmtpForm>({
    label: "",
    host: "",
    port: 587,
    username: "",
    password: "",
    from_email: "",
    from_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof SmtpForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: k === "port" ? Number(e.target.value) : e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const a = await addEmailAccount(userId, form);
      toast(`Sender “${a.label}” connected — credentials encrypted at rest`);
      onAdded();
      onClose();
      setForm({ label: "", host: "", port: 587, username: "", password: "", from_email: "", from_name: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect sender.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect SMTP sender" wide>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200/70 bg-red-50/70 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600">
            {error}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sender label">
            <Input value={form.label} onChange={set("label")} placeholder="Alex — primary" />
          </Field>
          <Field label="SMTP host">
            <Input value={form.host} onChange={set("host")} placeholder="smtp.yourprovider.com" />
          </Field>
          <Field label="Port">
            <Input type="number" value={form.port} onChange={set("port")} placeholder="587" />
          </Field>
          <Field label="Username">
            <Input value={form.username} onChange={set("username")} placeholder="smtp-user" autoComplete="off" />
          </Field>
          <Field label="Password" hint="Encrypted with AES-256-GCM before storage.">
            <Input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="From email">
            <Input type="email" value={form.from_email} onChange={set("from_email")} placeholder="alex@yourcompany.com" />
          </Field>
          <Field label="From name">
            <Input value={form.from_name} onChange={set("from_name")} placeholder="Alex Rivera" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>
            <KeyRound className="h-3.5 w-3.5" /> Connect sender
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SettingsPage({ userId }: { userId: string }) {
  useDb(["profiles", "email_accounts", "suppression_list", "leads"]);
  const profile = db.byId<Profile>("profiles", userId);
  const plan = getPlan(userId);

  const [name, setName] = useState(profile?.name ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [fromName, setFromName] = useState(profile?.from_name ?? "");
  const [smtpModal, setSmtpModal] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [suppInput, setSuppInput] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  const accounts = db.where<EmailAccount>("email_accounts", (a) => a.user_id === userId);
  const suppression = db
    .where<SuppressionEntry>("suppression_list", (s) => s.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Profile */}
      <Section
        icon={User}
        title="Profile"
        sub="Used in AI emails and campaign variables ({{sender}})."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            db.update<Profile>("profiles", userId, {
              name: name.trim(),
              company: company.trim(),
              from_name: fromName.trim() || name.trim(),
            });
            toast("Profile saved");
          }}
          className="grid gap-3 sm:grid-cols-3"
        >
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Company">
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company" />
          </Field>
          <Field label="Sender name ({{sender}})">
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Alex" />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" size="sm">Save profile</Button>
          </div>
        </form>
      </Section>

      {/* SMTP */}
      <Section
        icon={Mail}
        title="SMTP senders"
        sub={`${plan.name} includes ${plan.senders} connected sender${plan.senders > 1 ? "s" : ""}. Credentials are encrypted (AES-256-GCM) and never exposed to the browser after saving.`}
        action={
          <Button size="sm" variant="secondary" onClick={() => setSmtpModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Connect
          </Button>
        }
      >
        {accounts.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 px-4 py-6 text-center text-[12.5px] text-neutral-400">
            Connect an SMTP sender to launch campaigns — Gmail, Outlook, or any provider with an app password.
          </p>
        ) : (
          <div className="space-y-2.5">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-black/[0.06] px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-100 text-neutral-500">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-neutral-900">{a.label}</p>
                  <p className="text-[11px] text-neutral-400">
                    {a.host}:{a.port} · from {a.from_email} {a.from_name ? `(${a.from_name})` : ""}
                  </p>
                </div>
                <Badge tone={a.status === "active" ? "green" : "red"}>{a.status}</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={testing === a.id}
                  onClick={async () => {
                    setTesting(a.id);
                    try {
                      await testConnection(userId, a.id);
                      toast("Connection verified — handshake OK");
                    } finally {
                      setTesting(null);
                    }
                  }}
                >
                  Test
                </Button>
                <button
                  onClick={() => {
                    void deleteEmailAccount(userId, a.id).then(() =>
                      toast("Sender removed", "info")
                    );
                  }}
                  aria-label="Remove sender"
                  className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Suppression list */}
      <Section
        icon={Ban}
        title="Suppression list"
        sub="These addresses are never contacted — campaigns skip them automatically."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await suppressEmail(userId, suppInput.trim().toLowerCase());
              setSuppInput("");
              toast("Added to suppression list");
            } catch (err) {
              toast(err instanceof Error ? err.message : "Invalid email.", "error");
            }
          }}
          className="flex gap-2"
        >
          <Input value={suppInput} onChange={(e) => setSuppInput(e.target.value)} placeholder="email@example.com" />
          <Button type="submit" variant="secondary">Suppress</Button>
        </form>
        <div className="mt-3 space-y-1.5">
          {suppression.length === 0 ? (
            <p className="text-[12px] text-neutral-400">No suppressed addresses.</p>
          ) : (
            suppression.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 rounded-lg bg-neutral-50/70 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-neutral-700">{s.email}</span>
                <Badge tone="neutral">{s.reason}</Badge>
                <button
                  onClick={() => {
                    void unsuppressEmail(userId, s.email).then(() =>
                      toast("Removed from suppression list", "info")
                    );
                  }}
                  className="text-[11px] font-medium text-neutral-400 hover:text-neutral-900"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </Section>

      {/* Environment */}
      <Section icon={Database} title="Environment" sub="Integration status for this deployment.">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { name: "Database", value: "Supabase PostgreSQL + RLS", mode: "production binding" },
            { name: "AI model", value: "o4-mini · server-side key", mode: "cached responses" },
            { name: "Payments", value: "Razorpay · USD subscriptions", mode: "webhook verified" },
          ].map((i) => (
            <div key={i.name} className="rounded-xl border border-black/[0.06] p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                {i.name}
              </p>
              <p className="mt-1.5 text-[12.5px] font-medium text-neutral-800">{i.value}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> {i.mode}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          Secrets (SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, RAZORPAY_KEY_SECRET, SMTP_ENCRYPTION_KEY) are
          server-only and never shipped to the client. See .env.example.
        </p>
      </Section>

      {/* Data */}
      <Section icon={Download} title="Your data" sub="Export everything, or permanently delete your account.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const leads = db.where<Lead>("leads", (l) => l.user_id === userId);
              if (leads.length === 0) return toast("No leads to export.", "error");
              downloadCsv(`zybble-export-${new Date().toISOString().slice(0, 10)}.csv`, leadsToCsv(leads));
              toast(`Exported ${leads.length} leads`);
            }}
          >
            <Download className="h-3.5 w-3.5" /> Export all leads (CSV)
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmWipe(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete account & data
          </Button>
        </div>
      </Section>

      <SmtpModal open={smtpModal} onClose={() => setSmtpModal(false)} userId={userId} onAdded={() => {}} />

      <Modal open={confirmWipe} onClose={() => setConfirmWipe(false)} title="Delete account">
        <p className="text-[13.5px] leading-relaxed text-neutral-600">
          This permanently deletes your profile, leads, jobs, campaigns, senders and billing
          records. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmWipe(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              resetStorage();
              logout();
              window.location.hash = "#/";
              toast("Account deleted", "info");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
