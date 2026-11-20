import { SlidersHorizontal } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceIssue,
} from "@/components/workspace/ui";
import { PreferencesForm } from "@/components/workspace/settings-forms";
import { workspace } from "@/services/workspace-server";
export const metadata = { title: "Preferences" };
export default async function Preferences() {
  const result = await workspace.run("getPreferences");
  return (
    <div className="ws-studio ws-studio-account ws-studio-preferences">
      <WorkspaceHeading
        label="SETTINGS"
        title="Creator Preferences"
        description="Set defaults for new projects without changing past exports."
      />
      <WorkspaceIssue result={result} />
      {result.ok ? (
        <section className="ws-panel ws-form-panel">
          <PreferencesForm value={result.value} />
        </section>
      ) : (
        <WorkspaceEmpty
          icon={SlidersHorizontal}
          title="Saved preferences aren’t connected"
          text="You can choose an aspect ratio and caption style when drafting a project. These choices apply only to that draft."
          action={
            <Action href="/projects/new" variant="secondary">
              Open project setup
            </Action>
          }
        />
      )}
    </div>
  );
}
