"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  Play,
  Plus,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  Trash2,
  Wallet,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Chapter, Coupon, Course, Lesson, LessonType } from "@/db/schema";
import {
  addChapterAction,
  addLessonAction,
  createCouponAction,
  deleteChapterAction,
  deleteCouponAction,
  deleteCourseAction,
  deleteLessonAction,
  moveChapterAction,
  moveLessonAction,
  renameChapterAction,
  suggestSlugAction,
  toggleCouponAction,
  togglePublishAction,
  updateCourseDetails,
  updateLessonAction,
} from "@/lib/actions/course";
import { InlineUploadButton, UploadField } from "@/components/dashboard/file-upload";
import { cn, formatDate, formatINR, slugify } from "@/lib/utils";

type Curriculum = (Chapter & { lessons: Lesson[] })[];
type Notice = { text: string; tone: "ok" | "err" } | null;

/* --------------------------------- primitives -------------------------------- */

function useNotice(): [Notice, (n: Notice) => void] {
  const [notice, set] = useState<Notice>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => set(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  return [notice, set];
}

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      role={notice.tone === "err" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-2 rounded-2xl px-4 py-3 text-[13.5px] font-medium",
        notice.tone === "err" ? "bg-rose-soft text-rose" : "bg-mint-soft text-mint",
      )}
    >
      {notice.tone === "err" ? <X className="size-4" /> : <Check className="size-4" />}
      {notice.text}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void | Promise<void>;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-grape" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-200",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function ConfirmButton({
  onConfirm,
  children,
  confirmText,
  className,
  icon,
}: {
  onConfirm: () => Promise<void>;
  children: ReactNode;
  confirmText: string;
  className?: string;
  icon?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3200);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!armed) return setArmed(true);
        setPending(true);
        try {
          await onConfirm();
        } finally {
          setPending(false);
          setArmed(false);
        }
      }}
      className={cn(className, armed && "border-rose/50 bg-rose-soft text-rose")}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {armed ? confirmText : children}
    </button>
  );
}

function IconButton({
  onClick,
  label,
  children,
  disabled,
}: {
  onClick: () => void | Promise<void>;
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        try {
          await onClick();
        } finally {
          setPending(false);
        }
      }}
      className="grid size-8 place-items-center rounded-lg border border-line bg-white text-mut transition-colors hover:border-ink/25 hover:text-ink disabled:opacity-35"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : children}
    </button>
  );
}

function TypeIcon({ type, className }: { type: LessonType; className?: string }) {
  if (type === "video") return <Play className={className} />;
  if (type === "pdf") return <FileText className={className} />;
  return <BookOpen className={className} />;
}

/* --------------------------------- main builder ------------------------------- */

