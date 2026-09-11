import { Download, FileText, Link2, Play } from "lucide-react";
import type { Lesson } from "@/db/schema";
import { isDirectVideo, toVimeoEmbed, toYouTubeEmbed } from "@/lib/utils";

export function LessonContent({ lesson }: { lesson: Lesson }) {
  if (lesson.type === "video") {
    const url = lesson.videoUrl;
    if (!url) {
      return <EmptyMedia label="No video attached to this lesson yet." />;
    }
    const yt = toYouTubeEmbed(url);
    const vimeo = yt ? null : toVimeoEmbed(url);
    if (yt || vimeo) {
      return (
        <div className="overflow-hidden rounded-2xl border border-line bg-ink shadow-card">
          <div className="aspect-video">
            <iframe
              src={(yt ?? vimeo)!}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }
    if (isDirectVideo(url)) {
      return (
        <div className="overflow-hidden rounded-2xl border border-line bg-ink shadow-card">
          <video src={url} controls className="aspect-video w-full" preload="metadata">
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-grape-soft text-grape">
            <Play className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold">Watch this lesson</p>
            <p className="mt-0.5 text-[13px] text-mut">This video opens on its host platform.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm mt-3"
            >
              <Link2 className="size-3.5" /> Open video
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (lesson.type === "pdf") {
    const url = lesson.fileUrl;
    if (!url) return <EmptyMedia label="No PDF attached to this lesson yet." />;
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <iframe src={url} title={lesson.title} className="h-[70vh] w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            <FileText className="size-3.5" /> Open PDF in a new tab
          </a>
          <a href={url} download className="btn btn-ghost btn-sm">
            <Download className="size-3.5" /> Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="whitespace-pre-wrap text-[15px] leading-[1.85] text-ink-soft">{lesson.body}</div>
    </article>
  );
}

export function LessonResources({ lesson }: { lesson: Lesson }) {
  if (!lesson.resources || lesson.resources.length === 0) return null;
  return (
    <div className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mut">Resources</p>
      <ul className="mt-3 space-y-2">
        {lesson.resources.map((r, i) => (
          <li key={`${r.url}-${i}`}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:border-grape/40 hover:text-ink"
            >
              <Download className="size-4 text-grape" />
              <span className="truncate">{r.label}</span>
              <Link2 className="ml-auto size-3.5 text-mut transition-transform group-hover:translate-x-0.5" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyMedia({ label }: { label: string }) {
  return (
    <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-line bg-cream/60 text-center">
      <p className="px-6 text-[13.5px] text-mut">{label}</p>
    </div>
  );
}
