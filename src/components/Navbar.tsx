import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import Logo from "./Logo";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#resources" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-40 mx-auto mt-5 w-full max-w-[1120px] px-4 sm:px-6"
    >
      <nav
        aria-label="Primary"
        className="relative flex h-[54px] items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-white/90 pl-4 pr-2 shadow-[0_1px_2px_rgba(20,18,15,0.04),0_12px_32px_-16px_rgba(20,18,15,0.14)] backdrop-blur-md"
      >
        <Logo />

        {/* Center links */}
        <div className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-neutral-600 transition-colors duration-200 hover:bg-neutral-100/80 hover:text-neutral-950"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href="#/login"
            className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-neutral-600 transition-colors hover:text-neutral-950 sm:block"
          >
            Log in
          </a>
          <a
            href="#/signup"
            className="group inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-neutral-950 px-3.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(20,18,15,0.25)] transition-all duration-300 hover:bg-neutral-800"
          >
            Start for free
            <ArrowRight className="hidden h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 sm:block" />
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-black/[0.06] text-neutral-700 transition-colors hover:bg-neutral-50 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-[62px] rounded-2xl border border-black/[0.06] bg-white p-2 shadow-[0_24px_48px_-16px_rgba(20,18,15,0.2)] md:hidden"
            >
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-3 text-[14px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
                >
                  {l.label}
                  <ArrowUpRight className="h-3.5 w-3.5 text-neutral-300" />
                </a>
              ))}
              <div className="mt-1 border-t border-black/[0.05] pt-1">
                <a
                  href="#/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-3 text-[14px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
                >
                  Log in
                  <ArrowUpRight className="h-3.5 w-3.5 text-neutral-300" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.div>
  );
}
