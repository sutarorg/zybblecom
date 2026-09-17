import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import Hero from "./components/hero/Hero";
import Navbar from "./components/Navbar";
import Pricing from "./components/Pricing";
import Showcase from "./components/showcase/Showcase";
import Workflow from "./components/Workflow";
import ZybbleApp, { useHashRoute } from "./app/index";
import AboutPage from "./marketing/AboutPage";
import { ArticleDetail, BlogIndex } from "./marketing/BlogPages";
import { FeatureDetail, FeaturesIndex } from "./marketing/FeaturesPages";
import { PrivacyPage, TermsPage } from "./marketing/LegalPages";
import NotFound from "./marketing/NotFound";
import PricingPage from "./marketing/PricingPage";
import { Seo, usePathname } from "./seo/Seo";
import { isConfigured } from "./app/lib/remote";

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
  title: "Zybble — Find the businesses that need you",
  description:
    "Zybble is the AI-powered lead generation platform that finds, enriches and researches your next customers — then helps you reach them. Free plan included.",
  path: "/",
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

function MarketingRouter({ path }: { path: string }) {
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

  // The authenticated product continues to live behind hash routes.
  if (isAppRoute(hashRoute)) {
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
    return <ZybbleApp route={hashRoute} />;
  }

  // Everything else: real, crawlable, indexable marketing URLs.
  const clean = pathname.replace(/\/+$/, "") || "/";
  return <MarketingRouter path={clean} />;
}
