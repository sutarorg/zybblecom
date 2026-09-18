import {
  ArrowLeft,
  CalendarClock,
  Eye,
  Mail,
  Pause,
  Play,
  Plus,
  Rocket,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { useDb, db } from "../lib/db";
import {
  addLeadsToCampaign,
  campaignSteps,
  createCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  updateCampaign,
  type SmtpForm,
} from "../lib/mailer";
import { getPlan, PlanGateError } from "../lib/plans";
import type {
  Campaign,
  CampaignLead,
  EmailAccount,
  EmailEvent,
  EmailJob,
  Lead,
} from "../lib/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  toast,
} from "../ui/kit";
import { CampaignPickerModal } from "./leads";

const statusTone = (s: string) =>
  s === "active" ? "green" : s === "paused" ? "amber" : s === "completed" ? "blue" : "neutral";

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < -86_400_000) return d.toLocaleDateString();
  if (diff < -60_000) return "just now";
  if (diff < 60_000) return "imminent";
  if (diff < 3_600_000) return `in ${Math.round(diff / 60_000)} min`;
  if (diff < 86_400_000) return `in ${Math.round(diff / 3_600_000)} hr`;
  return `in ${Math.round(diff / 86_400_000)} days`;
}

// ———————————————— Sequence builder ————————————————

interface StepDraft {
  day_offset: number;
  subject: string;
  body: string;
}

