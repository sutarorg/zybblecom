"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Images,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { saveCourse, type FormState } from "@/lib/actions/courses";
import { Button, Card, Spinner, inputClasses, labelClasses } from "@/components/ui";
import { CATEGORIES, GRADIENT_PRESETS, cx } from "@/lib/utils";

export type LessonDraft = {
  id?: string;
  title: string;
  content: string;
  durationMin: number;
};

let tempIdCounter = 1;

export function CourseForm({
  courseId,
  initial,
  saved,
}: {
  courseId?: string;
  saved?: boolean;
  initial?: {
    title: string;
    category: string;
    description: string;
    priceRupees: string;
    thumbnail: string;
    lessons: LessonDraft[];
  };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveCourse, null);
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "gradient:violet");
  const [thumbMode, setThumbMode] = useState<"preset" | "url">(
    initial?.thumbnail && !initial.thumbnail.startsWith("gradient:") ? "url" : "preset",
  );
  const [lessons, setLessons] = useState<Array<LessonDraft & { key: string }>>(
    () =>
      (initial?.lessons ?? []).map((l) => ({
        ...l,
        key: l.id ?? `new-${tempIdCounter++}`,
      })),
  );
  const [openLesson, setOpenLesson] = useState<string | null>(lessons[0]?.key ?? null);

  const lessonsJson = useMemo(
    () =>
      JSON.stringify(
        lessons.map(({ title, content, durationMin, id }) => ({
          id,
          title,
          content,
          durationMin: Number(durationMin) || 5,
        })),
      ),
    [lessons],
  );

  function mutate(key: string, patch: Partial<LessonDraft>) {
    setLessons((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function move(index: number, dir: -1 | 1) {
    setLessons((ls) => {
      const next = [...ls];
      const j = index + dir;
      if (j < 0 || j >= next.length) return ls;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {courseId && <input type="hidden" name="courseId" value={courseId} />}
      <input type="hidden" name="lessonsJson" value={lessonsJson} />
      <input type="hidden" name="thumbnail" value={thumbnail} />

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" /> Course saved successfully.
        </div>
      )}
      {state?.error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <label className={labelClasses} htmlFor="title">Course title</label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            defaultValue={initial?.title}
            className={inputClasses}
            placeholder="e.g. The Freelance Design Playbook"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClasses} htmlFor="category">Category</label>
            <div className="relative">
              <select
                id="category"
                name="category"
                defaultValue={initial?.category ?? "Design"}
                className={cx(inputClasses, "appearance-none pr-9")}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            </div>
          </div>
          <div>
            <label className={labelClasses} htmlFor="priceRupees">Price (₹) — 0 for free</label>
            <input
              id="priceRupees"
              name="priceRupees"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={initial?.priceRupees ?? "499"}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label className={labelClasses} htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            defaultValue={initial?.description}
            className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-ink-soft/50 focus:border-brand focus:ring-4 focus:ring-brand/15"
            placeholder="What will students learn? Who is it for? What makes it worth it?"
          />
        </div>

        {/* Thumbnail picker */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={labelClasses + " mb-0"}>Thumbnail</span>
            <div className="flex gap-1 rounded-full bg-cream p-0.5 text-[11px] font-semibold">
              {(
                [
                  { id: "preset", label: "Presets", icon: Images },
                  { id: "url", label: "Image URL", icon: Link2 },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setThumbMode(m.id)}
                  className={cx(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition",
                    thumbMode === m.id ? "bg-white shadow-sm" : "text-ink-soft",
                  )}
                >
                  <m.icon className="size-3" /> {m.label}
                </button>
              ))}
            </div>
          </div>
          {thumbMode === "preset" ? (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(GRADIENT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  title={preset.label}
                  onClick={() => setThumbnail(`gradient:${key}`)}
                  className={cx(
                    "h-14 rounded-xl transition active:scale-95",
                    thumbnail === `gradient:${key}` &&
                      "ring-2 ring-ink ring-offset-2 ring-offset-paper",
                  )}
                  style={{ background: preset.css }}
                />
              ))}
            </div>
          ) : (
            <input
              value={thumbnail.startsWith("gradient:") ? "" : thumbnail}
              onChange={(e) => setThumbnail(e.target.value || "gradient:violet")}
              className={inputClasses}
              placeholder="https://… (image URL)"
              inputMode="url"
            />
          )}
        </div>
      </Card>

      {/* Lessons */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold">Curriculum</h3>
            <p className="text-xs text-ink-soft">
              {lessons.length} lesson{lessons.length === 1 ? "" : "s"} · publish needs at least one
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const key = `new-${tempIdCounter++}`;
              setLessons((ls) => [...ls, { key, title: "", content: "", durationMin: 5 }]);
              setOpenLesson(key);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper transition hover:bg-black active:scale-95"
          >
            <Plus className="size-3.5" /> Add lesson
          </button>
        </div>

        {lessons.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink-soft">
            No lessons yet — add your first one.
          </p>
        ) : (
          <ol className="space-y-2">
            {lessons.map((lesson, i) => {
              const open = openLesson === lesson.key;
              return (
                <li key={lesson.key} className="overflow-hidden rounded-2xl border border-line">
                  <div
                    className="flex cursor-pointer items-center gap-2 bg-cream/50 px-3.5 py-3"
                    onClick={() => setOpenLesson(open ? null : lesson.key)}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white font-display text-[11px] font-bold text-ink-soft">
                      {i + 1}
                    </span>
                    <span className={cx("min-w-0 flex-1 truncate text-sm font-semibold", !lesson.title && "text-ink-soft/60")}>
                      {lesson.title || "Untitled lesson"}
                    </span>
                    <span className="text-xs text-ink-soft">{lesson.durationMin}m</span>
                    <span className="flex gap-0.5">
                      <button type="button" aria-label="Move up" onClick={(e) => { e.stopPropagation(); move(i, -1); }} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-white"><ArrowUp className="size-3.5" /></button>
                      <button type="button" aria-label="Move down" onClick={(e) => { e.stopPropagation(); move(i, 1); }} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-white"><ArrowDown className="size-3.5" /></button>
                      <button type="button" aria-label="Delete lesson" onClick={(e) => { e.stopPropagation(); setLessons((ls) => ls.filter((l) => l.key !== lesson.key)); }} className="grid size-7 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="size-3.5" /></button>
                    </span>
                  </div>
                  {open && (
                    <div className="space-y-3 border-t border-line bg-white p-3.5">
                      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                        <input
                          value={lesson.title}
                          onChange={(e) => mutate(lesson.key, { title: e.target.value })}
                          className={inputClasses}
                          placeholder="Lesson title"
                        />
                        <input
                          type="number"
                          min={1}
                          value={lesson.durationMin}
                          onChange={(e) => mutate(lesson.key, { durationMin: Number(e.target.value) })}
                          className={inputClasses}
                          placeholder="Min"
                          title="Duration in minutes"
                        />
                      </div>
                      <textarea
                        value={lesson.content}
                        onChange={(e) => mutate(lesson.key, { content: e.target.value })}
                        rows={6}
                        className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-ink-soft/50 focus:border-brand focus:ring-4 focus:ring-brand/15"
                        placeholder="Lesson content — write your material here. Paragraphs are preserved."
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="sticky bottom-24 z-10 md:bottom-6">
        <Button type="submit" variant="ink" size="lg" disabled={pending} className="w-full shadow-xl sm:w-auto">
          {pending ? <Spinner /> : courseId ? "Save changes" : "Create course"}
        </Button>
      </div>
    </form>
  );
}
