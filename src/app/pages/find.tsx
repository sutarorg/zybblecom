import { motion } from "framer-motion";
import { ArrowRight, MapPin, Search, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useDb, db } from "../lib/db";
import { startSearch } from "../lib/engine";
import { leadsRemaining, QuotaError } from "../lib/plans";
import type { SearchJob } from "../lib/types";
import { cn } from "../../utils/cn";
import { Badge, Button, Card, Field, Input, Select, StageStepper, stageLabel, toast, UsageMeter } from "../ui/kit";
import { getPlan, getUsage } from "../lib/plans";

const SUGGESTIONS = [
  { q: "Dentists", l: "Texas" },
  { q: "Roofing companies", l: "Dallas" },
  { q: "Marketing agencies", l: "London" },
  { q: "HVAC companies", l: "Arizona" },
];

function JobRow({ job }: { job: SearchJob }) {
  const live = job.status !== "complete" && job.status !== "failed";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13.5px] font-semibold text-neutral-900">{job.query}</p>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-neutral-400">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
          {job.status === "complete" ? (
            <Badge tone="green">Complete</Badge>
          ) : job.status === "failed" ? (
            <Badge tone="red">Failed</Badge>
          ) : (
            <Badge tone="blue">{stageLabel(job.status)}</Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <StageStepper status={job.status} />
          <span className="text-[11px] font-medium text-neutral-400">
            {job.collected}/{job.quantity} leads · {job.progress}%
          </span>
        </div>
        {job.status === "failed" && job.error && (
          <p className="mt-2 text-[12px] font-medium text-red-600">{job.error}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {live && (
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200/70 sm:w-32">
            <div className="h-full rounded-full bg-neutral-900 transition-all duration-500" style={{ width: `${job.progress}%` }} />
          </div>
        )}
        {job.status === "complete" && (
          <a
            href="#/app/leads"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-neutral-950 hover:underline underline-offset-4"
          >
            View leads
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function FindLeads({ userId }: { userId: string }) {
  useDb(["search_jobs", "usage"]);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, []);

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("25");
  const [radius, setRadius] = useState("25000");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = getPlan(userId);
  const usage = getUsage(userId);
  const remaining = leadsRemaining(userId);

  const jobs = db
    .where<SearchJob>("search_jobs", (j) => j.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const job = await startSearch({
        query,
        location,
        quantity: Number(quantity),
        radiusMeters: Number(radius),
      });
      toast(`Searching for "${job.query}" in ${job.location}`);
      setQuery("");
      setLocation("");
    } catch (err) {
      if (err instanceof QuotaError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Could not start the search.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Search form */}
      <Card className="overflow-visible p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-neutral-950">
              Who are you looking for?
            </h2>
            <p className="mt-1 text-[13px] text-neutral-500">
              Zybble finds, enriches and verifies real local businesses — then hands them to AI.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <UsageMeter used={usage.leads_used} total={plan.leadsPerMonth} />
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1.3fr_1fr_130px_130px_auto]">
          <Field label="Business type">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="dentists, roofers, agencies…"
            />
          </Field>
          <Field label="Location">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Texas, Dallas, London…"
            />
          </Field>
          <Field label="Radius">
            <Select value={radius} onChange={(e) => setRadius(e.target.value)}>
              {[
                { v: 5000, l: "5 km" },
                { v: 10000, l: "10 km" },
                { v: 25000, l: "25 km" },
                { v: 50000, l: "50 km" },
              ].map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity">
            <Select value={quantity} onChange={(e) => setQuantity(e.target.value)}>
              {[10, 25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n} leads
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" loading={busy} disabled={remaining === 0} className="w-full sm:w-auto">
              <Search className="h-3.5 w-3.5" />
              Find leads
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3">
            <p className="text-[12.5px] font-medium text-amber-800">{error}</p>
            <a href="#/app/billing" className="ml-auto text-[12.5px] font-semibold text-neutral-950 hover:underline underline-offset-4">
              Upgrade plan
            </a>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-neutral-400">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.q}
              type="button"
              onClick={() => {
                setQuery(s.q);
                setLocation(s.l);
              }}
              className={cn(
                "rounded-full border border-black/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900"
              )}
            >
              {s.q} · {s.l}
            </button>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-neutral-400">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            {remaining.toLocaleString()} leads remaining this month
          </span>
        </div>
      </Card>

      {/* Jobs */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="font-display text-[14px] font-semibold text-neutral-950">
            Searches
          </h3>
          <span className="text-[11.5px] text-neutral-400">{jobs.length} total</span>
        </div>
        <Card className="divide-y divide-black/[0.05]">
          {jobs.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-neutral-400">
              Your searches will appear here and keep running even if you leave this page.
            </p>
          ) : (
            jobs.slice(0, 10).map((j) => <JobRow key={j.id} job={j} />)
          )}
        </Card>
      </div>
    </div>
  );
}
