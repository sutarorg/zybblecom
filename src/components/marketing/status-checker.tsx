"use client";

import { Activity, CheckCircle2, Database, Loader2, RefreshCw, Server, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Health = { ok: boolean; db?: boolean; time?: string };
type State =
  | { phase: "loading" }
  | {
      phase: "done";
      ok: boolean;
      db: boolean;
      latency: number;
      checkedAt: Date;
    };

export function StatusChecker() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    const started = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as Partial<Health>;
      setState({
        phase: "done",
        ok: res.ok && Boolean(body.ok),
        db: Boolean(body.db),
        latency: Math.round(performance.now() - started),
        checkedAt: new Date(),
      });
    } catch {
      setState({
        phase: "done",
        ok: false,
        db: false,
        latency: Math.round(performance.now() - started),
        checkedAt: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    check();
    timer.current = setInterval(check, 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [check]);

  const loading = state.phase === "loading";
  const ok = state.phase === "done" && state.ok;
  const db = state.phase === "done" && state.db;

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-3xl border px-5 py-4 shadow-card sm:px-6 sm:py-5",
          loading && "border-line bg-white",
          !loading && ok && "border-mint/30 bg-mint-soft",
          !loading && !ok && "border-rose/30 bg-rose-soft",
        )}
        role="status"
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-white",
            loading ? "bg-mut" : ok ? "bg-mint" : "bg-rose",
          )}
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : ok ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Activity className="size-5" />
          )}
        </span>
        <div>
          <p className="text-[16px] font-semibold tracking-tight">
            {loading ? "Checking systems…" : ok ? "All systems operational" : "Service disruption detected"}
          </p>
          <p className="text-[12.5px] text-mut">
            {loading
              ? "Live probe in progress"
              : ok
                ? "Every part of Zybble is responding normally."
                : "Something isn't responding. We're on it — try again shortly."}
          </p>
        </div>
        <button
          type="button"
          onClick={check}
          className="btn btn-outline btn-sm ml-auto bg-white/70"
        >
          <RefreshCw className="size-3.5" /> Re-check
        </button>
      </div>

      {/* Components */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Server,
            name: "Platform & API",
            desc: "Course pages, checkout, dashboards",
            healthy: loading ? null : ok,
          },
          {
            icon: Database,
            name: "Database",
            desc: "Accounts, courses, orders, progress",
            healthy: loading ? null : db,
          },
          {
            icon: Wifi,
            name: "Response latency",
            desc: "Measured from your browser right now",
            healthy: loading ? null : ok,
            value: state.phase === "done" ? `${state.latency} ms` : undefined,
          },
        ].map((c) => (
          <div key={c.name} className="card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <c.icon className="size-4 text-grape" />
              <span
                className={cn(
                  "badge",
                  c.healthy === null
                    ? "badge-neutral"
                    : c.healthy
                      ? "badge-mint"
                      : "badge-rose",
                )}
              >
                {c.healthy === null ? "Checking" : c.healthy ? "Operational" : "Down"}
              </span>
            </div>
            <p className="mt-4 text-[15px] font-semibold tracking-tight">{c.name}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-mut">{c.desc}</p>
            {c.value && (
              <p className="mt-2 text-[18px] font-bold tabular-nums text-ink">{c.value}</p>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-[12px] text-mut">
        {state.phase === "done" &&
          `Last checked ${state.checkedAt.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })} · `}
        This page refreshes automatically every 30 seconds.
      </p>
    </div>
  );
}
