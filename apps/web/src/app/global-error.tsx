"use client";

/**
 * The App Router's last-resort error boundary — catches errors even the root layout
 * throws while rendering. It must render its own <html>/<body> since the root layout
 * (which normally provides them) is what may have failed. See docs/TESTING.md "Required
 * Application States" for where this fits alongside per-page error.tsx boundaries.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ color: "#6b6a67", marginTop: 4 }}>Please try again.</p>
            <button
              onClick={() => reset()}
              style={{ marginTop: 16, padding: "6px 14px", borderRadius: 6, border: "1px solid #d9d8d5", background: "#fff", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
