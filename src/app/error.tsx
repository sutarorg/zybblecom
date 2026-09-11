"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "@/components/marketing/nav";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4">
      <div className="text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-10 text-2xl font-semibold tracking-tight">Something went sideways.</h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-mut">
          An unexpected error occurred. Try again — if it keeps happening, let us know at
          support@zybble.com.
        </p>
        <button type="button" onClick={reset} className="btn btn-ink btn-md mt-7">
          <RotateCcw className="size-4" /> Try again
        </button>
      </div>
    </div>
  );
}
