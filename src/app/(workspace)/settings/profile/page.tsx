import { UserRound } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import {
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceIssue,
  MediaImage,
} from "@/components/workspace/ui";
import { ProfileForm } from "@/components/workspace/settings-forms";
import { getProfile } from "@/services/workspace-server";
export const metadata = { title: "Profile" };
export default async function Profile() {
  const result = await getProfile();
  return (
    <>
      <WorkspaceHeading
        label="SETTINGS"
        title="Profile"
        description="View your account avatar and manage your display name."
      />
      <WorkspaceIssue result={result} />
      {result.ok ? (
        <section className="ws-panel ws-form-panel">
          <div className="ws-profile-badge">
            <span className="ws-avatar">
              {result.value.avatarUrl ? (
                <MediaImage src={result.value.avatarUrl} />
              ) : (
                <UserRound aria-hidden="true" />
              )}
            </span>
            <div>
              <strong>Account avatar</strong>
              <p>
                {result.value.avatarUrl
                  ? "Current profile image"
                  : "No profile image set"}
              </p>
            </div>
          </div>
          <ProfileForm profile={result.value} />
        </section>
      ) : (
        <WorkspaceEmpty
          icon={UserRound}
          title="Profile editing isn’t connected"
          text="Your name, sign-in email and avatar are only shown when a verified account is available."
          action={
            <Action href="/settings" variant="secondary">
              Back to settings
            </Action>
          }
        />
      )}
    </>
  );
}
