import Link from "next/link";
import { Clapperboard, Film, Play } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import type { Clip, Project } from "@/services/workspace-contracts";
import {
  dateText,
  durationText,
  projectHref,
  clipHref,
  statusText,
} from "@/services/workspace-format";
import { MediaImage } from "./ui";
import { WorkspaceMutation } from "./workspace-mutation";
export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="ws-media-card">
      <Link
        className="ws-poster"
        href={projectHref(project.id)}
        aria-label={`Open ${project.title}`}
      >
        {project.source?.thumbnail ? (
          <MediaImage src={project.source.thumbnail} />
        ) : (
          <Film size={28} aria-hidden="true" />
        )}
        {project.source && (
          <span>{durationText(project.source.durationSeconds)}</span>
        )}
      </Link>
      <div className="ws-media-body">
        <div className="ws-media-heading">
          <h3>
            <Link href={projectHref(project.id)}>{project.title}</Link>
          </h3>
          <span className={`ws-status ws-status-${project.status}`}>
            {statusText[project.status]}
          </span>
        </div>
        <p>
          {project.clipCount} {project.clipCount === 1 ? "clip" : "clips"} ·{" "}
          {dateText(project.createdAt)}
        </p>
        <div className="ws-card-actions">
          <Action href={projectHref(project.id)} variant="text">
            Open project
          </Action>
          {project.canDelete && (
            <WorkspaceMutation projectId={project.id} kind="delete" />
          )}
        </div>
      </div>
    </article>
  );
}
export function ClipCard({
  clip,
  showProject,
}: {
  clip: Clip;
  showProject?: boolean;
}) {
  const href = clipHref(clip.projectId, clip.id);
  return (
    <article className="ws-media-card">
      <Link
        href={href}
        className="ws-poster ws-clip-poster"
        data-aspect={clip.aspect}
        aria-label={`Preview ${clip.title}`}
      >
        {clip.poster ? (
          <MediaImage src={clip.poster} />
        ) : (
          <Clapperboard size={28} aria-hidden="true" />
        )}
        <span>{durationText(clip.durationSeconds)}</span>
      </Link>
      <div className="ws-media-body">
        <div className="ws-media-heading">
          <h3>
            <Link href={href}>{clip.title}</Link>
          </h3>
          {clip.rank !== undefined && (
            <span className="ws-status">Rank {clip.rank}</span>
          )}
        </div>
        <p>
          {clip.aspect} · {dateText(clip.createdAt)}
          {clip.score !== undefined && ` · AI score ${clip.score}`}
        </p>
        {showProject && (
          <Link className="ws-text-link" href={projectHref(clip.projectId)}>
            {clip.projectTitle}
          </Link>
        )}
        <div className="ws-card-actions">
          <Action href={href} variant="text" arrow={false}>
            <Play size={16} aria-hidden="true" />
            Open clip
          </Action>
          {clip.downloads.includes("mp4") && (
            <WorkspaceMutation
              kind="download"
              projectId={clip.projectId}
              clipId={clip.id}
              asset="mp4"
            />
          )}
        </div>
      </div>
    </article>
  );
}
