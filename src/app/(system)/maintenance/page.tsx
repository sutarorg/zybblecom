import { connection } from "next/server";
import { Info } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { SystemPanel } from "@/components/system/system-shell";
import { ServiceUnavailable } from "@/components/system/unavailable";
import { pageMetadata } from "@/lib/seo/metadata";
export const metadata = pageMetadata(
  "/maintenance",
  "Service notices",
  "Check whether Zybble has posted a maintenance notice.",
  { noindex: true },
);
export default async function Maintenance() {
  await connection();
  if (process.env.ZYBBLE_MAINTENANCE === "1") return <ServiceUnavailable />;
  return (
    <SystemPanel
      icon={Info}
      label="SERVICE NOTICES"
      title="No maintenance notice is posted."
      description="If you’re having trouble with Zybble, look for guidance in the help centre."
    >
      <div className="actions system-actions">
        <Action href="/help">Visit help centre</Action>
        <Action href="/" variant="secondary">
          Back to homepage
        </Action>
      </div>
    </SystemPanel>
  );
}
