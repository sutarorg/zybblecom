"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { workspace } from "@/services/workspace";
import type { RefreshTopic } from "@/services/workspace-contracts";
/** The future private subscription only invalidates; UI reads authorized server snapshots. */
export function useWorkspaceRealtime(enabled: boolean, projectId?: string) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled || !workspace.subscribe) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const topics: readonly RefreshTopic[] = [
      "projects",
      "generation",
      "balance",
      "assets",
    ];
    const dispose = workspace.subscribe({ topics, projectId }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    });
    return () => {
      clearTimeout(timer);
      dispose();
    };
  }, [enabled, projectId, router]);
}
