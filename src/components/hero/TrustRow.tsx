import Reveal from "../Reveal";

const MARKS = [
  {
    label: "Modern SaaS",
    glyph: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <rect x="1.5" y="1.5" width="13" height="13" rx="6.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Growth Teams",
    glyph: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <path d="M2.5 13.5v-4M8 13.5v-8M13.5 13.5v-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Agencies",
    glyph: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <path d="M8 1.5 14.5 8 8 14.5 1.5 8 8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Founders",
    glyph: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <path d="M8 2.5 14 13.5H2L8 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Sales Teams",
    glyph: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <circle cx="5.5" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10.5" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "B2B Services",
    glyph: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function TrustRow() {
  return (
    <Reveal className="relative z-30 mx-auto max-w-4xl px-6 pb-16 pt-4 text-center sm:pb-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
        Built for modern sales teams
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {MARKS.map((m) => (
          <span
            key={m.label}
            className="flex items-center gap-2.5 text-neutral-300 transition-colors duration-300 hover:text-neutral-500"
          >
            {m.glyph}
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              {m.label}
            </span>
          </span>
        ))}
      </div>
    </Reveal>
  );
}
