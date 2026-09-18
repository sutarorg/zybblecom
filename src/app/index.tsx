import { useEffect, useState } from "react";
import { isConfigured, supabase } from "./lib/remote";
import { noindexApp } from "../seo/Seo";
import AuthPage from "./pages/auth";
import BillingPage from "./pages/billing";
import CampaignsPage from "./pages/campaigns";
import Dashboard from "./pages/dashboard";
import FindLeads from "./pages/find";
import LeadDetail from "./pages/lead-detail";
import LeadsPage from "./pages/leads";
import SettingsPage from "./pages/settings";
import UnsubscribePage from "./pages/unsubscribe";
import Shell from "./ui/shell";
import { Toaster } from "./ui/kit";

export function useHashRoute(): string {
  const [hash, setHash] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.hash.replace(/^#/, "") || "/"
  );
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

const PAGE_META: Record<string, { title: string }> = {
  "/app/dashboard": { title: "Dashboard" },
  "/app/find": { title: "Find Leads" },
  "/app/leads": { title: "Leads" },
  "/app/campaigns": { title: "Campaigns" },
  "/app/billing": { title: "Billing" },
  "/app/settings": { title: "Settings" },
};

export default function ZybbleApp({ route }: { route: string }) {
  const [auth, setAuth] = useState<{ checked: boolean; userId: string | null }>({
    checked: false,
    userId: null,
  });

  // The authenticated app is never indexable.
  useEffect(() => {
    noindexApp();
  }, []);

  useEffect(() => {
    if (!isConfigured()) {
      setAuth({ checked: true, userId: null });
      return;
    }
    void supabase()
      .auth.getSession()
      .then(({ data }) => setAuth({ checked: true, userId: data.session?.user.id ?? null }));

    const { data } = supabase().auth.onAuthStateChange((event, session) => {
      setAuth({ checked: true, userId: session?.user.id ?? null });
      if (event === "SIGNED_IN") {
        const hash = window.location.hash;
        // Magic-link and OAuth redirects land on the public routes.
        if (!hash.startsWith("#/app")) window.location.hash = "#/app/dashboard";
      }
      if (event === "PASSWORD_RECOVERY") window.location.hash = "#/reset";
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Public routes
  if (
    route.startsWith("/login") ||
    route.startsWith("/signup") ||
    route.startsWith("/forgot") ||
    route.startsWith("/reset")
  ) {
    return (
      <>
        <AuthPage route={route} />
        <Toaster />
      </>
    );
  }
  if (route.startsWith("/unsubscribe")) {
    return <UnsubscribePage route={route} />;
  }

  if (!auth.checked) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  if (!auth.userId) {
    // Protected-route guard.
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.hash = "#/login";
      }, 0);
    }
    return null;
  }

  const userId = auth.userId;
  const path = route.split("?")[0];
  const clean = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;

  let page: React.ReactNode;
  let title = PAGE_META[clean]?.title ?? "Dashboard";
  let actions: React.ReactNode = null;

  if (clean.startsWith("/app/leads/")) {
    title = "Lead";
    page = <LeadDetail userId={userId} leadId={clean.split("/app/leads/")[1]} />;
  } else if (clean.startsWith("/app/find")) {
    page = <FindLeads userId={userId} />;
  } else if (clean.startsWith("/app/leads")) {
    page = <LeadsPage userId={userId} />;
  } else if (clean.startsWith("/app/campaigns")) {
    title = clean === "/app/campaigns" ? "Campaigns" : "Campaign";
    page = <CampaignsPage userId={userId} route={route} />;
  } else if (clean.startsWith("/app/billing")) {
    page = <BillingPage userId={userId} />;
  } else if (clean.startsWith("/app/settings")) {
    page = <SettingsPage userId={userId} />;
  } else {
    page = <Dashboard userId={userId} />;
    actions = (
      <a
        href="#/app/find"
        className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-neutral-950 px-3.5 text-[12.5px] font-medium text-white shadow-sm transition-colors hover:bg-neutral-800"
      >
        Find leads
      </a>
    );
  }

  return (
    <Shell userId={userId} route={clean} title={title} actions={actions}>
      {page}
    </Shell>
  );
}
