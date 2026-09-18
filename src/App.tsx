import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import Hero from "./components/hero/Hero";
import Navbar from "./components/Navbar";
import Pricing from "./components/Pricing";
import Showcase from "./components/showcase/Showcase";
import Workflow from "./components/Workflow";
const ZybbleApp = lazy(() => import("./app/index"));
import AboutPage from "./marketing/AboutPage";
import { ArticleDetail, BlogIndex } from "./marketing/BlogPages";
import { FeatureDetail, FeaturesIndex } from "./marketing/FeaturesPages";
import { PrivacyPage, TermsPage } from "./marketing/LegalPages";
import NotFound from "./marketing/NotFound";
import PricingPage from "./marketing/PricingPage";
import { Seo, usePathname } from "./seo/Seo";
import { isConfigured } from "./app/lib/config";
import React, { lazy, Suspense } from "react";

const SHEET =
  "relative rounded-[24px] border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(20,18,15,0.03),0_40px_90px_-40px_rgba(23,20,15,0.14)] sm:rounded-[28px]";

function useHashRoute(): string {
  const [hash, setHash] = React.useState(() =>
    typeof window === "undefined" ? "/" : window.location.hash.replace(/^#/, "") || "/"
  );
  React.useEffect(() => {
    const onChange = () => setHash(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

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
  title: "Zybble — Find the businesses that need you",
  description:
    "Zybble is an AI-powered lead generation platform that helps you find, enrich and reach your next customers. Start with 100 free leads each month.",
  path: "/",
  jsonld: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://zybble.com/#software",
    name: "Zybble",
    url: "https://zybble.com/",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Lead generation software",
    operatingSystem: "Web",
    description:
      "AI-powered lead generation and outreach platform for finding, enriching, researching, scoring and contacting businesses.",
    creator: { "@id": "https://zybble.com/#org" },
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Growth", price: "49", priceCurrency: "USD" },
      { "@type": "Offer", name: "Agency", price: "129", priceCurrency: "USD" },
    ],
  },
};

function Landing() {
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
      <main id="main-content" className={`${SHEET} overflow-hidden`}>
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
  if (path === "/pricing") return <PricingPage />;
  if (path === "/features") return <FeaturesIndex />;
  if (path.startsWith("/features/")) return <FeatureDetail path={path} />;
  if (path === "/blog") return <BlogIndex />;
  if (path.startsWith("/blog/")) return <ArticleDetail path={path} />;
  if (path === "/about") return <AboutPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  return <NotFound />;
}

export default function App() {
  const hashRoute = useHashRoute();
  const pathname = usePathname();

  // The authenticated product continues to live behind hash routes. Treating
  // direct auth paths the same way prevents accidental indexable 200 pages
  // when a user lands on /login or /signup without a hash.
  const directAppPath = isAppRoute(pathname) ? pathname : "";
  const appRoute = isAppRoute(hashRoute) ? hashRoute : directAppPath;
  if (appRoute) {
    if (!isConfigured()) {
      return (
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
      );
    }
    return (
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center bg-canvas" aria-label="Loading Zybble">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            </div>
          }
        >
          <ZybbleApp route={appRoute} />
        </Suspense>
      </ErrorBoundary>
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
