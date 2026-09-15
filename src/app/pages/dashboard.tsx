import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Mail,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useDb, db } from "../lib/db";
import { getPlan, leadsRemaining } from "../lib/plans";
import type { Campaign, EmailAccount, Lead, SearchJob } from "../lib/types";
import { Badge, Card, LinkButton, ScoreChip, Empty, EmailStatusDot } from "../ui/kit";
import { campaignSteps } from "../lib/mailer";
import { useEffect, useState } from "react";

export default function Dashboard({ userId }: { userId: string }) {
  useDb(["leads", "search_jobs", "campaigns", "usage"]);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const plan = getPlan(userId);
  const month = new Date().toISOString().slice(0, 7);
  const leads = db.where<Lead>("leads", (l) => l.user_id === userId);
  const monthLeads = leads.filter((l) => l.created_at.slice(0, 7) === month);
  const verified = leads.filter((l) => l.email_status === "verified").length;
  const campaigns = db.where<Campaign>("campaigns", (c) => c.user_id === userId);
  const active = campaigns.filter((c) => c.status === "active").length;
  const jobs = db
    .where<SearchJob>("search_jobs", (j) => j.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const hasSmtp = db.where<EmailAccount>("email_accounts", (a) => a.user_id === userId).length > 0;
  const hasLeads = leads.length > 0;
  const hasCampaign = campaigns.length > 0;

  const STATS = [
    {
      label: "Leads this month",
      value: monthLeads.length.toLocaleString(),
      icon: Users,
      sub: `${leads.length.toLocaleString()} total in database`,
    },
    {
      label: "Leads remaining",
      value: leadsRemaining(userId).toLocaleString(),
      icon: Sparkles,
      sub: `${plan.name} plan · resets monthly`,
    },
    {
      label: "Verified emails",
      value: verified.toLocaleString(),
      icon: BadgeCheck,
      sub: leads.length ? `${Math.round((verified / leads.length) * 100)}% of database` : "No leads yet",
    },
    {
      label: "Active campaigns",
      value: active.toLocaleString(),
      icon: Mail,
      sub: `${campaigns.length.toLocaleString()} total campaigns`,
    },
  ];

  const CHECKLIST = [
    { done: true, label: "Create your account" },
    { done: hasLeads, label: "Find your first leads", href: "#/app/find" },
    { done: hasSmtp, label: "Connect an SMTP sender", href: "#/app/settings" },
    { done: hasCampaign, label: "Launch a sequence", href: "#/app/campaigns" },
  ];
  const checklistDone = CHECKLIST.every((c) => c.done);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11.5px] font-medium text-neutral-400">{s.label}</p>
              <s.icon className="h-4 w-4 text-neutral-300" />
            </div>
            <p className="mt-2.5 font-display text-[30px] font-semibold leading-none tracking-[-0.02em] text-neutral-950">
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] text-neutral-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Getting started */}
      {!checklistDone && (
        <Card className="overflow-hidden">
          <div className="border-b border-black/[0.05] px-5 py-4">
            <p className="font-display text-[15px] font-semibold text-neutral-950">Getting started</p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Four steps to your first automated outreach.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {CHECKLIST.map((c, i) => (
              <div
                key={c.label}
                className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-4 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <span
                  className={
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold " +
                    (c.done ? "bg-emerald-500 text-white" : "border border-neutral-300 text-neutral-400")
                  }
                >
                  {c.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                {c.href && !c.done ? (
                  <a href={c.href} className="text-[13px] font-medium text-neutral-900 hover:underline underline-offset-4">
                    {c.label}
                  </a>
                ) : (
                  <span className={"text-[13px] font-medium " + (c.done ? "text-neutral-400 line-through" : "text-neutral-900")}>
                    {c.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent searches */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
            <p className="font-display text-[15px] font-semibold text-neutral-950">Recent searches</p>
            <LinkButton href="#/app/find">New search</LinkButton>
          </div>
          {jobs.length === 0 ? (
            <Empty
              icon={<Search className="h-5 w-5" />}
              title="No searches yet"
              body='Try "dentists in Texas" or "roofing companies in Dallas" to build your first list.'
              action={
                <a href="#/app/find" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 text-[12.5px] font-medium text-white hover:bg-neutral-800">
                  Find leads <ArrowRight className="h-3.5 w-3.5" />
                </a>
              }
            />
          ) : (
            <div className="divide-y divide-black/[0.05]">
              {jobs.slice(0, 5).map((j) => (
                <div key={j.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-neutral-900">
                      {j.query} <span className="text-neutral-400">· {j.location}</span>
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {j.collected}/{j.quantity} leads · {j.status === "complete" ? "Complete" : j.status === "failed" ? "Failed" : "Running…"}
                    </p>
                  </div>
                  {j.status === "complete" ? (
                    <Badge tone="green">Complete</Badge>
                  ) : j.status === "failed" ? (
                    <Badge tone="red">Failed</Badge>
                  ) : (
                    <Badge tone="blue">Running</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent leads */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4">
            <p className="font-display text-[15px] font-semibold text-neutral-950">Recent leads</p>
            <LinkButton href="#/app/leads">View all</LinkButton>
          </div>
          {leads.length === 0 ? (
            <Empty
              icon={<Users className="h-5 w-5" />}
              title="Your database is empty"
              body="Leads you find will appear here with enrichment, emails and AI scores."
            />
          ) : (
            <div className="divide-y divide-black/[0.05]">
              {[...leads]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, 5)
                .map((l) => (
                  <a
                    key={l.id}
                    href={`#/app/leads/${l.id}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50/70"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-[10px] font-semibold text-neutral-500">
                      {l.company.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-neutral-900">{l.company}</p>
                      <p className="truncate text-[11px] text-neutral-400">
                        {l.city}{l.state ? `, ${l.state}` : ""} · {l.category}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <EmailStatusDot status={l.email_status} />
                    </div>
                    <ScoreChip score={l.ai_score} />
                    <ArrowUpRight className="h-3.5 w-3.5 text-neutral-300 transition-colors group-hover:text-neutral-600" />
                  </a>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function campaignStepsCount(c: Campaign) {
  return campaignSteps(c.id).length;
}