export function CourseBuilder({
  course,
  curriculum,
  coupons,
  stats,
}: {
  course: Course;
  curriculum: Curriculum;
  coupons: Coupon[];
  stats: { revenue: number; orders: number; students: number };
}) {
  const router = useRouter();
  const [notice, setNotice] = useNotice();
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [origin, setOrigin] = useState("https://zybble.com");
  useEffect(() => setOrigin(window.location.origin), []);

  const refresh = () => router.refresh();

  const publish = async () => {
    const result = await togglePublishAction(course.id);
    if (result.ok) {
      setNotice({
        text:
          result.data.status === "published"
            ? "Your course is live — the link is ready to share."
            : "Course unpublished. The link is hidden from buyers.",
        tone: "ok",
      });
    } else {
      setNotice({ text: result.error, tone: "err" });
    }
    refresh();
  };

  const remove = async () => {
    const result = await deleteCourseAction(course.id);
    if (result.ok) {
      router.push("/dashboard/courses");
      router.refresh();
    } else {
      setNotice({ text: result.error, tone: "err" });
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${origin}/c/${course.slug}`);
      setNotice({ text: "Course link copied to clipboard.", tone: "ok" });
    } catch {
      setNotice({ text: `Your link: ${origin}/c/${course.slug}`, tone: "ok" });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/courses" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-mut transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5" /> All courses
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{course.title}</h1>
          <span className={cn("badge", course.status === "published" ? "badge-mint" : "badge-neutral")}>
            {course.status === "published" ? "Published" : "Draft"}
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[12.5px] text-mut">{origin}/c/{course.slug}</p>
      </div>

      <NoticeBar notice={notice} />

      {/* Actions bar */}
      <div className="card flex flex-wrap items-center gap-2 p-3.5 shadow-card">
        <button type="button" onClick={share} className="btn btn-outline btn-sm">
          <Copy className="size-3.5" /> Copy link
        </button>
        <Link href={`/c/${course.slug}`} className="btn btn-outline btn-sm" target="_blank">
          <ExternalLink className="size-3.5" /> View page
        </Link>
        <PublishButton status={course.status} onPublish={publish} />
        <ConfirmButton
          onConfirm={remove}
          confirmText="Confirm delete?"
          className="btn btn-outline btn-sm ml-auto"
          icon={<Trash2 className="size-3.5" />}
        >
          Delete
        </ConfirmButton>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr,360px]">
        <div className="min-w-0 space-y-5">
          <DetailsCard course={course} setNotice={setNotice} onSaved={refresh} />
          <CurriculumCard course={course} curriculum={curriculum} setNotice={setNotice} onEdit={setEditing} />
        </div>
        <aside className="space-y-5">
          <section className="card p-5 shadow-card">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-mut">Performance</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: GraduationCap, v: String(stats.students), l: "Students" },
                { icon: ShoppingBag, v: String(stats.orders), l: "Orders" },
                { icon: Wallet, v: formatINR(stats.revenue), l: "Earned" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-line bg-paper p-3 text-center">
                  <s.icon className="mx-auto size-4 text-grape" />
                  <p className="mt-1.5 text-[14px] font-bold tabular-nums">{s.v}</p>
                  <p className="text-[10.5px] text-mut">{s.l}</p>
                </div>
              ))}
            </div>
          </section>
          <CouponsCard course={course} coupons={coupons} setNotice={setNotice} />
        </aside>
      </div>

      {editing && (
        <LessonEditor
          lesson={editing}
          courseId={course.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function PublishButton({ status, onPublish }: { status: Course["status"]; onPublish: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await onPublish();
        } finally {
          setPending(false);
        }
      }}
      className={cn("btn btn-sm", status === "published" ? "btn-outline" : "btn-accent")}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {status === "published" ? "Unpublish" : "Publish course"}
    </button>
  );
}

/* --------------------------------- details card ------------------------------- */

function DetailsCard({
  course,
  setNotice,
  onSaved,
}: {
  course: Course;
  setNotice: (n: Notice) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: course.title,
    slug: course.slug,
    priceInr: Math.round(course.pricePaise / 100),
    coverUrl: course.coverUrl ?? "",
    description: course.description,
  });
  const [pending, setPending] = useState(false);
  const [slugBusy, setSlugBusy] = useState(false);

  const dirty =
    form.title !== course.title ||
    form.slug !== course.slug ||
    form.priceInr !== Math.round(course.pricePaise / 100) ||
    form.coverUrl !== (course.coverUrl ?? "") ||
    form.description !== course.description;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !dirty) return;
    setPending(true);
    const result = await updateCourseDetails({
      courseId: course.id,
      title: form.title,
      slug: form.slug,
      priceInr: Number(form.priceInr) || 0,
      coverUrl: form.coverUrl,
      description: form.description,
    });
    setPending(false);
    if (result.ok) {
      setNotice({ text: "Course details saved.", tone: "ok" });
      onSaved();
    } else {
      setNotice({ text: result.error, tone: "err" });
    }
  };

  const suggestSlug = async () => {
    setSlugBusy(true);
    const result = await suggestSlugAction(course.id, form.title || course.title);
    setSlugBusy(false);
    if (result.ok) setForm((f) => ({ ...f, slug: result.data.slug }));
  };

  return (
    <section className="card p-5 shadow-card sm:p-6">
      <h2 className="text-[15px] font-semibold tracking-tight">Course details</h2>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div>
          <label htmlFor="cb-title" className="label">Title</label>
          <input
            id="cb-title"
            className="input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            minLength={3}
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="cb-slug" className="label">Course link</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[13px] text-mut">
                /c/
              </span>
              <input
                id="cb-slug"
                className="input pl-9 font-mono text-[13.5px]"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                minLength={3}
                maxLength={60}
                required
                aria-describedby="cb-slug-hint"
              />
            </div>
            <button type="button" onClick={suggestSlug} disabled={slugBusy} className="btn btn-outline btn-sm h-11 shrink-0">
              {slugBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
              Suggest
            </button>
          </div>
          <p id="cb-slug-hint" className="mt-1.5 text-[12px] text-mut">
            Lowercase letters, numbers, and hyphens. This is the link you share with buyers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cb-price" className="label">Price (₹) — 0 for free</label>
            <input
              id="cb-price"
              className="input tabular-nums"
              type="number"
              min={0}
              max={500000}
              step={1}
              value={form.priceInr}
              onChange={(e) => setForm((f) => ({ ...f, priceInr: Number(e.target.value) }))}
            />
            <p className="mt-1.5 text-[12px] text-mut">Paid courses must be at least ₹49.</p>
          </div>
          <div>
            <UploadField
              label="Cover image (optional)"
              courseId={course.id}
              kind="image"
              value={form.coverUrl}
              onChange={(url) => setForm((f) => ({ ...f, coverUrl: url }))}
            />
            <p className="mt-1.5 text-[12px] text-mut">Landscape images look best. Leave empty for a gradient.</p>
          </div>
        </div>
        <div>
          <label htmlFor="cb-desc" className="label">Description</label>
          <textarea
            id="cb-desc"
            className="textarea"
            rows={5}
            maxLength={4000}
            placeholder="What will students learn? Who is this for? What makes it different?"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={pending || !dirty} className="btn btn-ink btn-md">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </form>
    </section>
  );
}

/* -------------------------------- curriculum card ------------------------------ */

function CurriculumCard({
  course,
  curriculum,
  setNotice,
  onEdit,
}: {
  course: Course;
  curriculum: Curriculum;
  setNotice: (n: Notice) => void;
  onEdit: (l: Lesson) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [pending, setPending] = useState(false);

  const addChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !chapterTitle.trim()) return;
    setPending(true);
    const result = await addChapterAction(course.id, chapterTitle);
    setPending(false);
    if (result.ok) {
      setChapterTitle("");
      setAdding(false);
      router.refresh();
    } else {
      setNotice({ text: result.error, tone: "err" });
    }
  };

  return (
    <section className="card p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Curriculum</h2>
          <p className="mt-0.5 text-[12.5px] text-mut">Chapters group lessons. Reorder with the arrows.</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="btn btn-outline btn-sm shrink-0">
          <Plus className="size-3.5" /> Add chapter
        </button>
      </div>

      {adding && (
        <form onSubmit={addChapter} className="mt-4 flex gap-2">
          <input
            className="input"
            autoFocus
            placeholder="Chapter title — e.g. Foundations"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            maxLength={160}
          />
          <button type="submit" disabled={pending} className="btn btn-ink btn-sm h-11 shrink-0">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost btn-sm h-11 shrink-0">
            Cancel
          </button>
        </form>
      )}

      <div className="mt-5 space-y-4">
        {curriculum.length === 0 && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="text-[14px] font-semibold">Start with a chapter</p>
            <p className="mt-1 max-w-xs text-[13px] text-mut">
              Chapters organise your course — think &ldquo;Foundations&rdquo;, &ldquo;Deep work&rdquo;, &ldquo;Final project&rdquo;.
            </p>
          </div>
        )}
        {curriculum.map((chapter, ci) => (
          <ChapterBlock
            key={chapter.id}
            chapter={chapter}
            index={ci}
            count={curriculum.length}
            course={course}
            setNotice={setNotice}
            onEdit={onEdit}
          />
        ))}
      </div>
    </section>
  );
}

function ChapterBlock({
  chapter,
  index,
  count,
  course,
  setNotice,
  onEdit,
}: {
  chapter: Chapter & { lessons: Lesson[] };
  index: number;
  count: number;
  course: Course;
  setNotice: (n: Notice) => void;
  onEdit: (l: Lesson) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(chapter.title);

  const blurSave = async () => {
    if (title.trim() && title !== chapter.title) {
      const result = await renameChapterAction(chapter.id, title, course.id);
      if (!result.ok) setNotice({ text: result.error, tone: "err" });
      router.refresh();
    }
  };

  const del = async () => {
    const result = await deleteChapterAction(chapter.id, course.id);
    if (result.ok) {
      setNotice({ text: `Chapter “${chapter.title}” deleted.`, tone: "ok" });
      router.refresh();
    } else {
      setNotice({ text: result.error, tone: "err" });
    }
  };

  const addLesson = async (type: LessonType) => {
    const result = await addLessonAction(chapter.id, course.id, type);
    if (result.ok) router.refresh();
    else setNotice({ text: result.error, tone: "err" });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-cream/40">
      <div className="flex items-center gap-2 border-b border-line/70 px-3.5 py-2.5">
        <span className="font-display text-[13px] italic text-mut">{String(index + 1).padStart(2, "0")}</span>
        <input
          aria-label={`Chapter ${index + 1} title`}
          className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-[14px] font-semibold outline-none transition focus:bg-white focus:ring-2 focus:ring-grape/20"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={blurSave}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={160}
        />
        <span className="text-[11.5px] text-mut">{chapter.lessons.length} lessons</span>
        <IconButton label="Move chapter up" disabled={index === 0} onClick={() => moveChapterAction(chapter.id, "up", course.id).then(() => router.refresh())}>
          <ChevronUp className="size-3.5" />
        </IconButton>
        <IconButton label="Move chapter down" disabled={index === count - 1} onClick={() => moveChapterAction(chapter.id, "down", course.id).then(() => router.refresh())}>
          <ChevronDown className="size-3.5" />
        </IconButton>
        <IconButton label="Delete chapter" onClick={del}>
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>

      <div className="space-y-1.5 p-2.5">
        {chapter.lessons.map((lesson, li) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={li}
            count={chapter.lessons.length}
            course={course}
            setNotice={setNotice}
            onEdit={onEdit}
          />
        ))}
        <div className="flex gap-1.5">
          {(["video", "pdf", "text"] as LessonType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addLesson(t)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-white/60 py-2 text-[12px] font-medium text-mut transition-colors hover:border-grape/50 hover:text-grape-deep"
            >
              <Plus className="size-3" />
              {t === "video" ? "Video" : t === "pdf" ? "PDF" : "Text"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  count,
  course,
  setNotice,
  onEdit,
}: {
  lesson: Lesson;
  index: number;
  count: number;
  course: Course;
  setNotice: (n: Notice) => void;
  onEdit: (l: Lesson) => void;
}) {
  const router = useRouter();
  const del = async () => {
    const result = await deleteLessonAction(lesson.id, course.id);
    if (result.ok) router.refresh();
    else setNotice({ text: result.error, tone: "err" });
  };

  const incomplete =
    (lesson.type === "video" && !lesson.videoUrl) ||
    (lesson.type === "pdf" && !lesson.fileUrl) ||
    (lesson.type === "text" && !lesson.body);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-2.5 py-2">
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", incomplete ? "bg-amber-soft text-amber" : "bg-grape-soft text-grape")}>
        <TypeIcon type={lesson.type} className="size-3" />
      </span>
      <button
        type="button"
        onClick={() => onEdit(lesson)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-[13px] font-medium leading-tight">{lesson.title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] leading-tight text-mut">
          <span className="capitalize">{lesson.type}</span>
          {lesson.durationMin ? <span>· {lesson.durationMin} min</span> : null}
          {incomplete && <span className="font-semibold text-amber">· needs content</span>}
        </span>
      </button>
      {lesson.isPreview && <span className="badge badge-grape hidden sm:inline-flex">Preview</span>}
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Edit lesson" onClick={() => onEdit(lesson)}>
          <Pencil className="size-3.5" />
        </IconButton>
        <IconButton label="Move lesson up" disabled={index === 0} onClick={() => moveLessonAction(lesson.id, "up", course.id).then(() => router.refresh())}>
          <ChevronUp className="size-3.5" />
        </IconButton>
        <IconButton label="Move lesson down" disabled={index === count - 1} onClick={() => moveLessonAction(lesson.id, "down", course.id).then(() => router.refresh())}>
          <ChevronDown className="size-3.5" />
        </IconButton>
        <IconButton label="Delete lesson" onClick={del}>
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

/* -------------------------------- lesson editor ------------------------------- */

function LessonEditor({
  lesson,
  courseId,
  onClose,
  onSaved,
}: {
  lesson: Lesson;
  courseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: lesson.title,
    videoUrl: lesson.videoUrl ?? "",
    fileUrl: lesson.fileUrl ?? "",
    body: lesson.body ?? "",
    durationMin: lesson.durationMin ?? (null as number | null),
    isPreview: lesson.isPreview,
  });
  const [resources, setResources] = useState<{ label: string; url: string }[]>(lesson.resources ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const cleanResources = resources
      .map((r) => ({ label: r.label.trim(), url: r.url.trim() }))
      .filter((r) => r.label && r.url);
    const result = await updateLessonAction({
      lessonId: lesson.id,
      courseId,
      title: form.title,
      videoUrl: form.videoUrl,
      fileUrl: form.fileUrl,
      body: form.body,
      durationMin: form.durationMin === null || Number.isNaN(form.durationMin) ? null : Number(form.durationMin),
      isPreview: form.isPreview,
      resources: cleanResources,
    });
    setPending(false);
    if (result.ok) onSaved();
    else setError(result.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Edit lesson: ${lesson.title}`}>
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-pop sm:rounded-[28px] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-grape-soft text-grape">
              <TypeIcon type={lesson.type} className="size-4" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold leading-tight">Edit lesson</h3>
              <p className="text-[11.5px] capitalize text-mut">{lesson.type} lesson</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="grid size-9 place-items-center rounded-xl border border-line text-mut transition-colors hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label htmlFor="le-title" className="label">Lesson title</label>
            <input
              id="le-title"
              className="input"
              required
              maxLength={160}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          {lesson.type === "video" && (
            <>
              <div>
                <UploadField
                  label="Video"
                  courseId={courseId}
                  kind="video"
                  value={form.videoUrl}
                  onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
                  placeholder="https://youtube.com/watch?v=… or upload a file"
                  required
                />
                <p className="mt-1.5 text-[12px] text-mut">
                  Upload your own file, or paste a YouTube / Vimeo / direct .mp4 link — all play
                  right inside the course.
                </p>
              </div>
              <div>
                <label htmlFor="le-duration" className="label">Duration (minutes)</label>
                <input
                  id="le-duration"
                  className="input tabular-nums"
                  type="number"
                  min={0}
                  max={2000}
                  value={form.durationMin ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value === "" ? null : Number(e.target.value) }))}
                />
              </div>
            </>
          )}

          {lesson.type === "pdf" && (
            <div>
              <UploadField
                label="PDF"
                courseId={courseId}
                kind="pdf"
                value={form.fileUrl}
                onChange={(url) => setForm((f) => ({ ...f, fileUrl: url }))}
                placeholder="https://…/guide.pdf or upload a file"
                required
              />
              <p className="mt-1.5 text-[12px] text-mut">Students can read it inline or download it.</p>
            </div>
          )}

          {lesson.type === "text" && (
            <div>
              <label htmlFor="le-body" className="label">Written content</label>
              <textarea
                id="le-body"
                className="textarea min-h-44"
                placeholder="Write the lesson…"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3">
            <div>
              <p className="text-[13.5px] font-semibold">Free preview</p>
              <p className="text-[12px] text-mut">Anyone with the link can view this lesson.</p>
            </div>
            <Switch checked={form.isPreview} onChange={(v) => setForm((f) => ({ ...f, isPreview: v }))} label="Toggle free preview" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="label mb-0">Resources</p>
              <button
                type="button"
                onClick={() => setResources((r) => [...r, { label: "", url: "" }])}
                disabled={resources.length >= 12}
                className="btn btn-ghost btn-sm"
              >
                <Plus className="size-3.5" /> Add
              </button>
            </div>
            {resources.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-mut">
                Attach downloads, templates, or links for this lesson — upload a file or paste a URL.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {resources.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      aria-label={`Resource ${i + 1} label`}
                      className="input h-10 flex-1 text-[13px]"
                      placeholder="Label — e.g. Slides"
                      value={r.label}
                      onChange={(e) => setResources((rs) => rs.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
                    />
                    <input
                      aria-label={`Resource ${i + 1} URL`}
                      className="input h-10 flex-1 text-[13px]"
                      placeholder="https://… or upload"
                      type="url"
                      value={r.url}
                      onChange={(e) => setResources((rs) => rs.map((x, xi) => (xi === i ? { ...x, url: e.target.value } : x)))}
                    />
                    <InlineUploadButton
                      courseId={courseId}
                      kind="resource"
                      label={`Upload resource ${i + 1}`}
                      onUploaded={(url, filename) =>
                        setResources((rs) =>
                          rs.map((x, xi) =>
                            xi === i ? { label: x.label || filename, url } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Remove resource ${i + 1}`}
                      onClick={() => setResources((rs) => rs.filter((_, xi) => xi !== i))}
                      className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-mut transition-colors hover:border-rose/40 hover:text-rose"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-soft px-3.5 py-2.5 text-[13px] font-medium text-rose">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending} className="btn btn-ink btn-md flex-1">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {pending ? "Saving…" : "Save lesson"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline btn-md">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------------------- coupons card ------------------------------- */

function CouponsCard({
  course,
  coupons,
  setNotice,
}: {
  course: Course;
  coupons: Coupon[];
  setNotice: (n: Notice) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    type: "percent" as "percent" | "flat",
    value: "",
    maxUses: "",
    expiresAt: "",
  });
  const [pending, setPending] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const result = await createCouponAction({
      courseId: course.id,
      code: form.code,
      type: form.type,
      valueInr: Number(form.value),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    });
    setPending(false);
    if (result.ok) {
      setForm({ code: "", type: "percent", value: "", maxUses: "", expiresAt: "" });
      setNotice({ text: "Coupon created.", tone: "ok" });
      router.refresh();
    } else {
      setNotice({ text: result.error, tone: "err" });
    }
  };

  return (
    <section className="card p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-mut">
        <TicketPercent className="size-4 text-grape" /> Coupons
      </h2>

      {coupons.length === 0 ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
          {course.pricePaise === 0
            ? "This course is free — no coupons needed."
            : "Launch codes and discounts for this course appear here."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {coupons.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-paper/60 p-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-bold tracking-wide">{c.code}</span>
                <span className="badge badge-grape">
                  {c.type === "percent" ? `−${c.value}%` : `−${formatINR(c.value)}`}
                </span>
                <Switch
                  checked={c.active}
                  label={`Toggle ${c.code}`}
                  onChange={async () => {
                    await toggleCouponAction(c.id, course.id);
                    router.refresh();
                  }}
                />
                <IconButton
                  label={`Delete ${c.code}`}
                  onClick={async () => {
                    const result = await deleteCouponAction(c.id, course.id);
                    if (!result.ok) setNotice({ text: result.error, tone: "err" });
                    router.refresh();
                  }}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
              <p className="mt-1.5 text-[11.5px] text-mut">
                {c.usedCount}
                {c.maxUses ? ` / ${c.maxUses}` : ""} used
                {c.expiresAt ? ` · expires ${formatDate(c.expiresAt)}` : " · no expiry"}
                {!c.active && " · inactive"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {course.pricePaise > 0 && (
        <form onSubmit={create} className="mt-4 space-y-2.5 border-t border-line pt-4">
          <div className="flex gap-2">
            <input
              aria-label="Coupon code"
              className="input h-10 flex-1 font-mono text-[13px] uppercase"
              placeholder="LAUNCH20"
              minLength={3}
              maxLength={24}
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
            <select
              aria-label="Discount type"
              className="select h-10 w-28 text-[13px]"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percent" | "flat" }))}
            >
              <option value="percent">% off</option>
              <option value="flat">₹ off</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              aria-label={form.type === "percent" ? "Percent off" : "Rupees off"}
              className="input h-10 flex-1 tabular-nums text-[13px]"
              type="number"
              min={1}
              max={form.type === "percent" ? 90 : undefined}
              placeholder={form.type === "percent" ? "20 (%)" : "300 (₹)"}
              required
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
            <input
              aria-label="Max uses (optional)"
              className="input h-10 flex-1 tabular-nums text-[13px]"
              type="number"
              min={1}
              placeholder="Max uses"
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
            />
          </div>
          <input
            aria-label="Expiry date (optional)"
            className="input h-10 w-full text-[13px]"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
          />
          <button type="submit" disabled={pending} className="btn btn-outline btn-sm h-10 w-full">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Create coupon
          </button>
        </form>
      )}
    </section>
  );
}
