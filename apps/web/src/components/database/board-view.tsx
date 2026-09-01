"use client";

import * as React from "react";
import { ExternalLink, File, Plus } from "lucide-react";
import type { DatabaseProperty, DatabaseRow } from "./types";
import { selectOptions } from "./types";
import { PropertyCell, type WorkspaceMemberOption } from "./property-cell";
import { OptionPill } from "./select-editor";

/** Groups rows into columns by a select/status property's options, plus one "No
 * <property>" column for rows that haven't set it. Cards show every non-title property
 * so the board stays useful without needing a separate per-card detail view. */
export function BoardView({
  properties,
  rows,
  getValue,
  onSetValue,
  groupByPropertyId,
  onAddRow,
  onOpenRow,
  members,
  workspaceId,
  editable,
}: {
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  getValue: (rowId: string, propertyId: string) => unknown;
  onSetValue: (rowId: string, propertyId: string, value: unknown) => void;
  groupByPropertyId: string | null;
  onAddRow: () => void;
  onOpenRow: (rowId: string) => void;
  members: WorkspaceMemberOption[];
  workspaceId: string;
  editable: boolean;
}) {
  const groupProperty = properties.find((p) => p.id === groupByPropertyId);
  const cardProperties = properties.filter((p) => p.type !== "title" && p.id !== groupByPropertyId);

  if (!groupProperty) {
    return (
      <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-text-muted">
        Pick a Select or Status property to group this board by.
      </p>
    );
  }

  const options = selectOptions(groupProperty);
  const columns: { id: string | null; label: React.ReactNode }[] = [
    ...options.map((o) => ({ id: o.id, label: <OptionPill option={o} /> })),
    { id: null, label: <span className="text-text-faint">No {groupProperty.name}</span> },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnRows = rows.filter((row) => {
          const value = getValue(row.id, groupProperty.id);
          return column.id === null ? !value : value === column.id;
        });
        return (
          <div key={column.id ?? "none"} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              {column.label}
              <span className="text-xs text-text-faint">{columnRows.length}</span>
            </div>
            <div className="space-y-2">
              {columnRows.map((row) => (
                <div key={row.id} className="group rounded-md border border-border bg-surface-raised p-2.5 hover:border-border-strong">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="shrink-0 text-text-faint">{row.icon ?? <File className="h-3.5 w-3.5" />}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{row.title || "Untitled"}</span>
                    <button
                      onClick={() => onOpenRow(row.id)}
                      aria-label="Open page"
                      className="hidden shrink-0 text-text-faint hover:text-text group-hover:block"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {cardProperties.map((property) => (
                    <div key={property.id} className="-mx-1 text-xs">
                      <PropertyCell
                        property={property}
                        value={getValue(row.id, property.id)}
                        onChange={(value) => onSetValue(row.id, property.id, value)}
                        onCreateOption={async (name) => ({ id: crypto.randomUUID(), name, color: "gray" })}
                        members={members}
                        workspaceId={workspaceId}
                        rowPageId={row.id}
                        variant="board"
                      />
                    </div>
                  ))}
                </div>
              ))}
              {editable ? (
                <button
                  onClick={async () => {
                    onAddRow();
                  }}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-text-faint hover:bg-hover"
                >
                  <Plus className="h-3.5 w-3.5" /> New
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
