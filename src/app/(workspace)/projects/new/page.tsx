import { notFound } from "next/navigation";
import { one, type Query } from "@/services/workspace-query";
import { NewProject } from "@/components/workspace/new-project";
import { WorkspaceHeading, WorkspaceIssue } from "@/components/workspace/ui";
import { getBalance, workspace } from "@/services/workspace-server";
export const metadata = { title: "New project" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const sourceId = one(await searchParams, "source", 128);
  const [policy, balance, preferences, source] = await Promise.all([
    workspace.run("getUploadPolicy"),
    getBalance(),
    workspace.run("getPreferences"),
    sourceId ? workspace.run("getProject", sourceId) : null,
  ]);
  if (
    source?.ok &&
    (source.value.project.status !== "uploaded" || !source.value.project.source)
  )
    notFound();
  if (source && !source.ok && source.error === "not_found") notFound();
  return (
    <div className="ws-studio ws-studio-create">
      <WorkspaceHeading
        label="CREATE"
        title="Create a new project"
        description="Choose your video, customize your shorts and let Zybble find your best moments."
      />
      <WorkspaceIssue result={policy} />
      {source && <WorkspaceIssue result={source} />}
      <NewProject
        existingProject={source?.ok ? source.value.project : undefined}
        policy={!sourceId && policy.ok ? policy.value : null}
        preferences={preferences.ok ? preferences.value : null}
        balance={balance.ok ? balance.value : null}
      />
    </div>
  );
}
