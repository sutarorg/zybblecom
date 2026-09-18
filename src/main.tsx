import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Zybble] render failed", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      const msg = this.state.error.message.slice(0, 300);
      return (
        <div className="grid min-h-screen place-items-center bg-canvas px-6">
          <div className="max-w-md text-center">
            <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-neutral-950">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Zybble hit an unexpected error. A hard refresh fixes most of these.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white"
            >
              Reload
            </button>
            <pre className="mt-6 max-h-32 overflow-auto rounded-xl bg-neutral-100 p-4 text-left font-mono text-[11px] leading-relaxed text-neutral-500">
              {msg}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Analytics />
  </StrictMode>
);
