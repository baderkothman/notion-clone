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

export function NewPropertyButton({ onAdd }: { onAdd: (name: string, type: PropertyType) => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-faint hover:bg-hover">
          <Plus className="h-3.5 w-3.5" /> New property
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Property name"
          autoFocus
          className="mb-1 w-full rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none"
        />
        <div className="max-h-56 overflow-y-auto">
          {propertyTypes
            .filter((t) => t !== "title")
            .map((type) => (
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
