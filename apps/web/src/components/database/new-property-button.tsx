"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@notion-clone/ui";
import { propertyTypes, type PropertyType } from "@notion-clone/contracts";

const TYPE_LABELS: Record<PropertyType, string> = {
  title: "Title",
  text: "Text",
  number: "Number",
  select: "Select",
  multi_select: "Multi-select",
  status: "Status",
  date: "Date",
  checkbox: "Checkbox",
  url: "URL",
  person: "Person",
  files: "Files",
};
const ADDABLE_PROPERTY_TYPES = propertyTypes.filter((type) => type !== "title");

export function NewPropertyButton({ onAdd }: { onAdd: (name: string, type: PropertyType) => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-faint hover:bg-hover">
          <Plus className="size-3.5" /> New property
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <label htmlFor="new-property-name" className="mb-1 block px-1 text-xs font-medium text-text-muted">
          Property name
        </label>
        <input
          ref={inputRef}
          id="new-property-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Property name"
          className="mb-1 w-full rounded-md border border-border bg-surface px-2 py-1 text-base outline-none"
        />
        <div className="max-h-56 overflow-y-auto">
          {ADDABLE_PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                onAdd(name.trim() || TYPE_LABELS[type], type);
                setName("");
                setOpen(false);
              }}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-text hover:bg-hover"
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
