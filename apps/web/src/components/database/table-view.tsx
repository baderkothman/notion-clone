"use client";

import * as React from "react";
import { ExternalLink, File, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@notion-clone/ui";
import type { SelectOption } from "@notion-clone/contracts";
import type { DatabaseProperty, DatabaseRow } from "./types";
import { PropertyCell, type WorkspaceMemberOption } from "./property-cell";

/** One row of the table, memoized so editing a single cell/title only re-renders that
 * row — not every other row in the table. This only pays off because every prop below is
 * kept reference-stable across unrelated re-renders: `values` is looked up straight out
 * of `valueIndex` (whose per-row Maps are only ever replaced for the row that actually
 * changed — see `handleSetValue` in database-view.tsx), `otherProperties` is memoized in
 * the parent, and the callback props are `useCallback`-wrapped there too. */
const TableRow = React.memo(function TableRow({
  row,
  otherProperties,
  values,
  onSetValue,
  onTitleChange,
  onCreateOption,
  onOpenRow,
  members,
  workspaceId,
  editable,
}: {
  row: DatabaseRow;
  otherProperties: DatabaseProperty[];
  values: Map<string, unknown> | undefined;
  onSetValue: (rowId: string, propertyId: string, value: unknown) => void;
  onTitleChange: (rowId: string, title: string) => void;
  onCreateOption: (propertyId: string, name: string) => Promise<SelectOption>;
  onOpenRow: (rowId: string) => void;
  members: WorkspaceMemberOption[];
  workspaceId: string;
  editable: boolean;
}) {
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-hover/40">
      <td className="group border-r border-border px-2 py-0">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-text-faint">{row.icon ?? <File className="size-3.5" />}</span>
          <input
            defaultValue={row.title}
            onBlur={(e) => e.target.value !== row.title && onTitleChange(row.id, e.target.value)}
            placeholder="Untitled"
            aria-label="Row title"
            disabled={!editable}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-text outline-none"
          />
          <button
            onClick={() => onOpenRow(row.id)}
            aria-label="Open page"
            className="shrink-0 rounded p-1 text-text-faint opacity-100 hover:bg-hover sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <ExternalLink className="size-3.5" />
          </button>
        </div>
      </td>
      {otherProperties.map((property) => (
        <td key={property.id} className="border-r border-border p-0">
          <PropertyCell
            property={property}
            value={values?.get(property.id) ?? null}
            onChange={(value) => onSetValue(row.id, property.id, value)}
            onCreateOption={(name) => onCreateOption(property.id, name)}
            members={members}
            workspaceId={workspaceId}
            rowPageId={row.id}
          />
        </td>
      ))}
    </tr>
  );
});

export function TableView({
  properties,
  rows,
  valueIndex,
  onSetValue,
  onTitleChange,
  onCreateOption,
  onAddRow,
  onOpenRow,
  onRenameProperty,
  onDeleteProperty,
  members,
  workspaceId,
  editable,
}: {
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  valueIndex: Map<string, Map<string, unknown>>;
  onSetValue: (rowId: string, propertyId: string, value: unknown) => void;
  onTitleChange: (rowId: string, title: string) => void;
  onCreateOption: (propertyId: string, name: string) => Promise<SelectOption>;
  onAddRow: () => void;
  onOpenRow: (rowId: string) => void;
  onRenameProperty: (propertyId: string, name: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  members: WorkspaceMemberOption[];
  workspaceId: string;
  editable: boolean;
}) {
  const titleProperty = properties.find((p) => p.type === "title");
  // Memoized so its reference only changes when `properties` itself does — otherwise a
  // fresh array here on every render would defeat TableRow's memoization for every row,
  // every time (recreating this array is what a shallow-equality check on TableRow's
  // `otherProperties` prop would see as "changed" even when nothing about it did).
  const otherProperties = React.useMemo(() => properties.filter((p) => p.type !== "title"), [properties]);

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="min-w-[220px] border-r border-border px-2 py-1.5 text-left font-medium text-text-muted">
              {titleProperty?.name ?? "Name"}
            </th>
            {otherProperties.map((property) => (
              <th key={property.id} className="min-w-[160px] border-r border-border p-0 text-left font-medium text-text-muted">
                {editable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full px-2 py-1.5 text-left hover:bg-hover">{property.name}</button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <div className="px-2 py-1">
                        <input
                          defaultValue={property.name}
                          onBlur={(e) => e.target.value.trim() && onRenameProperty(property.id, e.target.value.trim())}
                          aria-label="Property name"
                          className="w-full rounded border border-border bg-surface px-1.5 py-1 text-base outline-none"
                        />
                      </div>
                      <DropdownMenuItem destructive onSelect={() => onDeleteProperty(property.id)}>
                        Delete property
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="block px-2 py-1.5">{property.name}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              otherProperties={otherProperties}
              values={valueIndex.get(row.id)}
              onSetValue={onSetValue}
              onTitleChange={onTitleChange}
              onCreateOption={onCreateOption}
              onOpenRow={onOpenRow}
              members={members}
              workspaceId={workspaceId}
              editable={editable}
            />
          ))}
        </tbody>
      </table>
      {editable ? (
        <button
          onClick={onAddRow}
          className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-sm text-text-faint hover:bg-hover"
        >
          <Plus className="size-3.5" /> New
        </button>
      ) : null}
    </div>
  );
}
