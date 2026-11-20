"use client";
import { useRouter } from "next/navigation";
import { FilePicker } from "./file-picker";
import { useLocalDraft } from "./shell";
export function DashboardPicker({
  maxBytes,
  available,
}: {
  maxBytes?: number;
  available: number | null;
}) {
  const { setFile } = useLocalDraft();
  const router = useRouter();
  return (
    <FilePicker
      file={null}
      maxBytes={maxBytes}
      dashboard
      onBeforePick={() => {
        if (available !== 0) return true;
        router.push("/credits");
        return false;
      }}
      onFile={(file) => {
        if (file) {
          setFile(file);
          router.push("/projects/new");
        }
      }}
    />
  );
}
