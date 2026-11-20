"use client";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="ad-alert" role="alert">
      <CircleAlert size={22} aria-hidden="true" />
      <div>
        <h1>Couldn’t load this view</h1>
        <p>
          No action was confirmed. Refresh before trying an operation again.
        </p>
        <div className="ad-inline">
          <button
            type="button"
            className="ad-button ad-primary"
            onClick={reset}
          >
            Try again
          </button>
          <Link href="/admin" className="ad-button">
            Admin overview
          </Link>
        </div>
      </div>
    </div>
  );
}
