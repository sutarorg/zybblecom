import { Compass } from "lucide-react";
import { EmptyState } from "@/components/shared/page";
import { Action } from "@/components/ui/primitives";
export function NotFoundContent() {
  return (
    <section className="section">
      <div className="container">
        <h1 className="error-title">Page not found</h1>
        <EmptyState
          title="Let’s get you back on track"
          icon={Compass}
          action={<Action href="/">Back to Zybble</Action>}
        >
          This address doesn’t have a published page. Find the workflow,
          pricing, and resources from the homepage.
        </EmptyState>
      </div>
    </section>
  );
}
