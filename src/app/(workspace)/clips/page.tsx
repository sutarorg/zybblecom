import { Clapperboard, Search } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { ClipCard } from "@/components/workspace/cards";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceIssue,
} from "@/components/workspace/ui";
import { workspace } from "@/services/workspace-server";
import { listingHref, one, type Query } from "@/services/workspace-query";
export const metadata = { title: "My clips" };
export default async function Clips({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const search = one(q, "search");
  const raw = one(q, "since");
  const since = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
  const projectId = one(q, "project", 128) || undefined;
  const cursor = one(q, "cursor", 2048) || undefined;
  const [result, projects] = await Promise.all([
    workspace.run("listClips", {
      search,
      since,
      projectId,
      order: "newest",
      cursor,
    }),
    workspace.run("listProjects", {
      search: "",
      status: "all",
      order: "newest",
    }),
  ]);
  const filtered = Boolean(search || since || projectId);
  return (
    <div className="ws-studio ws-studio-library ws-studio-clips">
      <WorkspaceHeading
        label="YOUR LIBRARY"
        title="My Clips"
        description="All the moments worth sharing, gathered in one place."
        action={
          <Action href="/projects" variant="secondary">
            View Projects
          </Action>
        }
      />
      <section className="ws-library" aria-label="Clip library">
        <form
          className="ws-filter ws-panel"
          aria-label="Filter clips"
          action="/clips"
        >
          <div>
            <label htmlFor="clip-search">Search</label>
            <div className="ws-search">
              <Search size={17} aria-hidden="true" />
              <input
                id="clip-search"
                name="search"
                maxLength={100}
                defaultValue={search}
                placeholder="Search clips"
              />
            </div>
          </div>
          {projects.ok && projects.value.items.length > 0 && (
            <div>
              <label htmlFor="clip-project">Project</label>
              <select
                id="clip-project"
                name="project"
                defaultValue={projectId ?? ""}
              >
                <option value="">All projects</option>
                {projects.value.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="clip-since">Created on or after</label>
            <input
              id="clip-since"
              name="since"
              type="date"
              defaultValue={since}
            />
          </div>
          <button className="button button-secondary" type="submit">
            Apply filters
          </button>
          {filtered && (
            <Action href="/clips" variant="text" arrow={false}>
              Clear filters
            </Action>
          )}
        </form>
        <WorkspaceIssue result={result} />
        {result.ok && result.value.items.length ? (
          <>
            <div className="ws-clip-grid">
              {result.value.items.map((clip) => (
                <ClipCard key={clip.id} clip={clip} showProject />
              ))}
            </div>
            {result.value.nextCursor && (
              <Action
                href={listingHref("/clips", {
                  search,
                  since,
                  project: projectId,
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
            icon={Clapperboard}
            title={
              result.ok
                ? filtered
                  ? "No matching clips"
                  : "Your clip library is waiting."
                : "Your clip library isn’t connected"
            }
            text={
              result.ok
                ? filtered
                  ? "Try a different search or clear your filters."
                  : "Generated shorts will appear here, ready to preview and download."
                : "When generation is connected, you’ll be able to find, preview and download your clips here."
            }
            action={
              <Action
                href={result.ok && filtered ? "/clips" : "/projects"}
                variant="secondary"
              >
                {result.ok && filtered ? "Clear filters" : "View projects"}
              </Action>
            }
          />
        )}
      </section>
    </div>
  );
}
