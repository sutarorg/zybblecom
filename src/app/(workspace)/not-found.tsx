import { FolderSearch } from "lucide-react";
import { WorkspaceEmpty, WorkspaceHeading } from "@/components/workspace/ui";
import { Action } from "@/components/ui/primitives";
export default function Missing() {
  return (
    <>
      <WorkspaceHeading
        title="Media not found"
        description="The project or clip isn’t available."
      />
      <WorkspaceEmpty
        title="Check your library"
        text="This item may have been removed or may not belong to your workspace."
        icon={FolderSearch}
        action={<Action href="/projects">Go to projects</Action>}
      />
    </>
  );
}
