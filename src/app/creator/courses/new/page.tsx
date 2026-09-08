import { requireUser } from "@/lib/auth";
import { CourseForm } from "@/components/course-form";

export const metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requireUser("/creator/courses/new");
  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 font-display text-xl font-bold">Create a course</h2>
      <p className="mb-6 text-sm text-ink-soft">
        It starts as a draft — publish whenever you&apos;re ready.
      </p>
      <CourseForm />
    </div>
  );
}
