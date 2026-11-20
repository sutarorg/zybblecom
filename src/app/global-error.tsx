"use client";
import "@/styles/globals.css";
import { ApplicationError } from "@/components/system/errors";
import { SystemLayout } from "@/components/system/system-shell";
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <SystemLayout>
          <ApplicationError retry={retry} />
        </SystemLayout>
      </body>
    </html>
  );
}
