import { ArrowLeft, Search } from "lucide-react";
import Footer from "../components/Footer";
import { LogoMark } from "../components/Logo";
import { MLink, Seo } from "../seo/Seo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas p-3 sm:p-5">
      <Seo
        title="Page not found — Zybble"
        description="The page you're looking for doesn't exist. Explore Zybble's features, pricing or blog instead."
        path="/404"
        robots="noindex, follow"
      />
      <header className="mx-auto mt-1 w-full max-w-[1120px] px-1 sm:mt-2 sm:px-2">
        <div className="flex h-[54px] items-center rounded-2xl border border-black/[0.06] bg-white/90 px-4 shadow-[0_1px_2px_rgba(20,18,15,0.04)] backdrop-blur-md">
          <MLink to="/" aria-label="Zybble home" className="inline-flex items-center gap-2.5">
            <LogoMark className="h-[26px] w-[26px]" />
            <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-neutral-950">
              Zybble
            </span>
          </MLink>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="text-center">
          <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            <Search className="h-3.5 w-3.5" /> 404
          </p>
          <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-950">
            This page isn't a lead.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-relaxed text-neutral-500">
            The page you're looking for doesn't exist or was moved. Here's where
            to go instead.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <MLink
              to="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-950 px-5 text-[13.5px] font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </MLink>
            <MLink
              to="/features"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 text-[13.5px] font-medium text-neutral-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-400"
            >
              Explore features
            </MLink>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] font-medium">
            <MLink to="/pricing" className="text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline">
              Pricing
            </MLink>
            <MLink to="/blog" className="text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline">
              Blog
            </MLink>
            <MLink to="/about" className="text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline">
              About
            </MLink>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
