"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  PartyPopper,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Chapter, Course, Lesson, LessonType } from "@/db/schema";
import { LessonContent, LessonResources } from "@/components/course/lesson-viewer";
import { toggleLessonComplete } from "@/lib/actions/progress";
import { cn } from "@/lib/utils";

type Curriculum = (Chapter & { lessons: Lesson[] })[];

function TypeIcon({ type, className }: { type: LessonType; className?: string }) {
  if (type === "video") return <Play className={className} />;
  if (type === "pdf") return <FileText className={className} />;
  return <BookOpen className={className} />;
}

export function Player({
  course,
  curriculum,
  completedIds,
  initialLessonId,
  welcome,
  canTrack,
}: {
  course: Course;
  curriculum: Curriculum;
  completedIds: string[];
  initialLessonId: string | null;
  welcome: boolean;
  canTrack: boolean;
}) {
  const flat = useMemo(() => curriculum.flatMap((c) => c.lessons), [curriculum]);
  const total = flat.length;

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (initialLessonId && flat.some((l) => l.id === initialLessonId)) return initialLessonId;
    return flat[0]?.id ?? null;
  });
  const [done, setDone] = useState<Set<string>>(() => new Set(completedIds));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(welcome);

  const active = flat.find((l) => l.id === activeId) ?? null;
  const activeIndex = flat.findIndex((l) => l.id === activeId);
  const prev = activeIndex > 0 ? flat[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < flat.length - 1 ? flat[activeIndex + 1] : null;

  const percent = total === 0 ? 0 : Math.round((done.size / total) * 100);

  useEffect(() => {
    if (!activeId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("l", activeId);
    window.history.replaceState(null, "", url.toString());
  }, [activeId]);

  const select = (id: string) => {
    setError(null);
    setActiveId(id);
  };

  const toggle = async () => {
    if (!active || !canTrack || pendingId) return;
    const wasDone = done.has(active.id);
    setPendingId(active.id);
    setError(null);
    setDone((prevSet) => {
      const copy = new Set(prevSet);
      if (wasDone) copy.delete(active.id);
      else copy.add(active.id);
      return copy;
    });
    const result = await toggleLessonComplete(active.id);
    setPendingId(null);
    if (!result.ok) {
      setDone((prevSet) => {
        const copy = new Set(prevSet);
        if (wasDone) copy.add(active.id);
        else copy.delete(active.id);
        return copy;
      });
      setError(result.error);
      return;
    }
    if (!wasDone && next) {
      setTimeout(() => select(next.id), 350);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mut transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5" /> My library
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{course.title}</h1>
            <p className="mt-1 text-[13px] text-mut">
              {curriculum.length} chapters · {total} lessons
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-center justify-between text-[12px] font-medium">
              <span className="text-mut">
                {done.size} of {total} done
              </span>
              <span className={cn("tabular-nums", percent === 100 ? "text-mint" : "text-ink")}>{percent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-gradient-to-r from-grape to-[#b7a4ff] transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {showWelcome && (
        <div className="flex items-center gap-3 rounded-2xl border border-mint/25 bg-mint-soft px-4 py-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint text-white">
            <PartyPopper className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-mint">You&rsquo;re enrolled — welcome to the course.</p>
            <p className="text-[12.5px] text-mint/80">Your progress saves automatically as you complete lessons.</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShowWelcome(false)}
            className="ml-auto rounded-lg p-1.5 text-mint/70 transition-colors hover:text-mint"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-rose-soft px-4 py-3 text-[13.5px] font-medium text-rose">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
        {/* Main column */}
        <div className="min-w-0">
          {active ? (
            <div key={active.id}>
              <div className="mb-4 flex items-center gap-2">
                <span className="badge badge-grape capitalize">{active.type}</span>
                <h2 className="truncate text-[17px] font-semibold tracking-tight">{active.title}</h2>
                {done.has(active.id) && (
                  <span className="badge badge-mint shrink-0">
                    <CheckCircle2 className="size-3" /> Done
                  </span>
                )}
              </div>

              <LessonContent lesson={active} />
              <LessonResources lesson={active} />

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => prev && select(prev.id)}
                  disabled={!prev}
                  className="btn btn-outline btn-md"
                >
                  <ChevronLeft className="size-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => next && select(next.id)}
                  disabled={!next}
                  className="btn btn-outline btn-md"
                >
                  Next <ChevronRight className="size-4" />
                </button>
                {canTrack && (
                  <button
                    type="button"
                    onClick={toggle}
                    disabled={pendingId === active.id}
                    className={cn(
                      "btn btn-md ml-auto",
                      done.has(active.id) ? "btn-outline" : "btn-accent",
                    )}
                  >
                    {pendingId === active.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : done.has(active.id) ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {done.has(active.id)
                      ? "Mark as incomplete"
                      : next
                        ? "Complete & continue"
                        : "Mark complete"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card grid place-items-center px-6 py-16 text-center">
              <BookOpen className="size-6 text-grape" />
              <p className="mt-3 text-[15px] font-semibold">This course has no lessons yet</p>
              <p className="mt-1 text-[13px] text-mut">The creator is still building it. Check back soon.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="card h-fit p-4 shadow-card lg:sticky lg:top-32 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-mut">Contents</p>
          <div className="mt-3 space-y-4">
            {curriculum.map((chapter, ci) => (
              <div key={chapter.id}>
                <p className="flex items-center gap-2 px-1 text-[12.5px] font-semibold text-ink">
                  <span className="font-display italic text-mut">{String(ci + 1).padStart(2, "0")}</span>
                  <span className="truncate">{chapter.title}</span>
                </p>
                <ul className="mt-1.5 space-y-1">
                  {chapter.lessons.map((lesson) => {
                    const isActive = lesson.id === activeId;
                    const isDone = done.has(lesson.id);
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => select(lesson.id)}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all",
                            isActive
                              ? "border-grape/40 bg-grape-soft"
                              : "border-transparent hover:border-line hover:bg-paper",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                              isDone
                                ? "border-mint bg-mint text-white"
                                : isActive
                                  ? "border-grape text-grape"
                                  : "border-line text-transparent",
                            )}
                          >
                            {isDone ? <Check className="size-2.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-[12.5px] font-medium",
                                isDone && !isActive ? "text-mut" : "text-ink",
                              )}
                            >
                              {lesson.title}
                            </span>
                            {lesson.durationMin ? (
                              <span className="text-[10.5px] text-mut">{lesson.durationMin} min</span>
                            ) : null}
                          </span>
                          <TypeIcon
                            type={lesson.type}
                            className={cn("size-3 shrink-0", isActive ? "text-grape" : "text-mut")}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
