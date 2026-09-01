"use client";

import * as React from "react";
import { ExternalLink, File, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@notion-clone/ui";
import type { SelectOption } from "@notion-clone/contracts";
import type { DatabaseProperty, DatabaseRow } from "./types";
import { PropertyCell, type WorkspaceMemberOption } from "./property-cell";

export function TableView({
  properties,
  rows,
  getValue,
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
  getValue: (rowId: string, propertyId: string) => unknown;
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
  const otherProperties = properties.filter((p) => p.type !== "title");

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="min-w-[220px] border-r border-border px-2 py-1.5 text-left font-medium text-text-muted">
              {titleProperty?.name ?? "Name"}
            </th>
            {otherProperties.map((property) => (
              <th key={property.id} className="min-w-[160px] border-r border-border px-0 py-0 text-left font-medium text-text-muted">
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
                          className="w-full rounded border border-border bg-surface px-1.5 py-1 text-sm outline-none"
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
            <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-hover/40">
              <td className="group border-r border-border px-2 py-0">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-text-faint">{row.icon ?? <File className="h-3.5 w-3.5" />}</span>
                  <input
                    defaultValue={row.title}
                    onBlur={(e) => e.target.value !== row.title && onTitleChange(row.id, e.target.value)}
                    placeholder="Untitled"
                    disabled={!editable}
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-text outline-none"
                  />
                  <button
                    onClick={() => onOpenRow(row.id)}
                    aria-label="Open page"
                    className="hidden shrink-0 rounded p-1 text-text-faint hover:bg-hover group-hover:block"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
              {otherProperties.map((property) => (
                <td key={property.id} className="border-r border-border p-0">
                  <PropertyCell
                    property={property}
                    value={getValue(row.id, property.id)}
                    onChange={(value) => onSetValue(row.id, property.id, value)}
                    onCreateOption={(name) => onCreateOption(property.id, name)}
                    members={members}
                    workspaceId={workspaceId}
                    rowPageId={row.id}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {editable ? (
        <button
          onClick={onAddRow}
          className="flex w-full items-center gap-1.5 px-2 py-2 text-left text-sm text-text-faint hover:bg-hover"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      ) : null}
    </div>
  );
}
