import { motion, type Variants } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import OrbitVisual from "./OrbitVisual";
import TrustRow from "./TrustRow";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.25 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero() {
  return (
    <>
      <motion.header
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-30 mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 text-center sm:pt-24"
      >
        {/* Trust indicator */}
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-600 shadow-[0_1px_2px_rgba(20,18,15,0.04)]">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            AI-powered lead generation
            <span className="hidden text-neutral-300 sm:inline">·</span>
            <span className="hidden font-medium text-neutral-400 sm:inline">
              Find. Understand. Reach.
            </span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="mt-8 font-display text-[clamp(2.85rem,7.2vw,5.375rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-neutral-950"
        >
          Find the businesses
          <br />
          <span className="relative inline-block">
            that need you.
            <svg
              aria-hidden="true"
              className="absolute -bottom-[0.1em] left-0 h-[0.13em] w-full text-indigo-300/90"
              viewBox="0 0 300 12"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M3 9C80 3.5 220 3.5 297 8"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={item}
          className="mt-7 max-w-[600px] text-[17px] leading-[1.7] text-neutral-500 sm:text-lg"
        >
          Find, enrich and reach your next customers with one simple
          AI-powered platform.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={item}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <a
            href="#/signup"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5.5 text-[13.5px] font-medium text-white shadow-[0_1px_2px_rgba(20,18,15,0.25),0_12px_28px_-10px_rgba(20,18,15,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-[0_2px_4px_rgba(20,18,15,0.2),0_18px_36px_-12px_rgba(20,18,15,0.45)]"
          >
            Start for free
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#solutions"
            className="group inline-flex h-11 items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-5 text-[13.5px] font-medium text-neutral-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-400 hover:bg-neutral-50"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-neutral-300 text-neutral-500 transition-colors group-hover:border-neutral-400 group-hover:text-neutral-800">
              <Play className="ml-px h-2 w-2 fill-current" />
            </span>
            See how it works
          </a>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-5 text-[12px] font-medium text-neutral-400"
        >
          Free plan included · No credit card required
        </motion.p>
      </motion.header>

      <OrbitVisual />

      {/* Conceptual ecosystem label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.6 }}
        className="relative z-30 mt-3 flex items-center justify-center gap-3 px-6"
      >
        <span className="h-px w-8 bg-neutral-200" />
        <p className="text-[12px] font-medium tracking-[0.02em] text-neutral-400">
          Works with your workflow
        </p>
        <span className="h-px w-8 bg-neutral-200" />
      </motion.div>

      <TrustRow />
    </>
  );
}
