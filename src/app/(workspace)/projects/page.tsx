import { FolderOpen, Plus, Search } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceIssue,
} from "@/components/workspace/ui";
import { ProjectCard } from "@/components/workspace/cards";
import { workspace } from "@/services/workspace-server";
import { listingHref, one, type Query } from "@/services/workspace-query";
export const metadata = { title: "Projects" };
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const search = one(q, "search");
  const raw = one(q, "status");
  const status =
    raw === "processing" || raw === "completed" || raw === "failed"
      ? raw
      : "all";
  const order = one(q, "order") === "oldest" ? "oldest" : "newest";
  const cursor = one(q, "cursor", 2048) || undefined;
  const result = await workspace.run("listProjects", {
    search,
    status,
    order,
    cursor,
  });
  const filtered = Boolean(search || status !== "all");
  return (
    <div className="ws-studio ws-studio-library ws-studio-projects">
      <WorkspaceHeading
        label="WORKSPACE"
        title="Your Projects"
        description="Manage your source videos and find the clips they’ve generated."
        action={
          <Action href="/projects/new" arrow={false}>
            <Plus size={19} aria-hidden="true" />
            Create Project
          </Action>
        }
      />
      <section className="ws-library" aria-label="Project library">
        <form
          className="ws-filter ws-panel"
          aria-label="Filter projects"
          action="/projects"
        >
          <div>
            <label htmlFor="project-search">Search</label>
            <div className="ws-search">
              <Search size={17} aria-hidden="true" />
              <input
                id="project-search"
                name="search"
                maxLength={100}
                defaultValue={search}
                placeholder="Search projects"
              />
            </div>
          </div>
          <div>
            <label htmlFor="project-status">Status</label>
            <select name="status" id="project-status" defaultValue={status}>
              <option value="all">All statuses</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label htmlFor="project-order">Sort by</label>
            <select name="order" id="project-order" defaultValue={order}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <button type="submit" className="button button-secondary">
            Apply filters
          </button>
          {filtered && (
            <Action href="/projects" variant="text" arrow={false}>
              Clear filters
            </Action>
          )}
        </form>
        <WorkspaceIssue result={result} />
        {result.ok && result.value.items.length ? (
          <>
            <div className="ws-project-grid">
              {result.value.items.map((project) => (
                <ProjectCard project={project} key={project.id} />
              ))}
            </div>
            {result.value.nextCursor && (
              <Action
                href={listingHref("/projects", {
                  search,
                  status,
                  order,
                  cursor: result.value.nextCursor,
                })}
                variant="secondary"
              >
                Next page
              </Action>
            )}
          </>
        ) : (
          <WorkspaceEmpty
            className={`ws-library-empty ws-library-${!result.ok ? "unavailable" : filtered ? "no-results" : "first-run"}`}
            icon={FolderOpen}
            title={
              result.ok
                ? filtered
                  ? "No matching projects"
                  : "Your next great clips start with a video."
                : "Your projects aren’t available yet"
            }
            text={
              result.ok
                ? filtered
                  ? "Clear filters or try a different search."
                  : "Create your first project and turn a long-form video into engaging short-form content."
                : "Projects will appear here once your workspace is connected. You can still prepare a draft on this device."
            }
            action={
              <Action
                href={result.ok && filtered ? "/projects" : "/projects/new"}
                variant={result.ok && !filtered ? "primary" : "secondary"}
              >
                {result.ok
                  ? filtered
                    ? "Clear filters"
                    : "Create Your First Project"
                  : "Create a project"}
              </Action>
            }
          />
        )}
      </section>
    </div>
  );
}
