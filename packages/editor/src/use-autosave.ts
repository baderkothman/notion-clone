"use client";

import * as React from "react";
import type { JSONContent } from "@tiptap/react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export interface AutosaveResult {
  ok: boolean;
  version?: number;
  error?: string;
  conflict?: boolean;
}

export interface UseAutosaveOptions {
  initialVersion: number;
  save: (content: JSONContent, expectedVersion: number) => Promise<AutosaveResult>;
  debounceMs?: number;
}

/**
 * Debounced autosave with optimistic-concurrency awareness. Every save carries the
 * version it believes the server is at; a "conflict" result (someone/something else
 * wrote a newer version — a second tab, for instance) stops autosave from retrying
 * blindly, since retrying would silently overwrite the newer content. The caller
 * surfaces `status === "conflict"` as a "reload to see the latest version" prompt rather
 * than the hook guessing how to merge.
 */
export function useAutosave({ initialVersion, save, debounceMs = 800 }: UseAutosaveOptions) {
  const [status, setStatus] = React.useState<AutosaveStatus>("idle");
  const versionRef = React.useRef(initialVersion);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = React.useRef<JSONContent | null>(null);
  const inFlightRef = React.useRef(false);
  const conflictedRef = React.useRef(false);

  const flush = React.useCallback(async () => {
    if (conflictedRef.current || inFlightRef.current) return;
    const content = pendingContentRef.current;
    if (content === null) return;
    pendingContentRef.current = null;

    inFlightRef.current = true;
    setStatus("saving");
    const result = await save(content, versionRef.current);
    inFlightRef.current = false;

    if (result.ok && result.version !== undefined) {
      versionRef.current = result.version;
      setStatus("saved");
      // A newer edit may have queued while this save was in flight.
      if (pendingContentRef.current !== null) void flush();
      return;
    }

    if (result.conflict) {
      conflictedRef.current = true;
      setStatus("conflict");
      return;
    }

    setStatus("error");
  }, [save]);

  const scheduleSave = React.useCallback(
    (content: JSONContent) => {
      if (conflictedRef.current) return;
      pendingContentRef.current = content;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => void flush(), debounceMs);
    },
    [debounceMs, flush],
  );

  const saveNow = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    return flush();
  }, [flush]);

  React.useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (pendingContentRef.current !== null || inFlightRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { status, scheduleSave, saveNow };
}
