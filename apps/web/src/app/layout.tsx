import type { Metadata } from "next";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { TooltipProvider } from "@notion-clone/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion Clone",
  description: "A production-quality, self-hosted workspace for notes, docs, and collaboration.",
};

// Every route in this app is either an auth page or requires a signed-in session, so
// there's no genuinely static page to prerender — and the root layout reads the
// per-request CSP nonce via `headers()`, which needs a real request context. Forcing
// dynamic rendering here (rather than letting Next try to statically prerender the
// automatic /404 and /500 pages around a layout that needs `headers()`) is what the app
// actually is, not a workaround.
export const dynamic = "force-dynamic";

/** Sets `.dark` on <html> before hydration to avoid a light/dark flash — reads the
 * user's stored preference (see components/theme-toggle.tsx) or falls back to the OS
 * setting. Inlined (not an external file) so it runs before first paint; the nonce
 * (issued per-request in src/middleware.ts) lets it run under a strict CSP with no
 * 'unsafe-inline'. */
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var isDark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
        <Toaster position="bottom-right" theme="system" />
      </body>
    </html>
  );
}
