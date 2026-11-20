"use client";
import { ApplicationError } from "@/components/system/errors";
import { SystemLayout } from "@/components/system/system-shell";
export default function Error({ retry }: { retry: () => void }) {
  return (
    <SystemLayout>
      <ApplicationError retry={retry} />
    </SystemLayout>
  );
}
