"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { File, Search } from "lucide-react";
import { cn } from "@notion-clone/ui";
import { searchAction } from "@/app/(app)/actions/search";
import type { SearchResult } from "@notion-clone/contracts";

export function CommandMenu({ workspaceId, workspaceSlug }: { workspaceId: string; workspaceSlug: string }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const result = await searchAction({ workspaceId, query });
      setLoading(false);
      if (result.ok) {
        setResults(result.value);
        setActiveIndex(0);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, workspaceId, open]);

  function navigateTo(pageId: string) {
    setOpen(false);
    router.push(`/w/${workspaceSlug}/p/${pageId}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigateTo(results[activeIndex]!.pageId);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left text-xs text-text-faint hover:bg-hover">
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="ml-auto rounded border border-border bg-surface px-1 font-sans text-[10px]">⌘K</kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-[var(--color-shadow)] data-[state=open]:animate-slide-down"
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Search pages</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search for a page by title or content within this workspace.
          </DialogPrimitive.Description>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="h-4 w-4 text-text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {loading ? (
              <p className="px-2 py-6 text-center text-sm text-text-faint">Searching…</p>
            ) : query.trim().length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-text-faint">Start typing to search this workspace.</p>
            ) : results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-text-faint">No results for &ldquo;{query}&rdquo;.</p>
            ) : (
              results.map((result, index) => (
                <button
                  key={result.pageId}
                  onClick={() => navigateTo(result.pageId)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                    index === activeIndex ? "bg-hover text-text" : "text-text-muted",
                  )}
                >
                  <span className="shrink-0">{result.icon ?? <File className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text">{result.title}</span>
                    {result.snippet ? (
                      <span className="block truncate text-xs text-text-faint">{result.snippet}</span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
