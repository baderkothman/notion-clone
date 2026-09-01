import "server-only";
import { DomainError } from "@notion-clone/shared";

export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code?: string };

/**
 * Wraps a server action body so its result is always a plain, serializable
 * `{ ok, value } | { ok, error, code }` object instead of a thrown error. Next.js
 * redacts thrown server-action error messages in production by default (only a digest
 * reaches the client) — routing known DomainErrors through this instead of letting them
 * throw is how their user-facing messages ("You don't have permission…", "This page no
 * longer exists…") actually reach the UI. `code` (e.g. "CONFLICT") lets callers branch
 * on the failure kind without parsing message text — see packages/editor/src/use-autosave.ts.
 * Unexpected errors are logged server-side and reduced to a generic message, never
 * leaking internals to the client.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (error instanceof DomainError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
