import { Clapperboard, Film, FolderOpen } from "lucide-react";
import { notFound } from "next/navigation";
import { Action } from "@/components/ui/primitives";
import { ClipCard } from "@/components/workspace/cards";
import { GenerateAction } from "@/components/workspace/generate-action";
import { JobStatus } from "@/components/workspace/job-status";
import {
  MediaImage,
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceIssue,
} from "@/components/workspace/ui";
import { WorkspaceMutation } from "@/components/workspace/workspace-mutation";
import { workspace } from "@/services/workspace-server";
import {
  bytesText,
  dateText,
  durationText,
  projectHref,
  statusText,
} from "@/services/workspace-format";
import { listingHref, one, type Query } from "@/services/workspace-query";
export const metadata = { title: "Project details" };
export default async function Project({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Query>;
}) {
  const { projectId } = await params;
  const q = await searchParams;
  const raw = one(q, "order");
  const order = raw === "score" || raw === "newest" ? raw : "rank";
  const cursor = one(q, "cursor", 2048) || undefined;
  const result = await workspace.run("getProject", projectId);
  if (!result.ok) {
    if (result.error === "not_found") notFound();
    return (
      <>
        <WorkspaceHeading
          label="PROJECT"
          title="Project details"
          description="See the source video, generation status and completed clips."
        />
        <WorkspaceIssue result={result} />
        <WorkspaceEmpty
          icon={FolderOpen}
          title="Project details aren’t available"
          text="No project data can be loaded in this preview."
          action={
            <Action href="/projects" variant="secondary">
              Back to projects
            </Action>
          }
        />
      </>
    );
  }
  const { project, job } = result.value;
  const clips =
    project.status === "completed"
      ? await workspace.run("listClips", {
          projectId,
          search: "",
          order,
          cursor,
        })
      : null;
  return (
    <>
      <WorkspaceHeading
        label="PROJECT"
        title={project.title}
        description={`${statusText[project.status]} · Created ${dateText(project.createdAt)}`}
        action={
          project.canDelete && (
            <WorkspaceMutation
              kind="delete"
              projectId={projectId}
              returnToProjects
            />
          )
        }
      />
      <div className="ws-detail-grid">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">SOURCE</span>
              <h2>Original video</h2>
            </div>
            <Film size={21} aria-hidden="true" />
          </div>
          {project.source ? (
            <>
              {project.source.thumbnail && (
                <div className="ws-poster">
                  <MediaImage src={project.source.thumbnail} />
                </div>
              )}
              <dl className="ws-detail-list">
                <div>
                  <dt>File</dt>
                  <dd>{project.source.filename}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{durationText(project.source.durationSeconds)}</dd>
                </div>
                <div>
                  <dt>File size</dt>
                  <dd>{bytesText(project.source.bytes)}</dd>
                </div>
                {project.source.width && project.source.height && (
                  <div>
                    <dt>Resolution</dt>
                    <dd>
                      {project.source.width} × {project.source.height}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p>Verified source metadata isn’t available yet.</p>
          )}
        </section>
        {job && (
          <JobStatus
            key={job.id}
            job={job}
            retry={
              job.phase === "failed" &&
              job.failure?.canRetry &&
              job.reservation?.state === "released" ? (
                <GenerateAction
                  projectId={projectId}
                  settings={job.configuration}
                  retryJobId={job.id}
                />
              ) : undefined
            }
          />
        )}
      </div>
      {project.status === "uploaded" && project.source && (
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Ready to configure clips</h2>
          </div>
          <Action href={listingHref("/projects/new", { source: project.id })}>
            Continue setup
          </Action>
        </section>
      )}
      {clips && (
        <section className="ws-panel ws-library">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">RESULTS</span>
              <h2>
                {project.clipCount} generated{" "}
                {project.clipCount === 1 ? "clip" : "clips"}
              </h2>
            </div>
          </div>
          <form className="ws-filter" action={projectHref(projectId)}>
            <div>
              <label htmlFor="clip-order">Sort by</label>
              <select id="clip-order" name="order" defaultValue={order}>
                <option value="rank">AI rank</option>
                <option value="score">AI score</option>
                <option value="newest">Newest</option>
              </select>
            </div>
            <button className="button button-secondary" type="submit">
              Apply sort
            </button>
          </form>
          <WorkspaceIssue result={clips} />
          {clips.ok && clips.value.items.length ? (
            <>
              <div className="ws-clip-grid">
                {clips.value.items.map((clip) => (
                  <ClipCard clip={clip} key={clip.id} />
                ))}
              </div>
              {clips.value.nextCursor && (
                <Action
                  href={listingHref(projectHref(projectId), {
                    order,
                    cursor: clips.value.nextCursor,
                  })}
                  variant="secondary"
                >
                  Next page
                </Action>
              )}
            </>
          ) : (
            <WorkspaceEmpty
              icon={Clapperboard}
              title="No clips to show"
              text={
                clips.ok
                  ? "This job has no available clips."
                  : "Clip assets couldn’t be loaded."
              }
            />
          )}
        </section>
      )}
    </>
  );
}
