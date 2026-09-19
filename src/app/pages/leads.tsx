import {
  ArrowUpDown,
  Download,
  Mail,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useDb, db } from "../lib/db";
import { scoreAllLeads } from "../lib/ai";
import { deleteLeads, exportLeadsCsv } from "../lib/leadops";
import { addLeadsToCampaign, launchCampaign } from "../lib/mailer";
import { getPlan, PlanGateError } from "../lib/plans";
import type { Campaign, EmailStatus, Lead } from "../lib/types";
import { cn } from "../../utils/cn";
import {
  Badge,
  Button,
  Card,
  EmailStatusDot,
  Empty,
  Input,
  Modal,
  ScoreChip,
  Select,
  toast,
} from "../ui/kit";

const PAGE_SIZE = 15;
type SortKey = "created" | "score" | "rating" | "company";

export default function LeadsPage({ userId }: { userId: string }) {
  useDb(["leads", "campaigns", "subscriptions"]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [emailStatus, setEmailStatus] = useState("all");
  const [minScore, setMinScore] = useState("0");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaignPicker, setCampaignPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scoring, setScoring] = useState(false);

  const plan = getPlan(userId);
  const all = db.where<Lead>("leads", (l) => l.user_id === userId);
  const categories = useMemo(
    () => Array.from(new Set(all.map((l) => l.category))).sort(),
    [all.length]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = all.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (emailStatus !== "all" && l.email_status !== emailStatus) return false;
      if (Number(minScore) > 0 && (l.ai_score ?? 0) < Number(minScore)) return false;
      if (
        needle &&
        ![l.company, l.city, l.state, l.category, l.email ?? "", l.website ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
        return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sortKey === "score") return (b.ai_score ?? -1) - (a.ai_score ?? -1);
      if (sortKey === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
      if (sortKey === "company") return a.company.localeCompare(b.company);
      return b.created_at.localeCompare(a.created_at);
    });
    return rows;
  }, [all, q, category, emailStatus, minScore, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((l) => selected.has(l.id));

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    const next = new Set(selected);
    if (allPageSelected) pageRows.forEach((l) => next.delete(l.id));
    else pageRows.forEach((l) => next.add(l.id));
    setSelected(next);
  };

  const selectedLeads = all.filter((l) => selected.has(l.id));

  const doExport = async () => {
    try {
      await exportLeadsCsv(selected.size > 0 ? Array.from(selected) : null);
      toast(
        selected.size > 0
          ? `Exported ${selected.size} lead${selected.size > 1 ? "s" : ""} to CSV`
          : "Exported all leads to CSV"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed.", "error");
    }
  };

  const doDelete = async () => {
    const count = selected.size;
    try {
      // The server reports exactly how many rows it removed; the local cache is
      // cleared before the resync, so deleted leads cannot come back.
      const deleted = await deleteLeads(Array.from(selected));
      toast(`Deleted ${deleted} lead${deleted === 1 ? "" : "s"}`);
      if (deleted < count) toast(`${count - deleted} lead${count - deleted === 1 ? "" : "s"} could not be deleted.`, "error");
      setSelected(new Set());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete leads.", "error");
    }
    setConfirmDelete(false);
  };

  const doScoreAll = async () => {
    setScoring(true);
    try {
      const { scored, remaining } = await scoreAllLeads();
      toast(
        scored > 0
          ? `AI scored ${scored} lead${scored > 1 ? "s" : ""}${remaining > 0 ? ` · ${remaining} still to go` : ""}`
          : "Every lead already has a score."
      );
    } catch (e) {
      if (e instanceof PlanGateError) {
        toast(e.message, "error");
        window.location.hash = "#/app/billing";
      } else toast("Scoring failed.", "error");
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <Input
              className="pl-9"
              placeholder="Search company, city, email…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Select value={emailStatus} onChange={(e) => { setEmailStatus(e.target.value); setPage(0); }}>
            <option value="all">Any email status</option>
            {["verified", "risky", "invalid", "unknown"].map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
          <Select value={minScore} onChange={(e) => { setMinScore(e.target.value); setPage(0); }}>
            <option value="0">Any AI score</option>
            <option value="50">Score 50+</option>
            <option value="70">Score 70+</option>
            <option value="85">Score 85+</option>
          </Select>
          <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="created">Newest first</option>
            <option value="score">Highest AI score</option>
            <option value="rating">Highest rating</option>
            <option value="company">Company A–Z</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] text-neutral-400">
            {filtered.length.toLocaleString()} lead{filtered.length !== 1 ? "s" : ""}
            {selected.size > 0 && <span className="font-semibold text-neutral-900"> · {selected.size} selected</span>}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {plan.ai && (
              <Button variant="secondary" size="sm" onClick={doScoreAll} loading={scoring}>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Score all with AI
              </Button>
            )}
            {selected.size > 0 && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setCampaignPicker(true)}>
                  <Mail className="h-3.5 w-3.5" />
                  Add to campaign
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={doExport}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <Empty
            icon={<Users className="h-5 w-5" />}
            title={all.length === 0 ? "No leads yet" : "No leads match these filters"}
            body={all.length === 0 ? "Run your first search to build a clean, verified lead database." : "Try widening your filters or search."}
            action={
              all.length === 0 ? (
                <a href="#/app/find" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 text-[12.5px] font-medium text-white hover:bg-neutral-800">
                  Find leads
                </a>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Phones and tablets: stacked rows — nothing to scroll sideways. */}
            <ul className="divide-y divide-black/[0.04] sm:hidden">
              {pageRows.map((l) => (
                <li
                  key={l.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors active:bg-neutral-50",
                    selected.has(l.id) && "bg-neutral-50/60",
                  )}
                  onClick={() => (window.location.hash = `#/app/leads/${l.id}`)}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleOne(l.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900"
                    aria-label={`Select ${l.company}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p title={l.company} className="truncate text-[13.5px] font-semibold text-neutral-900">
                      {l.company}
                    </p>
                    <p className="truncate text-[11px] text-neutral-400">
                      {[l.category, [l.city, l.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-2">
                      <EmailStatusDot status={l.email_status as EmailStatus | null} />
                      <span title={l.email ?? undefined} className="min-w-0 flex-1 truncate text-[11.5px] text-neutral-600">
                        {l.email ?? "No email published"}
                      </span>
                      {l.phones?.length || l.phone ? (
                        <span className="shrink-0 text-[11px] text-neutral-400">
                          {(l.phones?.length ?? 0) > 1 ? `${l.phones!.length} phones` : "phone"}
                        </span>
                      ) : null}
                      <ScoreChip score={l.ai_score} />
                    </div>
                  </div>
                  {l.rating ? (
                    <span className="shrink-0 text-[11.5px] font-medium text-neutral-600">
                      <span className="text-amber-500">★</span> {l.rating}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>

            {/* Desktop: a fixed-layout table, so long values ellipsize instead
                of widening the page. */}
            <table className="hidden w-full table-fixed text-left sm:table">
              <thead>
                <tr className="border-b border-black/[0.05] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-900"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="w-[30%] px-3 py-3">Company</th>
                  <th className="hidden w-[18%] px-3 py-3 md:table-cell">Location</th>
                  <th className="hidden w-[12%] px-3 py-3 lg:table-cell">Rating</th>
                  <th className="w-[26%] px-3 py-3">Email</th>
                  <th className="w-[14%] px-3 py-3">
                    <span className="inline-flex items-center gap-1">
                      AI Score
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => (window.location.hash = `#/app/leads/${l.id}`)}
                    className={cn(
                      "cursor-pointer border-b border-black/[0.04] transition-colors last:border-0 hover:bg-neutral-50/80",
                      selected.has(l.id) && "bg-neutral-50/60"
                    )}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleOne(l.id)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-900"
                        aria-label={`Select ${l.company}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-neutral-100 text-[9px] font-semibold text-neutral-500">
                          {l.company.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p title={l.company} className="truncate text-[13px] font-semibold text-neutral-900">
                            {l.company}
                          </p>
                          <p title={l.category} className="truncate text-[10.5px] text-neutral-400">
                            {l.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <p className="truncate text-[12px] text-neutral-600">
                        {l.city}{l.state ? `, ${l.state}` : ""}
                      </p>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      {l.rating ? (
                        <span className="text-[12px] font-medium text-neutral-700">
                          <span className="text-amber-500">★</span> {l.rating}
                          <span className="text-neutral-400"> · {l.reviews}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="min-w-0">
                        {l.email ? (
                          <p title={l.email} className="truncate text-[12px] text-neutral-700">
                            {l.email}
                          </p>
                        ) : (
                          <p className="truncate text-[11px] text-neutral-300">Not found</p>
                        )}
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <EmailStatusDot status={l.email_status as EmailStatus | null} />
                          {(l.emails?.length ?? 0) > 1 && (
                            <span className="truncate text-[10px] text-neutral-400">
                              +{l.emails!.length - 1} more
                            </span>
                          )}
                          {(l.phones?.length ?? 0) > 1 && !l.email && (
                            <span className="truncate text-[10px] text-neutral-400">
                              {l.phones!.length} phones
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <ScoreChip score={l.ai_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-black/[0.05] px-4 py-3">
            <p className="text-[11.5px] text-neutral-400">
              Page {safePage + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Campaign picker */}
      <CampaignPickerModal
        open={campaignPicker}
        onClose={() => setCampaignPicker(false)}
        userId={userId}
        leads={selectedLeads}
        onDone={() => {
          setSelected(new Set());
          setCampaignPicker(false);
        }}
      />

      {/* Delete confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete leads">
        <p className="text-[13.5px] leading-relaxed text-neutral-600">
          Permanently delete <span className="font-semibold text-neutral-900">{selected.size}</span> lead
          {selected.size !== 1 ? "s" : ""}? They'll be removed from any campaigns too.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void doDelete()}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function CampaignPickerModal({
  open,
  onClose,
  userId,
  leads,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  leads: Lead[];
  onDone: () => void;
}) {
  useDb(["campaigns"]);
  const campaigns = db.where<Campaign>("campaigns", (c) => c.user_id === userId);
  const mailable = leads.filter((l) => l.email && l.email_status !== "invalid");

  return (
    <Modal open={open} onClose={onClose} title="Add to campaign">
      {mailable.length < leads.length && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12px] font-medium text-amber-800">
          {leads.length - mailable.length} lead{leads.length - mailable.length > 1 ? "s" : ""} without a usable email will be skipped.
        </p>
      )}
      {campaigns.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-neutral-500">No campaigns yet.</p>
          <a href="#/app/campaigns?new=1" className="mt-2 inline-block text-[13px] font-semibold text-neutral-950 hover:underline underline-offset-4">
            Create your first campaign →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={async () => {
                try {
                  const n = await addLeadsToCampaign(c.id, mailable.map((l) => l.id));
                  toast(n > 0 ? `Added ${n} lead${n > 1 ? "s" : ""} to “${c.name}”` : "Those leads are already in this campaign.", n > 0 ? "success" : "info");
                  onDone();
                } catch (e) {
                  if (e instanceof PlanGateError) {
                    toast(e.message, "error");
                    window.location.hash = "#/app/billing";
                  } else toast(e instanceof Error ? e.message : "Could not add leads.", "error");
                }
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-black/[0.06] px-4 py-3 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50/60"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-500">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-neutral-900">{c.name}</span>
                <span className="block text-[11px] text-neutral-400">
                  {c.total_leads} leads · {c.status}
                </span>
              </span>
              <Badge tone={c.status === "active" ? "green" : c.status === "paused" ? "amber" : "neutral"}>
                {c.status}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

export { launchCampaign };
