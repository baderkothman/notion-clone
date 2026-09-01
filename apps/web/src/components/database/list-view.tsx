"use client";

import { File, Plus } from "lucide-react";
import type { DatabaseRow } from "./types";

export function ListView({
  rows,
  onAddRow,
  onOpenRow,
  editable,
}: {
  rows: DatabaseRow[];
  onAddRow: () => void;
  onOpenRow: (rowId: string) => void;
  editable: boolean;
}) {
  return (
    <div className="rounded-md border border-border">
      {rows.map((row) => (
        <button
          key={row.id}
          onClick={() => onOpenRow(row.id)}
          className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-hover"
        >
          <span className="shrink-0 text-text-faint">{row.icon ?? <File className="h-3.5 w-3.5" />}</span>
          <span className="truncate text-sm text-text">{row.title || "Untitled"}</span>
        </button>
      ))}
      {editable ? (
        <button
          onClick={onAddRow}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-text-faint hover:bg-hover"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      ) : null}
    </div>
  );
}
