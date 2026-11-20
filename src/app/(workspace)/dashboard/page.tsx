import {
  Clapperboard,
  Coins,
  Film,
  FolderOpen,
  History,
  Plus,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Action, IconTile } from "@/components/ui/primitives";
import { DashboardPicker } from "@/components/workspace/dashboard-picker";
import { ProjectCard } from "@/components/workspace/cards";
import { WorkspaceEmpty, WorkspaceIssue } from "@/components/workspace/ui";
import { getBalance, getProfile, workspace } from "@/services/workspace-server";
import { creditsText, dateText } from "@/services/workspace-format";

export const metadata = { title: "Dashboard" };

const steps = [
  {
    icon: Upload,
    title: "Upload your video",
    text: "Start with one long-form recording.",
  },
  {
    icon: Sparkles,
    title: "Let AI find the moments",
    text: "Zybble looks for highlights worth sharing.",
  },
  {
    icon: Clapperboard,
    title: "Review your generated shorts",
    text: "Pick the clips you want to keep.",
  },
];

function DashboardWorkflow() {
  return (
    <section className="dash-workflow" aria-labelledby="dash-workflow-title">
      <div className="dash-workflow-heading">
        <span className="dash-label">HOW IT WORKS</span>
        <h2 id="dash-workflow-title">From long to short</h2>
        <svg
          className="dash-film-mark"
          viewBox="0 0 100 59"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="6"
            y="17"
            width="49"
            height="32"
            rx="6"
            transform="rotate(-12 6 17)"
            fill="#ECE2FF"
            stroke="#D2BDF9"
          />
          <rect
            x="27"
            y="10"
            width="55"
            height="37"
            rx="7"
            fill="#fff"
            stroke="#D2BDF9"
          />
          <path d="M28 20H81M28 38H81" stroke="#D2BDF9" strokeDasharray="3 3" />
          <path d="m51 24 8 5-8 5V24Z" fill="#6338F5" />
          <path
            d="M88 3v10m-5-5h10"
            stroke="#E65EBB"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="18" cy="49" r="2" fill="#873BFF" />
        </svg>
      </div>
      <ol className="dash-steps" role="list">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <span className="dash-step-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
            <span className="dash-step-number" aria-hidden="true">
              0{index + 1}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

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
      detail: "Long-form videos processed",
      icon: Film,
      tone: "purple" as const,
      value: overview.ok ? overview.value.videosProcessed : undefined,
    },
    {
      title: "Clips generated",
      detail: "Shorts created in this workspace",
      icon: Clapperboard,
      tone: "pink" as const,
      value: overview.ok ? overview.value.clipsGenerated : undefined,
    },
    {
      title: "Available credits",
      detail: "Ready to use for processing",
      icon: Coins,
      tone: "blue" as const,
      value: balance.ok ? balance.value.available : undefined,
    },
  ];
  return (
    <div className="ws-dashboard">
      <section className="dash-welcome" aria-labelledby="dash-title">
        <div>
          <p className="dash-label dash-eyebrow">
            <Sparkles size={14} aria-hidden="true" /> Your creator workspace
          </p>
          <h1 id="dash-title">Make more from every video.</h1>
          <p className="dash-intro">
            {profile.ok && profile.value.name && (
              <strong>Welcome, {profile.value.name}. </strong>
            )}
            Upload a long-form video and let Zybble find the moments worth
            sharing.
          </p>
        </div>
        <div className="actions dash-welcome-actions">
          <Action href="/projects/new" arrow={false}>
            <Plus size={17} aria-hidden="true" /> Create New Project
          </Action>
          <Action href="/projects" variant="secondary" arrow={false}>
            View Projects
          </Action>
        </div>
      </section>

      <div className="dash-creation">
        <section className="dash-upload" aria-labelledby="dash-upload-title">
          <header>
            <span className="dash-label">START CREATING</span>
            <h2 id="dash-upload-title">Your next great clip starts here.</h2>
            <p>
              Drop in a podcast, interview, webinar or long-form video. Zybble
              will help turn it into short-form content.
            </p>
          </header>
          <DashboardPicker
            maxBytes={policy.ok ? policy.value.maxBytes : undefined}
          />
          <p className="dash-upload-note">
            <ShieldCheck size={15} aria-hidden="true" />
            {policy.ok
              ? "Choose a video to configure your project. Selecting it doesn’t upload it."
              : "File selection stays on your device in this preview."}
          </p>
        </section>
        <DashboardWorkflow />
      </div>

      <section className="dash-overview" aria-labelledby="dash-overview-title">
        <h2 id="dash-overview-title">Workspace overview</h2>
        <ul className="dash-metrics" role="list">
          {stats.map(({ title, detail, icon, tone, value }) => (
            <li className="dash-metric" key={title}>
              <IconTile icon={icon} tone={tone} />
              <p className="dash-metric-label">{title}</p>
              <strong
                className="dash-metric-value"
                aria-hidden={value === undefined ? true : undefined}
              >
                {creditsText(value)}
              </strong>
              <p className="dash-metric-detail">
                {value === undefined ? "Not connected" : detail}
              </p>
            </li>
          ))}
        </ul>
        <WorkspaceIssue result={overview} />
        <WorkspaceIssue result={balance} />
      </section>

      <div className="dash-library">
        <section
          className="dash-projects"
          aria-labelledby="dash-projects-title"
        >
          <header className="dash-section-head">
            <div>
              <h2 id="dash-projects-title">Recent Projects</h2>
              <p>Pick up where you left off.</p>
            </div>
            <Action href="/projects" variant="text">
              View All Projects
            </Action>
          </header>
          <WorkspaceIssue result={projects} />
          {projects.ok && projects.value.items.length ? (
            <div className="ws-project-grid">
              {projects.value.items.slice(0, 3).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <WorkspaceEmpty
              className="dash-project-empty"
              icon={FolderOpen}
              title={
                projects.ok
                  ? "Your creative workspace starts here."
                  : "Projects are unavailable."
              }
              text={
                projects.ok
                  ? "Upload your first long-form video and discover the clips hidden inside it."
                  : "We couldn’t load your recent projects. You can still start a local draft."
              }
              action={
                <Action href="/projects/new" variant="secondary" arrow={false}>
                  <Plus size={16} aria-hidden="true" />
                  {projects.ok
                    ? "Create Your First Project"
                    : "Start a Project"}
                </Action>
              }
            />
          )}
        </section>
        <section className="dash-credits" aria-labelledby="dash-credits-title">
          <header className="dash-section-head">
            <div>
              <h2 id="dash-credits-title">Credits &amp; Activity</h2>
              <p>Keep track of usage and purchases.</p>
            </div>
            <IconTile icon={Coins} />
          </header>
          <div className="dash-reserved">
            <span>Reserved credits</span>
            <strong>
              {balance.ok
                ? creditsText(balance.value.reserved)
                : "Not connected"}
            </strong>
          </div>
          <h3 className="dash-activity-title">Recent credit activity</h3>
          {activity.ok && activity.value.items.length ? (
            <ul className="dash-timeline" role="list">
              {activity.value.items.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <span>
                    {item.kind === "purchase"
                      ? `Purchase · ${item.paymentState}`
                      : `Credits ${item.kind}`}
                  </span>
                  <time dateTime={item.createdAt}>
                    {dateText(item.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-activity-note">
              <History size={16} aria-hidden="true" />
              {activity.ok
                ? "No recent transactions yet."
                : "Credit activity is unavailable."}
            </p>
          )}
          <WorkspaceIssue result={activity} />
          <div className="actions dash-credit-actions">
            <Action href="/credits#credit-packs" arrow={false}>
              Buy Credits
            </Action>
            <Action href="/credits/history" variant="secondary" arrow={false}>
              View Credit History
            </Action>
          </div>
        </section>
      </div>
    </div>
  );
}
