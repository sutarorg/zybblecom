import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import Hero from "./components/hero/Hero";
import Navbar from "./components/Navbar";
import Pricing from "./components/Pricing";
import Showcase from "./components/showcase/Showcase";
import Workflow from "./components/Workflow";
import { Seo, usePathname } from "./seo/Seo";
import { isConfigured } from "./app/lib/remote";
import React from "react";

const ZybbleApp = React.lazy(() => import("./app/index"));
const AboutPage = React.lazy(() => import("./marketing/AboutPage"));
const BlogIndex = React.lazy(() => import("./marketing/BlogPages").then(({ BlogIndex }) => ({ default: BlogIndex })));
const ArticleDetail = React.lazy(() => import("./marketing/BlogPages").then(({ ArticleDetail }) => ({ default: ArticleDetail })));
const FeaturesIndex = React.lazy(() => import("./marketing/FeaturesPages").then(({ FeaturesIndex }) => ({ default: FeaturesIndex })));
const FeatureDetail = React.lazy(() => import("./marketing/FeaturesPages").then(({ FeatureDetail }) => ({ default: FeatureDetail })));
const PrivacyPage = React.lazy(() => import("./marketing/LegalPages").then(({ PrivacyPage }) => ({ default: PrivacyPage })));
const TermsPage = React.lazy(() => import("./marketing/LegalPages").then(({ TermsPage }) => ({ default: TermsPage })));
const NotFound = React.lazy(() => import("./marketing/NotFound"));
const PricingPage = React.lazy(() => import("./marketing/PricingPage"));

function useHashRoute(): string {
  const [hash, setHash] = React.useState(() => window.location.hash.replace(/^#/, "") || "/");
  React.useEffect(() => {
    const onChange = () => setHash(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

const SHEET =
  "relative rounded-[24px] border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(20,18,15,0.03),0_40px_90px_-40px_rgba(23,20,15,0.14)] sm:rounded-[28px]";

function isAppRoute(route: string): boolean {
  return (
    route.startsWith("/app") ||
    route.startsWith("/login") ||
    route.startsWith("/signup") ||
    route.startsWith("/forgot") ||
    route.startsWith("/reset") ||
    route.startsWith("/unsubscribe")
  );
}

const HOME_SEO = {
  title: "AI Lead Generation & B2B Prospecting Software | Zybble",
  description:
    "Zybble helps B2B teams find businesses, enrich public data, verify emails and automate thoughtful sales prospecting with AI.",
  path: "/",
};

export function Landing() {
  return (
    <div
      id="top"
      className="flex min-h-screen flex-col gap-3 p-3 sm:gap-5 sm:p-5"
    >
      <Seo {...HOME_SEO} />

      {/* Subtle film grain over the whole experience */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ——— Hero sheet ——— */}
      <main className={`${SHEET} overflow-hidden`}>
        <Navbar />
        <Hero />
      </main>

      {/* ——— Content sheet ——— */}
      <div className={`${SHEET} overflow-hidden`}>
        <div id="workflow">
          <Workflow />
        </div>
        <Showcase />
        <Pricing />
        <FinalCTA />
      </div>

      <Footer />
    </div>
  );
}

export function MarketingRouter({ path }: { path: string }) {
  if (path === "/") return <Landing />;

  let page: React.ReactNode;
  if (path === "/pricing") page = <PricingPage />;
  else if (path === "/features") page = <FeaturesIndex />;
  else if (path.startsWith("/features/")) page = <FeatureDetail path={path} />;
  else if (path === "/blog") page = <BlogIndex />;
  else if (path.startsWith("/blog/")) page = <ArticleDetail path={path} />;
  else if (path === "/about") page = <AboutPage />;
  else if (path === "/privacy") page = <PrivacyPage />;
  else if (path === "/terms") page = <TermsPage />;
  else page = <NotFound />;

  return (
    <React.Suspense
      fallback={<div className="min-h-screen bg-canvas" aria-label="Loading page" />}
    >
      {page}
    </React.Suspense>
  );
}

export default function App() {
  const hashRoute = useHashRoute();
  const pathname = usePathname();

  // The authenticated product continues to live behind hash routes.
  if (isAppRoute(hashRoute)) {
    const privateMeta = (
      <Seo
        title="Zybble app"
        description="Private Zybble workspace. Sign in to access your leads and campaigns."
        path="/"
        robots="noindex, nofollow, noarchive, nosnippet"
      />
    );
    if (!isConfigured()) {
      return (
        <>
          {privateMeta}
          <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
          <div className="max-w-md">
            <h1 className="font-display text-2xl font-semibold text-neutral-950">
              Zybble is temporarily unavailable
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              The production backend is not configured. No local or simulated
              data has been used. Please contact support or try again shortly.
            </p>
            <a
              href="mailto:hello@zybble.com"
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white"
            >
              Contact support
            </a>
          </div>
          </div>
        </>
      );
    }
    return (
      <>
        {privateMeta}
        <React.Suspense
          fallback={
            <div className="grid min-h-screen place-items-center bg-canvas">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            </div>
          }
        >
          <ErrorBoundary>
            <ZybbleApp route={hashRoute} />
          </ErrorBoundary>
        </React.Suspense>
      </>
    );
  }

  // Everything else: real, crawlable, indexable marketing URLs.
  const clean = pathname.replace(/\/+$/, "") || "/";
  return <MarketingRouter path={clean} />;
}

// ————————————————————————————————————————————————————————————
// Error boundary — catches unhandled rendering errors so the app
// shows a recoverable message instead of a blank screen.
// ————————————————————————————————————————————————————————————

interface EBProps {
  children: React.ReactNode;
}
interface EBState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error.message || "An unexpected error occurred." };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Zybble error boundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
          <div className="max-w-md">
            <h1 className="font-display text-xl font-semibold text-neutral-950">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              {this.state.message}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: "" });
                window.location.hash = "#/app/dashboard";
              }}
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
