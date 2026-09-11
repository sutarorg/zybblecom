import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marketing/nav";

export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-paper px-4">
      <div className="hero-grid absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-10 font-display text-7xl italic tracking-tight text-grape sm:text-8xl">404</p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">This link leads nowhere.</h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-mut">
          The course may have been unpublished, renamed, or never existed. Double-check the URL you
          were given.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link href="/" className="btn btn-ink btn-md">
            <ArrowLeft className="size-4" /> Back to homepage
          </Link>
          <Link href="/learn" className="btn btn-outline btn-md">
            <Compass className="size-4" /> My learning
          </Link>
        </div>
      </div>
    </div>
  );
}
