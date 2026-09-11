"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCourseAction } from "@/lib/actions/course";
import { cn } from "@/lib/utils";

export function NewCourseButton({ large = false }: { large?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await createCourseAction();
      if (result.ok) {
        router.refresh();
        router.push(`/dashboard/courses/${result.data.id}`);
      } else {
        setError(result.error);
        setPending(false);
      }
    } catch {
      setError("Couldn't create the course. Try again.");
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className={cn("btn btn-ink", large ? "btn-lg" : "btn-md")}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {large ? "Create your first course" : "New course"}
      </button>
      {error && <span className="text-[12.5px] font-medium text-rose">{error}</span>}
    </span>
  );
}
