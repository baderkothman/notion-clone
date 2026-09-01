/**
 * A minimal Result type for operations where failure is an expected outcome
 * (not an exceptional one) — e.g. validation, permission checks surfaced to callers
 * that need to render an error state rather than catch an exception.
 *
 * Prefer throwing typed errors (see errors.ts) for authorization/domain invariants that
 * should never be silently swallowed. Use Result for user-facing operations (e.g. form
 * submissions) where the caller must branch on success/failure without a try/catch.
 */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
