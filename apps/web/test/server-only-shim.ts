// Vitest isn't Next.js's webpack build, which is what actually enforces "server-only"
// (by aliasing it to a throwing stub only in client bundles). Under plain Vitest every
// import of the real "server-only" package throws unconditionally, which would make any
// domain module using it untestable. This shim — aliased in vitest.integration.config.ts
// — is a no-op, the same role Next.js's own server bundle gives the package.
export {};
