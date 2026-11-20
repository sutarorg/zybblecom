import {
  Clapperboard,
  Coins,
  Film,
  FolderOpen,
  History,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { Action, Bolt, IconTile } from "@/components/ui/primitives";
import { DashboardPicker } from "@/components/workspace/dashboard-picker";
import { ProjectCard } from "@/components/workspace/cards";
import { WorkspaceEmpty, WorkspaceIssue } from "@/components/workspace/ui";
import { getBalance, getProfile, workspace } from "@/services/workspace-server";
import { creditsText, dateText } from "@/services/workspace-format";
export const metadata = { title: "Dashboard" };
export default async function Dashboard() {
  const [profile, overview, balance, projects, policy, activity] =
    await Promise.all([
      getProfile(),
      workspace.run("getOverview"),
      getBalance(),
      workspace.run("listProjects", {
        search: "",
        status: "all",
        order: "newest",
      }),
      workspace.run("getUploadPolicy"),
      workspace.run("listLedger", { filter: "all" }),
    ]);
  const stats = [
    {
      title: "Videos processed",
      icon: Film,
      tone: "purple" as const,
      value: overview.ok ? overview.value.videosProcessed : undefined,
    },
    {
      title: "Clips generated",
      icon: Clapperboard,
      tone: "pink" as const,
      value: overview.ok ? overview.value.clipsGenerated : undefined,
    },
    {
      title: "Available credits",
      icon: Coins,
      tone: "blue" as const,
      value: balance.ok ? balance.value.available : undefined,
    },
  ];
  return (
    <div className="ws-dashboard">
      <section className="ws-hero">
        <div className="ws-hero-copy">
          <span className="ws-kicker">
            <Sparkles size={14} aria-hidden="true" />
            {profile.ok && profile.value.name
              ? `WELCOME, ${profile.value.name}`
              : "CREATOR WORKSPACE"}
          </span>
          <h1>Turn your videos into more content.</h1>
          <p>
            Upload a long-form video and let Zybble find the moments worth
            sharing.
          </p>
          <div className="actions">
            <Action href="/projects/new" arrow={false}>
              <Plus size={19} aria-hidden="true" />
              Create New Project
            </Action>
            <Action href="/projects" variant="secondary" arrow={false}>
              View Projects
            </Action>
          </div>
        </div>
        <div className="ws-hero-art" aria-hidden="true">
          <div className="ws-orbit ws-orbit-a" />
          <div className="ws-orbit ws-orbit-b" />
          <span className="ws-art-star">✦</span>
          <span className="ws-art-star second">✧</span>
          <div className="ws-art-tile">
            <Bolt />
          </div>
          <div className="ws-art-film">
            <Clapperboard size={28} />
          </div>
        </div>
      </section>
      <div className="ws-dash-grid">
        <section className="ws-panel ws-upload-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">QUICK START</span>
              <h2>Start with a video</h2>
            </div>
            <Upload size={20} aria-hidden="true" />
          </div>
          <DashboardPicker
            maxBytes={policy.ok ? policy.value.maxBytes : undefined}
          />
          <p className="ws-panel-foot">
            {policy.ok
              ? "Choose a video to configure your project."
              : "File selection stays on your device in this preview."}
          </p>
        </section>
        <section className="ws-panel ws-overview">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">AT A GLANCE</span>
              <h2>Workspace overview</h2>
            </div>
          </div>
          <div className="ws-stats">
            {stats.map(({ title, icon, tone, value }) => (
              <div className="ws-stat" key={title}>
                <IconTile icon={icon} tone={tone} />
                <div>
                  <p>{title}</p>
                  <small>
                    {value === undefined ? "Not connected" : "Workspace total"}
                  </small>
                </div>
                <strong
                  aria-label={
                    value === undefined ? "Not available" : String(value)
                  }
                >
                  {creditsText(value)}
                </strong>
              </div>
            ))}
          </div>
          <WorkspaceIssue result={overview} />
          <WorkspaceIssue result={balance} />
        </section>
      </div>
      <div className="ws-dash-grid ws-dash-lower">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">YOUR LIBRARY</span>
              <h2>Recent projects</h2>
            </div>
            <Action href="/projects" variant="text">
              View all
            </Action>
          </div>
          <WorkspaceIssue result={projects} />
          {projects.ok && projects.value.items.length ? (
            <div className="ws-project-grid">
              {projects.value.items.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <WorkspaceEmpty
              icon={FolderOpen}
              title={
                projects.ok
                  ? "You haven't created any projects yet."
                  : "No projects to show yet."
              }
              text={
                projects.ok
                  ? "Start with a long-form video to create your first clips."
                  : "Connect your workspace to see your projects here."
              }
              action={
                <Action href="/projects/new" variant="secondary" arrow={false}>
                  Upload Your First Video
                </Action>
              }
            />
          )}
        </section>
        <section className="ws-panel ws-credit-summary">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">BILLING</span>
              <h2>Credits & activity</h2>
            </div>
            <Coins size={20} aria-hidden="true" />
          </div>
          <p>
            {balance.ok
              ? `${creditsText(balance.value.reserved)} credits reserved for processing.`
              : "Balance and reservations aren’t connected in this preview."}
          </p>
          {activity.ok &&
            (activity.value.items.length ? (
              <ul className="ws-ledger">
                {activity.value.items.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.kind === "purchase"
                        ? `Purchase · ${item.paymentState}`
                        : `Credits ${item.kind}`}
                    </span>
                    <span>{dateText(item.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ws-muted">No recent transactions.</p>
            ))}
          <WorkspaceIssue result={activity} />
          <Action href="/credits/history" variant="secondary" arrow={false}>
            <History size={17} aria-hidden="true" />
            View credit history
          </Action>
        </section>
      </div>
    </div>
  );
}
