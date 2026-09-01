import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Static security headers for every route. Content-Security-Policy is intentionally
 * NOT set here — it's set per-request in src/middleware.ts with a fresh nonce so the
 * theme-init inline script can run under a strict `script-src` with no 'unsafe-inline'.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@notion-clone/contracts",
    "@notion-clone/database",
    "@notion-clone/auth",
    "@notion-clone/shared",
    "@notion-clone/ui",
    "@notion-clone/editor",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
