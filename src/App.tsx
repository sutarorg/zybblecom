import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import Hero from "./components/hero/Hero";
import Navbar from "./components/Navbar";
import Pricing from "./components/Pricing";
import Showcase from "./components/showcase/Showcase";
import Workflow from "./components/Workflow";
import ZybbleApp, { useHashRoute } from "./app/index";

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

export default function App() {
  const route = useHashRoute();

  // The product lives behind the landing page.
  if (isAppRoute(route)) {
    return <ZybbleApp route={route} />;
  }

  return (
    <div
      id="top"
      className="flex min-h-screen flex-col gap-3 p-3 sm:gap-5 sm:p-5"
    >
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
        <Workflow />
        <Showcase />
        <Pricing />
        <FinalCTA />
      </div>

      <Footer />
    </div>
  );
}
