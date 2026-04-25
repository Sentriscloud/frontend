"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// DECISION: global-error must render its own html/body shell — Next.js bypasses the root layout
// when invoked. Keep it dependency-light so it renders even if app code is broken.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0C",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: "#94A3B8", marginBottom: 24, fontSize: 14 }}>
            An unexpected error occurred. The team has been notified.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "#8A5A11",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Reload page
          </button>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#64748B", marginTop: 16, fontFamily: "monospace" }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
