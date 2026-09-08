import { LogoMark } from "@/components/logo";

export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="size-12 animate-pulse text-2xl" />
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Loading…</p>
      </div>
    </main>
  );
}
