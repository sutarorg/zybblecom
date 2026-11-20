"use client";
import { ApplicationError } from "@/components/system/errors";
export default function Error({ retry }: { retry: () => void }) {
  return <ApplicationError retry={retry} />;
}