function CampaignBuilder({
  open,
  onClose,
  userId,
  edit,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  edit: Campaign | null;
}) {
  useDb(["email_accounts"]);
  const accounts = db.where<EmailAccount>("email_accounts", (a) => a.user_id === userId);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([
    { day_offset: 0, subject: "", body: "" },
    { day_offset: 3, subject: "", body: "" },
    { day_offset: 7, subject: "", body: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (edit) {
      setName(edit.name);
      setAccountId(edit.account_id ?? "");
      const s = campaignSteps(edit.id);
      setSteps(
        s.length
          ? s.map((x) => ({ day_offset: x.day_offset, subject: x.subject, body: x.body }))
          : [{ day_offset: 0, subject: "", body: "" }]
      );
    } else {
      setName("");
      setAccountId(accounts[0]?.id ?? "");
      setSteps([
        {
          day_offset: 0,
          subject: "Quick question, {{company}}",
          body: "Hi {{company}} team,\n\nI came across {{company}} while looking at {{category}} in {{city}} — your {{rating}}-star rating stood out.\n\nWould it be worth a short conversation this week?\n\nBest,\n{{sender}}",
        },
        {
          day_offset: 3,
          subject: "Re: quick question, {{company}}",
          body: "Hi {{company}} team,\n\nJust following up on my earlier note — I think there's a genuine fit here.\n\nOpen to ten minutes this week?\n\nBest,\n{{sender}}",
        },
        {
          day_offset: 7,
          subject: "Closing the loop",
          body: "Hi {{company}} team,\n\nI don't want to keep filling your inbox, so this will be my last note.\n\nIf the timing is ever right, I'm here.\n\nBest,\n{{sender}}",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit]);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      if (edit) {
        await updateCampaign(edit.id, { name, account_id: accountId || null, steps });
        toast("Campaign updated");
      } else {
        const c = await createCampaign({ name, account_id: accountId || null, steps });
        toast(`Campaign “${c.name}” created — add leads to get started`);
      }
      onClose();
    } catch (e) {
      if (e instanceof PlanGateError) {
        setError(e.message);
      } else setError(e instanceof Error ? e.message : "Could not save campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? "Edit campaign" : "New campaign"} wide>
      <div className="space-y-4">
        {error && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3">
            <p className="text-[12.5px] font-medium text-amber-800">{error}</p>
            <a href="#/app/billing" className="ml-auto text-[12.5px] font-semibold text-neutral-950 hover:underline underline-offset-4">
              Upgrade
            </a>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Campaign name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Roofers — Dallas Q3" />
          </Field>
          <Field label="Send from">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Choose an SMTP sender…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({a.from_email})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {accounts.length === 0 && (
          <p className="rounded-xl bg-sky-50 px-3.5 py-2.5 text-[12px] font-medium text-sky-800">
            No SMTP sender connected yet —{" "}
            <a href="#/app/settings" className="font-semibold underline underline-offset-2">
              connect one in Settings
            </a>{" "}
            before launching.
          </p>
        )}

        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-black/[0.06] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
                <p className="text-[12.5px] font-semibold text-neutral-900">
                  {i === 0 ? "Initial email" : `Follow-up ${i}`}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-neutral-400">Day</span>
                  <Input
                    type="number"
                    min={i === 0 ? 0 : steps[i - 1].day_offset + 1}
                    value={s.day_offset}
                    disabled={i === 0}
                    onChange={(e) => {
                      const next = [...steps];
                      next[i] = { ...s, day_offset: Number(e.target.value) };
                      setSteps(next);
                    }}
                    className="h-8 w-20 rounded-lg px-2.5 text-[12px]"
                  />
                  {steps.length > 1 && (
                    <button
                      onClick={() => setSteps(steps.filter((_, x) => x !== i))}
                      aria-label="Remove step"
                      className="grid h-7 w-7 place-items-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-2.5">
                <Input
                  value={s.subject}
                  onChange={(e) => {
                    const next = [...steps];
                    next[i] = { ...s, subject: e.target.value };
                    setSteps(next);
                  }}
                  placeholder="Subject line"
                />
                <Textarea
                  value={s.body}
                  onChange={(e) => {
                    const next = [...steps];
                    next[i] = { ...s, body: e.target.value };
                    setSteps(next);
                  }}
                  rows={4}
                  placeholder="Hi {{company}} team,…"
                  className="text-[12.5px]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setSteps([...steps, { day_offset: steps[steps.length - 1].day_offset + 4, subject: "", body: "" }])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add follow-up
          </Button>
          <p className="text-[11px] text-neutral-400">
            Variables: {"{{company}} {{city}} {{category}} {{rating}} {{sender}}"}
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              {edit ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ———————————————— Lead picker ————————————————

function LeadPicker({
  open,
  onClose,
  userId,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  campaign: Campaign;
}) {
  useDb(["leads", "campaign_leads"]);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const inCampaign = new Set(
    db.where<CampaignLead>("campaign_leads", (cl) => cl.campaign_id === campaign.id).map((cl) => cl.lead_id)
  );
  const candidates = db
    .where<Lead>(
      "leads",
      (l) => l.user_id === userId && !!l.email && l.email_status !== "invalid" && !inCampaign.has(l.id)
    )
    .filter((l) => !q || `${l.company} ${l.city} ${l.email}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 60);

  return (
    <Modal open={open} onClose={onClose} title={`Add leads to “${campaign.name}”`} wide>
      <div className="relative">
        <Input placeholder="Search leads…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 max-h-[320px] divide-y divide-black/[0.05] overflow-y-auto rounded-xl border border-black/[0.06]">
        {candidates.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12.5px] text-neutral-400">
            No eligible leads — leads need a usable email and can't already be in this campaign.
          </p>
        ) : (
          candidates.map((l) => (
            <label key={l.id} className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-neutral-50/70">
              <input
                type="checkbox"
                checked={picked.has(l.id)}
                onChange={() => {
                  const next = new Set(picked);
                  if (next.has(l.id)) next.delete(l.id);
                  else next.add(l.id);
                  setPicked(next);
                }}
                className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-900"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-neutral-900">{l.company}</span>
                <span className="block truncate text-[10.5px] text-neutral-400">
                  {l.email} · {l.city}
                </span>
              </span>
            </label>
          ))
        )}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          disabled={picked.size === 0}
          onClick={async () => {
            try {
              const n = await addLeadsToCampaign(campaign.id, Array.from(picked));
              toast(`Added ${n} lead${n !== 1 ? "s" : ""} to “${campaign.name}”`);
              setPicked(new Set());
              onClose();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Could not add leads.", "error");
            }
          }}
        >
          Add {picked.size > 0 ? `${picked.size} lead${picked.size > 1 ? "s" : ""}` : "leads"}
        </Button>
      </div>
    </Modal>
  );
}

// ———————————————— Campaign detail ————————————————

function CampaignDetail({ userId, campaignId }: { userId: string; campaignId: string }) {
  useDb(["campaigns", "campaign_steps", "campaign_leads", "email_jobs", "email_events", "leads", "email_accounts"]);
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const [builder, setBuilder] = useState(false);
  const [picker, setPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState<EmailJob | null>(null);

  const c = db.byId<Campaign>("campaigns", campaignId);
  if (!c || c.user_id !== userId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <Empty icon={<Mail className="h-5 w-5" />} title="Campaign not found" body="It may have been deleted." action={<a href="#/app/campaigns" className="inline-flex h-9 items-center rounded-lg bg-neutral-950 px-3.5 text-[12.5px] font-medium text-white">Back to campaigns</a>} />
        </Card>
      </div>
    );
  }

  const steps = campaignSteps(c.id);
  const account = c.account_id ? db.byId<EmailAccount>("email_accounts", c.account_id) : null;
  const cls = db.where<CampaignLead>("campaign_leads", (cl) => cl.campaign_id === c.id);
  const counts = {
    active: cls.filter((x) => x.status === "active").length,
    completed: cls.filter((x) => x.status === "completed").length,
    unsub: cls.filter((x) => x.status === "unsubscribed").length,
  };
  const jobs = db
    .where<EmailJob>("email_jobs", (j) => j.campaign_id === c.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const events = db
    .where<EmailEvent>("email_events", (e) => e.campaign_id === c.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12);

  const stats = [
    { label: "Total leads", value: cls.length },
    { label: "Emails sent", value: c.sent_count },
    { label: "In sequence", value: counts.active },
    { label: "Completed", value: counts.completed },
    { label: "Unsubscribed", value: counts.unsub },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <a href="#/app/campaigns" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-950">
          <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
        </a>
        <span className="text-neutral-300">/</span>
        <h2 className="font-display text-[17px] font-semibold text-neutral-950">{c.name}</h2>
        <Badge tone={statusTone(c.status) as never}>{c.status}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {c.status === "draft" && (
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await launchCampaign(c.id);
                  toast(`“${c.name}” launched — first emails are queued shortly`);
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Cannot launch.", "error");
                }
              }}
            >
              <Rocket className="h-3.5 w-3.5" /> Launch
            </Button>
          )}
          {c.status === "active" && (
            <Button variant="secondary" size="sm" onClick={async () => { await pauseCampaign(c.id); toast("Campaign paused", "info"); }}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {c.status === "paused" && (
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await resumeCampaign(c.id);
                  toast("Campaign resumed");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Cannot resume.", "error");
                }
              }}
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          {c.status !== "active" && (
            <Button variant="secondary" size="sm" onClick={() => setBuilder(true)}>Edit</Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setPicker(true)}>
            <Users className="h-3.5 w-3.5" /> Add leads
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[11px] font-medium text-neutral-400">{s.label}</p>
            <p className="mt-1.5 font-display text-[24px] font-semibold leading-none text-neutral-950">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Steps */}
        <Card className="overflow-hidden">
          <div className="border-b border-black/[0.05] px-5 py-4">
            <p className="font-display text-[14.5px] font-semibold text-neutral-950">Sequence</p>
            <p className="mt-0.5 text-[11.5px] text-neutral-400">
              Sending from {account ? `${account.label} (${account.from_email})` : "no sender connected"}
            </p>
          </div>
          <ol className="px-5 py-4">
            {steps.map((s, i) => (
              <li key={s.id} className="relative pb-4 pl-9 last:pb-0">
                {i < steps.length - 1 && <span className="absolute left-[9px] top-6 bottom-0 w-px bg-black/[0.07]" />}
                <span className={cn("absolute left-0 top-1 h-[19px] w-[19px] rounded-full border-2 border-white", i === 0 ? "bg-neutral-950" : "bg-neutral-300")} />
                <div className="rounded-xl border border-black/[0.06] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                      Day {s.day_offset} · {i === 0 ? "Initial email" : `Follow-up ${i}`}
                    </p>
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-neutral-900">{s.subject}</p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-[11.5px] leading-relaxed text-neutral-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* Activity */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
            <p className="font-display text-[14.5px] font-semibold text-neutral-950">Activity</p>
            <span className="text-[11px] text-neutral-400">live</span>
          </div>
          {events.length === 0 ? (
            <p className="px-5 py-10 text-center text-[12.5px] text-neutral-400">
              Launch the campaign to start sending. Every send, retry and unsubscribe lands here.
            </p>
          ) : (
            <div className="max-h-[420px] divide-y divide-black/[0.04] overflow-y-auto">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-2.5 px-5 py-3">
                  <span className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    e.type === "sent" && "bg-emerald-500",
                    e.type === "scheduled" && "bg-sky-400",
                    e.type === "retry" && "bg-amber-400",
                    (e.type === "failed" || e.type === "suppressed") && "bg-red-400",
                    e.type === "unsubscribed" && "bg-violet-400"
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug text-neutral-700">{e.meta}</p>
                    <p className="mt-0.5 text-[10.5px] text-neutral-400">
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recipients */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
          <p className="font-display text-[14.5px] font-semibold text-neutral-950">Recipients</p>
          <Button variant="secondary" size="sm" onClick={() => setPicker(true)}>
            <Plus className="h-3.5 w-3.5" /> Add leads
          </Button>
        </div>
        {cls.length === 0 ? (
          <Empty
            icon={<Users className="h-5 w-5" />}
            title="No recipients yet"
            body="Add leads with usable emails — unsubscribed and invalid addresses are automatically excluded."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-black/[0.05] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-3 py-3">Step</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Next send</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {cls.slice(0, 25).map((cl) => {
                  const lead = db.byId<Lead>("leads", cl.lead_id);
                  const job = jobs.find((j) => j.campaign_lead_id === cl.id && j.status !== "skipped");
                  if (!lead) return null;
                  return (
                    <tr key={cl.id} className="border-b border-black/[0.04] last:border-0 hover:bg-neutral-50/60">
                      <td className="px-5 py-3">
                        <p className="text-[12.5px] font-semibold text-neutral-900">{lead.company}</p>
                        <p className="text-[10.5px] text-neutral-400">{lead.email}</p>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-neutral-600">
                        {cl.current_step > 0 ? `${cl.current_step} of ${steps.length}` : "Queued"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={cl.status === "completed" ? "green" : cl.status === "unsubscribed" ? "violet" : cl.status === "removed" ? "red" : "blue"}>
                          {cl.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-neutral-600">
                        {cl.status === "active" ? fmtWhen(cl.next_send_at) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {job && (
                          <button
                            onClick={() => setPreview(job)}
                            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-neutral-500 hover:text-neutral-950"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Email preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Email preview" wide>
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-neutral-400">To</p>
                <p className="text-[13px] font-medium text-neutral-900">{preview.lead_email}</p>
              </div>
              <Badge tone={preview.status === "sent" ? "green" : preview.status === "failed" ? "red" : "blue"}>
                {preview.status}
              </Badge>
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-neutral-700">Subject</p>
              <Input value={preview.subject} readOnly />
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-neutral-700">Body</p>
              <Textarea value={preview.body} readOnly rows={9} className="bg-neutral-50/50 text-[12.5px]" />
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              Every campaign email includes a working unsubscribe link. Suppressed addresses are never contacted again.
            </p>
          </div>
        )}
      </Modal>

      <CampaignBuilder open={builder} onClose={() => setBuilder(false)} userId={userId} edit={c} />
      <LeadPicker open={picker} onClose={() => setPicker(false)} userId={userId} campaign={c} />

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete campaign">
        <p className="text-[13.5px] leading-relaxed text-neutral-600">
          Delete <span className="font-semibold text-neutral-900">“{c.name}”</span>? Its schedule and history are removed; your leads stay in the database.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              await deleteCampaign(c.id);
              toast("Campaign deleted", "info");
              window.location.hash = "#/app/campaigns";
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ———————————————— Campaign list ————————————————

export default function CampaignsPage({ userId, route }: { userId: string; route: string }) {
  useDb(["campaigns", "campaign_steps", "email_accounts"]);
  const [builder, setBuilder] = useState(route.includes("new=1"));

  const parts = route.split("/");
  const idAt = parts.indexOf("campaigns") + 1;
  const id = parts[idAt];
  if (id && id !== "campaigns" && !id.includes("?")) {
    return <CampaignDetail userId={userId} campaignId={id} />;
  }

  const plan = getPlan(userId);
  const campaigns = db
    .where<Campaign>("campaigns", (c) => c.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const hasSmtp = db.where<EmailAccount>("email_accounts", (a) => a.user_id === userId).length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!plan.sequences && (
        <Card className="flex flex-wrap items-center gap-4 border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-white p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-indigo-500 shadow-sm">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold text-neutral-950">
              Email Sequences & Automation is a Growth feature
            </p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Automated follow-ups, AI-written steps and unsubscribe-safe sending — from $49/month.
            </p>
          </div>
          <a href="#/app/billing" className="inline-flex h-9 items-center rounded-lg bg-neutral-950 px-3.5 text-[12.5px] font-medium text-white hover:bg-neutral-800">
            Upgrade to Growth
          </a>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-neutral-400">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
        <Button
          size="sm"
          onClick={() => {
            if (!plan.sequences) {
              toast("Email Sequences require Growth or Agency.", "error");
              window.location.hash = "#/app/billing";
              return;
            }
            setBuilder(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> New campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <Empty
            icon={<Mail className="h-5 w-5" />}
            title="No campaigns yet"
            body="Build a simple sequence — initial email plus automated follow-ups — then launch it at your best leads."
            action={
              <Button
                size="sm"
                onClick={() => {
                  if (!plan.sequences) {
                    toast("Email Sequences require Growth or Agency.", "error");
                    window.location.hash = "#/app/billing";
                    return;
                  }
                  setBuilder(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Create a campaign
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-black/[0.05]">
          {campaigns.map((c) => {
            const steps = campaignSteps(c.id);
            const cls = db.where<CampaignLead>("campaign_leads", (cl) => cl.campaign_id === c.id);
            return (
              <a
                key={c.id}
                href={`#/app/campaigns/${c.id}`}
                className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-50/70"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-500">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-neutral-950">{c.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-neutral-400">
                    {steps.length} step{steps.length !== 1 ? "s" : ""} · {cls.length} recipients · {c.sent_count} sent
                  </p>
                </div>
                {!hasSmtp && c.status === "draft" && (
                  <span className="text-[11px] font-medium text-amber-600">Connect SMTP to launch</span>
                )}
                <Badge tone={statusTone(c.status) as never}>{c.status}</Badge>
              </a>
            );
          })}
        </Card>
      )}

      <CampaignBuilder open={builder} onClose={() => setBuilder(false)} userId={userId} edit={null} />
    </div>
  );
}

export { CampaignPickerModal as _CampaignPicker, type SmtpForm };
