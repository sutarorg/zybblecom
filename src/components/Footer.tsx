import Logo from "./Logo";

const COLUMNS: { title: string; links: string[] }[] = [
  {
    title: "Product",
    links: ["Lead finder", "AI research", "AI scoring", "Email writer", "Sequences"],
  },
  {
    title: "Resources",
    links: ["Blog", "Guides", "Help center", "API docs", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact", "Press"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "DPA"],
  },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L2.8 2h6.4l4.4 5.9 5.3-5.9zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z" />
    </svg>
  );
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function GitHubGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.05.78 2.13v3.16c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer id="resources" className="relative z-10 scroll-mt-16">
      <div className="mx-auto max-w-[1120px] px-6 pb-10 pt-16 sm:pt-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(4,1fr)] md:gap-8">
          {/* Brand */}
          <div>
            <Logo />
            <p className="mt-5 max-w-[250px] text-[13px] leading-relaxed text-neutral-500">
              Find, understand and reach the businesses that need you — in one
              simple platform.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/60 px-3 py-1.5 text-[11.5px] font-medium text-neutral-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              All systems operational
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[13.5px] text-neutral-600 transition-colors hover:text-neutral-950"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-black/[0.06] pt-7">
          <p className="text-[12px] text-neutral-400">
            © 2026 Zybble, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            {[
              { icon: <XIcon className="h-3.5 w-3.5" />, label: "Zybble on X" },
              { icon: <LinkedInGlyph className="h-3.5 w-3.5" />, label: "Zybble on LinkedIn" },
              { icon: <GitHubGlyph className="h-4 w-4" />, label: "Zybble on GitHub" },
            ].map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-black/[0.04] hover:text-neutral-900"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
