import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
  PenLine,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDb, db } from "../lib/db";
import { researchCompany, scoreLead, writeEmail, type Tone } from "../lib/ai";
import { getPlan, PlanGateError } from "../lib/plans";
import type { AiResearch, AiScore, Lead } from "../lib/types";
import { CampaignPickerModal } from "./leads";
import { Badge, Button, Card, Empty, EmailStatusDot, Input, Modal, Select, Textarea, toast } from "../ui/kit";
import { cn } from "../../utils/cn";
import { saveLeadNotes } from "../lib/leadops";
import { cacheRow } from "../lib/remote";

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-neutral-400">{label}</p>
        <p className="mt-0.5 break-words text-[13.5px] font-medium text-neutral-800">{value}</p>
      </div>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="flex gap-3 rounded-lg transition-colors hover:bg-neutral-50">
      {inner}
    </a>
  ) : (
    <div className="flex gap-3">{inner}</div>
  );
}

export default function LeadDetail({ userId, leadId }: { userId: string; leadId: string }) {
  useDb(["leads", "ai_research", "ai_scores", "profiles", "subscriptions"]);

  const [busy, setBusy] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [tone, setTone] = useState<Tone>("friendly");
  const [campaignPicker, setCampaignPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const lead = db.byId<Lead>("leads", leadId);
  const plan = getPlan(userId);

  useEffect(() => {
    setNotes(lead?.notes ?? "");
  }, [lead?.id, lead?.notes]);

  if (!lead || lead.user_id !== userId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <Empty
            icon={<MapPin className="h-5 w-5" />}
            title="Lead not found"
            body="This lead may have been deleted."
            action={
              <a href="#/app/leads" className="inline-flex h-9 items-center rounded-lg bg-neutral-950 px-3.5 text-[12.5px] font-medium text-white hover:bg-neutral-800">
                Back to leads
              </a>
            }
          />
        </Card>
      </div>
    );
  }

  const research = db.one<AiResearch>("ai_research", (r) => r.lead_id === leadId && r.user_id === userId);
  const score = db.one<AiScore>("ai_scores", (r) => r.lead_id === leadId && r.user_id === userId);

  const gated = (feature: string, fn: () => Promise<void> | void, busyKey: string) => () => {
    if (!plan.ai) {
      toast(`${feature} requires Growth or Agency.`, "error");
      window.location.hash = "#/app/billing";
      return;
    }
    setBusy(busyKey);
    void (async () => {
      // brief dwell so fast local responses still feel deliberate
      await new Promise((r) => setTimeout(r, 500));
      try {
        await fn();
      } catch (e) {
        if (e instanceof PlanGateError) toast(e.message, "error");
        else toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      } finally {
        setBusy(null);
      }
    })();
  };

  const doResearch = gated("AI Research", async () => {
    await researchCompany(leadId, Boolean(research));
    toast("AI research complete");
  }, "research");

  const doScore = gated("AI Lead Scoring", async () => {
    const s = await scoreLead(leadId, Boolean(score));
    toast(`AI Score: ${s.score} — ${s.verdict}`);
  }, "score");

  const doWrite = gated("AI Email Writer", async () => {
    setEmailDraft(await writeEmail(leadId, tone));
  }, "write");

  const aiLocked = !plan.ai;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="#/app/leads"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leads
        </a>
        <span className="text-neutral-300">/</span>
        <h2 className="font-display text-[17px] font-semibold text-neutral-950">{lead.company}</h2>
        {score && (
          <Badge tone={score.score >= 85 ? "green" : score.score >= 70 ? "blue" : "amber"}>
            <Gauge className="h-3 w-3" />
            {score.verdict} · {score.score}
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCampaignPicker(true)}>
            <Mail className="h-3.5 w-3.5" />
            Add to campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* ——— Business record ——— */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 font-display text-[13px] font-semibold text-white">
              {lead.company.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0">
              <p className="font-display text-[18px] font-semibold tracking-[-0.01em] text-neutral-950">
                {lead.company}
              </p>
              <p className="text-[12.5px] text-neutral-500">
                {lead.category} · {lead.city}{lead.state ? `, ${lead.state}` : ""}
              </p>
            </div>
            {lead.rating && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[12px] font-semibold text-amber-700">
                ★ {lead.rating}
                <span className="font-medium text-amber-600/70">· {lead.reviews}</span>
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoRow icon={MapPin} label="Address" value={`${lead.address}, ${lead.city}${lead.state ? `, ${lead.state}` : ""} ${lead.country}`} />
            <InfoRow icon={Phone} label="Phone" value={lead.phone ?? "Not listed"} />
            <InfoRow
              icon={Globe}
              label="Website"
              value={
                lead.website ? (
                  <span className="inline-flex items-center gap-1 text-neutral-900 underline decoration-neutral-300 underline-offset-4">
                    {lead.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3 w-3 text-neutral-400" />
                  </span>
                ) : (
                  "No website found"
                )
              }
              href={lead.website ?? undefined}
            />
            <InfoRow icon={Clock} label="Hours" value={lead.hours ?? "Not listed"} />
          </div>

          <div className="mt-6 border-t border-black/[0.05] pt-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Email</p>
            {lead.email ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-black/[0.06] bg-neutral-50/60 px-3.5 py-3">
                <BadgeCheck className={cn("h-4 w-4", lead.email_status === "verified" ? "text-emerald-500" : "text-neutral-300")} />
                <span className="text-[13.5px] font-medium text-neutral-900">{lead.email}</span>
                <EmailStatusDot status={lead.email_status} />
                {lead.email_source_url && (
                  <span className="ml-auto truncate text-[10.5px] text-neutral-400">
                    source: {lead.email_source_url.replace(/^https?:\/\//, "")}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-neutral-400">No public email found on their website.</p>
            )}
          </div>

          {lead.description && (
            <div className="mt-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-neutral-400">About</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">{lead.description}</p>
            </div>
          )}

          <div className="mt-5 border-t border-black/[0.05] pt-5">
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                Notes
              </p>
              <span className="text-[10.5px] text-neutral-300">
                {notes.length}/2000
              </span>
            </div>
            <Textarea
              value={notes}
              maxLength={2000}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for this lead…"
              className="mt-2 text-[12.5px]"
            />
            <Button
              variant="secondary"
              size="sm"
              loading={savingNotes}
              className="mt-2"
              onClick={async () => {
                setSavingNotes(true);
                try {
                  cacheRow("leads", await saveLeadNotes(lead.id, notes));
                  toast("Notes saved");
                } catch (err) {
                  toast(
                    err instanceof Error ? err.message : "Could not save notes.",
                    "error"
                  );
                } finally {
                  setSavingNotes(false);
                }
              }}
            >
              Save notes
            </Button>
          </div>

          <a
            href={lead.maps_url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:text-neutral-950"
          >
            <MapPin className="h-3.5 w-3.5" />
            View on Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        </Card>

        {/* ——— AI panel ——— */}
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.08),transparent_70%)] blur-xl"
          />
          <div className="relative flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 font-display text-[15px] font-semibold text-neutral-950">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Zybble AI
            </p>
            {aiLocked && (
              <a href="#/app/billing">
                <Badge tone="violet">
                  <Lock className="h-3 w-3" />
                  Growth feature
                </Badge>
              </a>
            )}
          </div>

          {/* Score block */}
          <div className="relative mt-5 rounded-xl border border-black/[0.06] p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-neutral-950 text-center">
                <div>
                  <p className="font-display text-[22px] font-semibold leading-none text-white">
                    {score?.score ?? "—"}
                  </p>
                  <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    AI Score
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                {score ? (
                  <>
                    <p className="text-[13px] font-semibold text-neutral-900">{score.verdict}</p>
                    <ul className="mt-1.5 space-y-1">
                      {score.reasons.slice(0, 3).map((r) => (
                        <li key={r} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-neutral-500">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-neutral-500">
                    Score this lead against your ideal customer profile with transparent, explainable reasoning.
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={doScore} loading={busy === "score"} disabled={aiLocked}>
                <Gauge className="h-3.5 w-3.5" />
                {score ? "Re-score" : "Score lead"}
              </Button>
            </div>
          </div>

          {/* Research block */}
          <div className="relative mt-3 rounded-xl border border-black/[0.06] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-900">
                <FileText className="h-3.5 w-3.5 text-neutral-400" />
                AI Research
              </p>
              <Button variant="secondary" size="sm" onClick={doResearch} loading={busy === "research"} disabled={aiLocked}>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                {research ? "Refresh" : "Research with AI"}
              </Button>
            </div>
            {research ? (
              <>
                <p className="mt-3 text-[12.5px] leading-relaxed text-neutral-600">{research.summary}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {research.insights.map((t) => (
                    <div key={t.label} className="rounded-lg bg-neutral-50/70 px-2.5 py-2">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutral-400">{t.label}</p>
                      <p className="mt-0.5 text-[11.5px] font-semibold text-neutral-800">{t.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-indigo-100/80 bg-indigo-50/50 p-3">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-indigo-500">Outreach angle</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-neutral-700">{research.angle}</p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-[12.5px] leading-relaxed text-neutral-500">
                Generate a concise company brief and the outreach angle most likely to land — built only from real
                lead data.
              </p>
            )}
          </div>

          {/* Writer block */}
          <div className="relative mt-3 rounded-xl border border-black/[0.06] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-900">
                <PenLine className="h-3.5 w-3.5 text-neutral-400" />
                AI Email Writer
              </p>
              <div className="ml-auto flex items-center gap-2">
                <Select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="h-8 w-32 rounded-lg px-2.5 text-[12px]"
                >
                  <option value="friendly">Friendly</option>
                  <option value="direct">Direct</option>
                  <option value="formal">Formal</option>
                </Select>
                <Button variant="primary" size="sm" onClick={doWrite} loading={busy === "write"} disabled={aiLocked}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Write email
                </Button>
              </div>
            </div>
            {!aiLocked && !emailDraft && (
              <p className="mt-3 text-[12.5px] text-neutral-500">
                Personalized from {lead.company}'s real data — no templates, no invented facts.
              </p>
            )}
            {aiLocked && (
              <p className="mt-3 text-[12.5px] text-neutral-500">
                Upgrade to unlock research, scoring and the AI writer for every lead.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Email draft modal */}
      <Modal open={!!emailDraft} onClose={() => setEmailDraft(null)} title="AI draft" wide>
        {emailDraft && (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-neutral-700">Subject</p>
              <Input value={emailDraft.subject} readOnly />
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-neutral-700">Body</p>
              <Textarea value={emailDraft.body} readOnly rows={11} className="bg-neutral-50/50 text-[13px]" />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`);
                  toast("Copied to clipboard");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                onClick={() => {
                  setEmailDraft(null);
                  setCampaignPicker(true);
                }}
              >
                <Mail className="h-3.5 w-3.5" />
                Add lead to campaign
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CampaignPickerModal
        open={campaignPicker}
        onClose={() => setCampaignPicker(false)}
        userId={userId}
        leads={[lead]}
        onDone={() => setCampaignPicker(false)}
      />
    </div>
  );
}
