import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Filter as FilterIcon,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useDb, db } from "../lib/db";
import { startSearch } from "../lib/engine";
import { leadsRemaining, QuotaError } from "../lib/plans";
import type { EmailStatus, JobCounts, OpenStatus, SearchFilters, SearchJob, SortBy } from "../lib/types";
import { cn } from "../../utils/cn";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  StageStepper,
  stageLabel,
  toast,
  UsageMeter,
} from "../ui/kit";
import { getPlan, getUsage } from "../lib/plans";

/** How many of the user's own recent searches the "Try:" row offers. */
const RECENT_SEARCHES = 4;

const EMPTY_COUNTS: JobCounts = {
  requested: 0,
  discovered: 0,
  unique: 0,
  duplicates: 0,
  filtered: 0,
  enriched: 0,
  email_found: 0,
  errors: 0,
  coverage_total: 0,
  coverage_done: 0,
  saved: 0,
};

function countsOf(job: SearchJob): JobCounts {
  return {
    ...EMPTY_COUNTS,
    requested: job.requested ?? job.quantity,
    saved: job.collected,
    ...(job.counts ?? {}),
  };
}

// ————————————————————————————————————————————————————————————
// Live job card
// ————————————————————————————————————————————————————————————

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="min-w-[62px]">
      <p className={cn("text-[15px] font-semibold tabular-nums", tone ?? "text-neutral-900")}>{value}</p>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-neutral-400">{label}</p>
    </div>
  );
}

function JobRow({ job }: { job: SearchJob }) {
  const live = job.status !== "complete" && job.status !== "failed";
  const counts = countsOf(job);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-5 py-4">
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
        {job.status === "queued" && <Badge tone="blue">Waiting for the scraper worker</Badge>}
        {counts.errors > 0 && <Badge tone="amber">{counts.errors} warnings</Badge>}
        <span className="ml-auto text-[11.5px] font-medium text-neutral-400">{job.progress}%</span>
      </div>

      <div className="mt-3">
        <StageStepper status={job.status} labels />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
        <Metric label="Requested" value={counts.requested || job.quantity} />
        <Metric label="Discovered" value={counts.discovered} />
        <Metric label="Unique" value={counts.unique} />
        <Metric label="Saved" value={counts.saved} />
        <Metric label="Duplicates" value={counts.duplicates} />
        <Metric label="Filtered" value={counts.filtered} />
        <Metric label="Emails" value={counts.email_found} tone="text-emerald-600" />
      </div>

      {live && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11.5px] font-medium text-neutral-400">
            {job.message ??
              (counts.coverage_total > 0
                ? `Search coverage ${counts.coverage_done}/${counts.coverage_total} · ${counts.saved}/${job.quantity} leads saved`
                : `Collecting ${counts.saved}/${job.quantity} leads`)}
          </p>
        </div>
      )}

      {job.status === "complete" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] font-medium text-neutral-500">
            {job.message ??
              `Saved ${counts.saved} of ${job.quantity} requested · ${counts.email_found} with an email${
                counts.duplicates ? ` · ${counts.duplicates} duplicates skipped` : ""
              }`}
          </p>
          <a
            href="#/app/leads"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-neutral-950 hover:underline underline-offset-4"
          >
            View leads
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {job.status === "failed" && job.error && (
        <p className="mt-3 text-[12px] font-medium text-red-600">{job.error}</p>
      )}
    </motion.div>
  );
}

// ————————————————————————————————————————————————————————————
// Filters
// ————————————————————————————————————————————————————————————

const EMAIL_STATUS_OPTIONS: EmailStatus[] = ["verified", "risky", "invalid", "unknown"];
const OPEN_STATUS_OPTIONS: OpenStatus[] = ["open", "closed", "permanently_closed", "unknown"];
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Highest rating" },
  { value: "reviews", label: "Most reviews" },
  { value: "newest", label: "Newest collected" },
];

