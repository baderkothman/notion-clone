import { Check, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import type { AutosaveStatus } from "@notion-clone/editor";

export function AutosaveIndicator({ status, onReload }: { status: AutosaveStatus; onReload?: () => void }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-text-faint">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-text-faint">
        <Check className="size-3" /> Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle className="size-3" /> Couldn&apos;t save
      </span>
    );
  }
  if (status === "conflict") {
    return (
      <button onClick={onReload} className="flex items-center gap-1 text-xs text-destructive hover:underline">
        <RefreshCw className="size-3" /> Newer version available — reload
      </button>
    );
  }
  return null;
}
