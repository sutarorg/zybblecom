"use client";
import { useRouter } from "next/navigation";
import { FilePicker } from "./file-picker";
import { useLocalDraft } from "./shell";
export function DashboardPicker({ maxBytes }: { maxBytes?: number }) {
  const { setFile } = useLocalDraft();
  const router = useRouter();
  return (
    <FilePicker
      file={null}
      maxBytes={maxBytes}
      dashboard
      onFile={(file) => {
        if (file) {
          setFile(file);
          router.push("/projects/new");
        }
      }}
    />
  );
}
