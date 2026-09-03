import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@notion-clone/ui";
import "./globals.css";

// Marketing/auth-only typefaces — the product UI keeps the system-font stack (see
// globals.css). Scoped via CSS variables on <body> so loading them can't change how
// the app shell renders; only components that opt into `font-display` /
// `font-mono-brand` (landing, auth) pick them up.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--ff-display",
  display: "swap",
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--ff-mono-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Notion Clone",
  description: "A production-quality, self-hosted workspace for notes, docs, and collaboration.",
};

// Every route in this app is either the public landing page (which still branches on
// the request's session to redirect signed-in visitors), a static public page (About),
// an auth page, or requires a signed-in session — so there's no genuinely static page
// to prerender, and the root layout reads the per-request CSP nonce via `headers()`,
// which needs a real request context. Forcing
// dynamic rendering here (rather than letting Next try to statically prerender the
// automatic /404 and /500 pages around a layout that needs `headers()`) is what the app
// actually is, not a workaround.
export const dynamic = "force-dynamic";

/** Sets `.dark` on <html> before hydration to avoid a light/dark flash — reads the
 * user's stored preference (see components/theme-toggle.tsx) or falls back to the OS
 * setting. Inlined (not an external file) so it runs before first paint; the nonce
 * (issued per-request in src/middleware.ts) lets it run under a strict CSP with no
 * 'unsafe-inline'.
 *
 * The `<script>` element below carries its own `suppressHydrationWarning`, not just
 * `<html>`'s (that one doesn't cascade to descendants — it only covers `<html>`'s own
 * mismatch, the `.dark` class toggle). Browsers deliberately hide a `nonce` attribute
 * from JS attribute reads once it's applied (`getAttribute("nonce")` always returns
 * `""` afterward, by design — see the HTML spec's "nonce attribute" section), so
 * React's hydration diff always sees server `nonce="<real value>"` vs. client
 * `nonce=""` here, on every single request, regardless of anything actually being
 * wrong. It's not fixable by changing what value is passed in — only by telling React
 * this specific, unavoidable mismatch is expected. */
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
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
        <Toaster position="bottom-right" theme="system" />
      </body>
    </html>
  );
}
