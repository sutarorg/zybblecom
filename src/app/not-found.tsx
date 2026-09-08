import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <span className="grid size-14 place-items-center rounded-2xl bg-cream text-ink-soft">
        <Compass className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        This link wandered off. Course links look like zybble.com/c/your-course —
        check the URL and try again.
      </p>
      <Link href="/" className={buttonClasses("ink", "lg") + " mt-8"}>
        Back to Zybble
      </Link>
    </main>
  );
}