function TriState({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (next: boolean | null) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <div className="flex overflow-hidden rounded-lg border border-black/[0.08]">
        {(
          [
            { v: null, l: "Any" },
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ] as { v: boolean | null; l: string }[]
        ).map((option) => (
          <button
            key={option.l}
            type="button"
            onClick={() => onChange(option.v)}
            className={cn(
              "flex-1 px-2 py-1.5 text-[11.5px] font-medium transition-colors",
              value === option.v ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50",
            )}
          >
            {option.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                onChange(active ? value.filter((item) => item !== option) : [...value, option])
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11.5px] font-medium capitalize transition-colors",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-black/[0.08] bg-white text-neutral-500 hover:border-neutral-400",
              )}
            >
              {option.replace("_", " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  onChange,
}: {
  filters: Partial<SearchFilters>;
  onChange: (next: Partial<SearchFilters>) => void;
}) {
  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-black/[0.06] bg-neutral-50/60 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Country">
          <Input
            value={filters.country ?? ""}
            onChange={(e) => set("country", e.target.value || null)}
            placeholder="India"
          />
        </Field>
        <Field label="State / region">
          <Input
            value={filters.state ?? ""}
            onChange={(e) => set("state", e.target.value || null)}
            placeholder="Delhi"
          />
        </Field>
        <Field label="City">
          <Input
            value={filters.city ?? ""}
            onChange={(e) => set("city", e.target.value || null)}
            placeholder="New Delhi"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Min rating">
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={filters.min_rating ?? ""}
            onChange={(e) => set("min_rating", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field label="Max rating">
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={filters.max_rating ?? ""}
            onChange={(e) => set("max_rating", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="5"
          />
        </Field>
        <Field label="Min reviews">
          <Input
            type="number"
            min={0}
            value={filters.min_reviews ?? ""}
            onChange={(e) => set("min_reviews", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field label="Max reviews">
          <Input
            type="number"
            min={0}
            value={filters.max_reviews ?? ""}
            onChange={(e) => set("max_reviews", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="any"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <TriState label="Has website" value={filters.has_website ?? null} onChange={(v) => set("has_website", v)} />
        <TriState label="Has phone" value={filters.has_phone ?? null} onChange={(v) => set("has_phone", v)} />
        <TriState label="Has email" value={filters.has_email ?? null} onChange={(v) => set("has_email", v)} />
        <TriState label="Social profile" value={filters.has_social ?? null} onChange={(v) => set("has_social", v)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MultiSelect
          label="Email status"
          options={EMAIL_STATUS_OPTIONS}
          value={(filters.email_status ?? []) as string[]}
          onChange={(next) => set("email_status", next as EmailStatus[])}
        />
        <MultiSelect
          label="Open / closed"
          options={OPEN_STATUS_OPTIONS}
          value={(filters.open_status ?? []) as string[]}
          onChange={(next) => set("open_status", next as OpenStatus[])}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Must include keywords">
          <Input
            value={(filters.keywords_include ?? []).join(", ")}
            onChange={(e) =>
              set(
                "keywords_include",
                e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            placeholder="crossfit, 24 hour"
          />
        </Field>
        <Field label="Exclude keywords">
          <Input
            value={(filters.keywords_exclude ?? []).join(", ")}
            onChange={(e) =>
              set(
                "keywords_exclude",
                e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            placeholder="franchise, closed"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Sort results by">
          <Select value={filters.sort_by ?? "relevance"} onChange={(e) => set("sort_by", e.target.value as SortBy)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}

function activeFilterCount(filters: Partial<SearchFilters>): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "sort_by") return value !== undefined && value !== "relevance";
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== "" && value !== false;
  }).length;
}

// ————————————————————————————————————————————————————————————
// Page
// ————————————————————————————————————————————————————————————

export default function FindLeads({ userId }: { userId: string }) {
  useDb(["search_jobs", "usage"]);
  const [, tick] = useState(0);
  // Re-render between server syncs (the shell syncs every 6s) so progress
  // moves smoothly while a search runs.
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("25");
  const [filters, setFilters] = useState<Partial<SearchFilters>>({ sort_by: "relevance" });
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = getPlan(userId);
  const usage = getUsage(userId);
  const remaining = leadsRemaining(userId);

  const jobs = db
    .where<SearchJob>("search_jobs", (j) => j.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  // The user's own most recent searches — newest first, de-duplicated, so the
  // suggestion row always reflects what they actually search for.
  const recentSearches = useMemo(() => {
    const seen = new Set<string>();
    const out: SearchJob[] = [];
    for (const job of jobs) {
      const key = `${job.query.trim().toLowerCase()}|${job.location.trim().toLowerCase()}`;
      if (!job.query.trim() || !job.location.trim() || seen.has(key)) continue;
      seen.add(key);
      out.push(job);
      if (out.length >= RECENT_SEARCHES) break;
    }
    return out;
  }, [jobs.map((j) => j.id).join(",")]);

  const activeCount = useMemo(() => activeFilterCount(filters), [filters]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const job = await startSearch({
        query,
        location,
        quantity: Number(quantity),
        filters,
        sortBy: filters.sort_by ?? "relevance",
      });
      toast(`Searching for “${job.query}” in ${job.location}`);
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
              Zybble searches Google Maps across the whole area, deduplicates and enriches every business —
              keeping the contact details each business publishes itself, never a guessed address.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <UsageMeter used={usage.leads_used} total={plan.leadsPerMonth} />
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1.4fr_1fr_130px_auto]">
          <Field label="Business type">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="dentists, roofers, gyms…"
            />
          </Field>
          <Field label="Location">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Texas, Dallas, Delhi…"
            />
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

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-700 hover:text-neutral-950"
          >
            <FilterIcon className="h-3.5 w-3.5" />
            Professional filters
            {activeCount > 0 && (
              <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                {activeCount}
              </span>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showFilters && "rotate-180")} />
          </button>
          {showFilters && (
            <FilterPanel
              filters={filters}
              onChange={(next) => setFilters({ ...next, sort_by: next.sort_by ?? "relevance" })}
            />
          )}
        </div>

        {error && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3">
            <p className="text-[12.5px] font-medium text-amber-800">{error}</p>
            <a
              href="#/app/billing"
              className="ml-auto text-[12.5px] font-semibold text-neutral-950 hover:underline underline-offset-4"
            >
              Upgrade plan
            </a>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {recentSearches.length > 0 && (
            <>
              <span className="text-[11.5px] text-neutral-400">Try:</span>
              {recentSearches.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  title={`${job.query} in ${job.location}`}
                  onClick={() => {
                    setQuery(job.query);
                    setLocation(job.location);
                  }}
                  className="max-w-[16rem] truncate rounded-full border border-black/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900"
                >
                  {job.query} · {job.location}
                </button>
              ))}
            </>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-neutral-400">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            {remaining.toLocaleString()} leads remaining this month
          </span>
        </div>
      </Card>

      {/* Jobs */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="font-display text-[14px] font-semibold text-neutral-950">Searches</h3>
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
