import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@notion-clone/auth/edge";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/invite"];

function buildCsp(nonce: string, isProd: boolean): string {
  // Uploads PUT directly from the browser to the S3-compatible endpoint (presigned
  // URL) — its origin must be an allowed connect-src target alongside the app itself.
  const s3Origin = (() => {
    try {
      return process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : null;
    } catch {
      return null;
    }
  })();

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    `connect-src 'self' ws: wss: https:${isProd ? "" : " http:"}${s3Origin ? ` ${s3Origin}` : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Two jobs: (1) redirect unauthenticated requests away from protected routes — a UX
 * convenience only, never the authorization boundary (every server action/route
 * re-checks permissions; see src/server/permissions) — and (2) issue a per-request CSP
 * nonce so the theme-init inline script in app/layout.tsx can run under a strict
 * `script-src` with no 'unsafe-inline'.
 */
export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/share/");

  if (!req.auth && !isPublic) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }
  if (req.auth && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", buildCsp(nonce, process.env.NODE_ENV === "production"));
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
