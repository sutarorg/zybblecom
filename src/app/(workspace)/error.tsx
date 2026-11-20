"use client";
import { ApplicationError } from "@/components/system/errors";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <ApplicationError retry={reset} />;
}
