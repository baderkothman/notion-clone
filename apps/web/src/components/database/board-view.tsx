"use client";

import * as React from "react";
import { ExternalLink, File, Plus } from "lucide-react";
import { cn } from "@notion-clone/ui";
import type { SelectOption } from "@notion-clone/contracts";
import type { DatabaseProperty, DatabaseRow } from "./types";
import { selectOptions } from "./types";
import { PropertyCell, type WorkspaceMemberOption } from "./property-cell";
import { OptionPill } from "./select-editor";

const BOARD_DRAG_MIME = "application/x-notion-clone-board-card";

// Board cards don't support creating new select/status options inline (unlike the table's
// property-header editor) — this stub keeps `PropertyCell` happy either way. Module
// scope, not recreated per card/render, so it never breaks BoardCard's memoization.
async function createBoardCardOption(name: string): Promise<SelectOption> {
  return { id: crypto.randomUUID(), name, color: "gray" };
}

/** One card in a board column, memoized so editing a single card's property only
 * re-renders that card. Mirrors TableRow's approach in table-view.tsx: `values` is a
 * direct lookup into `valueIndex` (stable per-row unless that row's own data changed) and
 * `cardProperties` is memoized in the parent. */
const BoardCard = React.memo(function BoardCard({
  row,
  cardProperties,
  values,
  onSetValue,
  onOpenRow,
  members,
  workspaceId,
  draggable,
  onCardDragStart,
  onCardDragEnd,
  isDragging,
}: {
  row: DatabaseRow;
  cardProperties: DatabaseProperty[];
  values: Map<string, unknown> | undefined;
  onSetValue: (rowId: string, propertyId: string, value: unknown) => void;
  onOpenRow: (rowId: string) => void;
  members: WorkspaceMemberOption[];
  workspaceId: string;
  draggable: boolean;
  onCardDragStart: (rowId: string) => void;
  onCardDragEnd: () => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(BOARD_DRAG_MIME, row.id);
        e.dataTransfer.effectAllowed = "move";
        onCardDragStart(row.id);
      }}
      onDragEnd={onCardDragEnd}
      className={cn(
        "group rounded-md border border-border bg-surface-raised p-2.5 hover:border-border-strong",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="shrink-0 text-text-faint">{row.icon ?? <File className="size-3.5" />}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{row.title || "Untitled"}</span>
        <button
          onClick={() => onOpenRow(row.id)}
          aria-label="Open page"
          className="shrink-0 text-text-faint opacity-100 hover:text-text sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <ExternalLink className="size-3.5" />
        </button>
      </div>
      {cardProperties.map((property) => (
        <div key={property.id} className="-mx-1 text-xs">
          <PropertyCell
            property={property}
            value={values?.get(property.id) ?? null}
            onChange={(value) => onSetValue(row.id, property.id, value)}
            onCreateOption={createBoardCardOption}
            members={members}
            workspaceId={workspaceId}
            rowPageId={row.id}
            variant="board"
          />
        </div>
      ))}
    </div>
  );
});

/** Groups rows into columns by a select/status property's options, plus one "No
 * <property>" column for rows that haven't set it. Cards show every non-title property
 * so the board stays useful without needing a separate per-card detail view. */
export function BoardView({
  properties,
  rows,
  valueIndex,
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
  valueIndex: Map<string, Map<string, unknown>>;
  onSetValue: (rowId: string, propertyId: string, value: unknown) => void;
  groupByPropertyId: string | null;
  onAddRow: () => void;
  onOpenRow: (rowId: string) => void;
  members: WorkspaceMemberOption[];
  workspaceId: string;
  editable: boolean;
}) {
  const groupProperty = properties.find((p) => p.id === groupByPropertyId);
  // Memoized for the same reason as TableView's `otherProperties` — a fresh array here on
  // every render would defeat BoardCard's memoization for every card, every time.
  const cardProperties = React.useMemo(
    () => properties.filter((p) => p.type !== "title" && p.id !== groupByPropertyId),
    [properties, groupByPropertyId],
  );
  const [draggingRowId, setDraggingRowId] = React.useState<string | null>(null);
  // `undefined` = not hovering any column right now; `null` is itself a real column id
  // (the "No <property>" column, for rows that haven't set this property), so it can't
  // double as the "nothing" sentinel the way it could for a simpler list.
  const [dragOverColumnId, setDragOverColumnId] = React.useState<string | null | undefined>(undefined);

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
          const value = valueIndex.get(row.id)?.get(groupProperty.id);
          return column.id === null ? !value : value === column.id;
        });
        return (
          <div
            key={column.id ?? "none"}
            className={cn(
              "w-64 shrink-0 rounded-lg p-1 transition-colors",
              editable && draggingRowId && dragOverColumnId === column.id ? "bg-selected" : "",
            )}
            onDragOver={(e) => {
              if (!editable || !draggingRowId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverColumnId !== column.id) setDragOverColumnId(column.id);
            }}
            onDragLeave={(e) => {
              // Only clear if the pointer actually left this column, not just moved
              // between two child elements inside it (which also fires dragleave).
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverColumnId((current) => (current === column.id ? undefined : current));
              }
            }}
            onDrop={(e) => {
              if (!editable) return;
              e.preventDefault();
              const draggedRowId = e.dataTransfer.getData(BOARD_DRAG_MIME);
              setDragOverColumnId(undefined);
              setDraggingRowId(null);
              if (!draggedRowId) return;
              const currentValue = valueIndex.get(draggedRowId)?.get(groupProperty.id) ?? null;
              if (currentValue === column.id) return; // already in this column
              onSetValue(draggedRowId, groupProperty.id, column.id);
            }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              {column.label}
              <span className="text-xs text-text-faint">{columnRows.length}</span>
            </div>
            <div className="space-y-2">
              {columnRows.map((row) => (
                <BoardCard
                  key={row.id}
                  row={row}
                  cardProperties={cardProperties}
                  values={valueIndex.get(row.id)}
                  onSetValue={onSetValue}
                  onOpenRow={onOpenRow}
                  members={members}
                  workspaceId={workspaceId}
                  draggable={editable}
                  onCardDragStart={setDraggingRowId}
                  onCardDragEnd={() => {
                    setDraggingRowId(null);
                    setDragOverColumnId(undefined);
                  }}
                  isDragging={draggingRowId === row.id}
                />
              ))}
              {editable ? (
                <button
                  onClick={() => onAddRow()}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-text-faint hover:bg-hover"
                >
                  <Plus className="size-3.5" /> New
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
