"use client";

import * as React from "react";
import { Check, File as FileIcon, Loader2, Paperclip, User as UserIcon, X } from "lucide-react";
import { Avatar, Popover, PopoverContent, PopoverTrigger, cn } from "@notion-clone/ui";
import type { SelectOption } from "@notion-clone/contracts";
import type { DatabaseProperty } from "./types";
import { selectOptions } from "./types";
import { SelectEditor, OptionPill } from "./select-editor";
import { createEditorFileService } from "@/components/page/editor-file-service";

export interface WorkspaceMemberOption {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface PropertyCellProps {
  property: DatabaseProperty;
  value: unknown;
  onChange: (value: unknown) => void;
  onCreateOption: (name: string) => Promise<SelectOption>;
  members: WorkspaceMemberOption[];
  workspaceId: string;
  rowPageId: string;
  /** Compact renders read-only summaries (used on Board cards); full renders the
   * editable table-cell experience. */
  variant?: "table" | "board";
}

/** Dispatches to a type-specific renderer/editor. One component for every property
 * type keeps the "how do I show and edit a `select`" decision in one place instead of
 * scattered across table/board/list views. */
export function PropertyCell({
  property,
  value,
  onChange,
  onCreateOption,
  members,
  workspaceId,
  rowPageId,
  variant = "table",
}: PropertyCellProps) {
  switch (property.type) {
    case "text":
      return <TextCell value={typeof value === "string" ? value : ""} onChange={onChange} />;
    case "number":
      return <NumberCell value={typeof value === "number" ? value : null} onChange={onChange} />;
    case "url":
      return <UrlCell value={typeof value === "string" ? value : ""} onChange={onChange} />;
    case "checkbox":
      return <CheckboxCell value={value === true} onChange={onChange} />;
    case "date":
      return <DateCell value={typeof value === "string" ? value : ""} onChange={onChange} />;
    case "select":
    case "status":
      return (
        <ChoiceCell
          property={property}
          value={Array.isArray(value) ? value : value ? [value as string] : []}
          multi={false}
          onChange={(next) => onChange(next[0] ?? null)}
          onCreateOption={onCreateOption}
        />
      );
    case "multi_select":
      return (
        <ChoiceCell
          property={property}
          value={Array.isArray(value) ? (value as string[]) : []}
          multi
          onChange={onChange}
          onCreateOption={onCreateOption}
        />
      );
    case "person":
      return (
        <PersonCell
          value={typeof value === "string" ? value : null}
          members={members}
          onChange={onChange}
          compact={variant === "board"}
        />
      );
    case "files":
      return (
        <FilesCell
          value={Array.isArray(value) ? (value as { fileId: string; filename: string }[]) : []}
          onChange={onChange}
          workspaceId={workspaceId}
          rowPageId={rowPageId}
        />
      );
    default:
      return null;
  }
}

function TextCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onChange(draft)}
      className="w-full bg-transparent px-2 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus"
      placeholder="Empty"
    />
  );
}

function NumberCell({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [draft, setDraft] = React.useState(value === null ? "" : String(value));
  React.useEffect(() => setDraft(value === null ? "" : String(value)), [value]);
  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parsed = draft.trim() === "" ? null : Number(draft);
        if (parsed !== value) onChange(parsed);
      }}
      className="w-full bg-transparent px-2 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus"
      placeholder="Empty"
    />
  );
}

function UrlCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onChange(draft)}
      className="w-full bg-transparent px-2 py-1.5 text-sm text-accent underline outline-none focus-visible:ring-2 focus-visible:ring-focus"
      placeholder="Empty"
    />
  );
}

function CheckboxCell({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-center px-2 py-1.5">
      <button
        onClick={() => onChange(!value)}
        aria-checked={value}
        role="checkbox"
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          value ? "border-accent bg-accent text-accent-text" : "border-border-strong",
        )}
      >
        {value ? <Check className="h-3 w-3" /> : null}
      </button>
    </div>
  );
}

function DateCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent px-2 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus"
    />
  );
}

function ChoiceCell({
  property,
  value,
  multi,
  onChange,
  onCreateOption,
}: {
  property: DatabaseProperty;
  value: string[];
  multi: boolean;
  onChange: (v: string[]) => void;
  onCreateOption: (name: string) => Promise<SelectOption>;
}) {
  const options = selectOptions(property);
  const selected = options.filter((o) => value.includes(o.id));

  return (
    <SelectEditor options={options} value={value} multi={multi} onChange={onChange} onCreateOption={onCreateOption}>
      <button className="flex min-h-[30px] w-full flex-wrap items-center gap-1 px-2 py-1 text-left hover:bg-hover">
        {selected.length === 0 ? (
          <span className="text-sm text-text-faint">Empty</span>
        ) : (
          selected.map((option) => <OptionPill key={option.id} option={option} />)
        )}
      </button>
    </SelectEditor>
  );
}

function PersonCell({
  value,
  members,
  onChange,
  compact,
}: {
  value: string | null;
  members: WorkspaceMemberOption[];
  onChange: (v: string | null) => void;
  compact: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = members.find((m) => m.userId === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex min-h-[30px] w-full items-center gap-1.5 px-2 py-1 hover:bg-hover">
          {selected ? (
            <>
              <Avatar name={selected.name ?? selected.email} src={selected.image} size={18} />
              {!compact ? <span className="truncate text-sm text-text">{selected.name ?? selected.email}</span> : null}
            </>
          ) : (
            <span className="flex items-center gap-1 text-sm text-text-faint">
              <UserIcon className="h-3.5 w-3.5" /> {compact ? "" : "Empty"}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {members.map((member) => (
          <button
            key={member.userId}
            onClick={() => {
              onChange(member.userId === value ? null : member.userId);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover"
          >
            <Avatar name={member.name ?? member.email} src={member.image} size={20} />
            <span className="min-w-0 flex-1 truncate">{member.name ?? member.email}</span>
            {member.userId === value ? <Check className="h-3.5 w-3.5 text-accent" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function FilesCell({
  value,
  onChange,
  workspaceId,
  rowPageId,
}: {
  value: { fileId: string; filename: string }[];
  onChange: (v: { fileId: string; filename: string }[]) => void;
  workspaceId: string;
  rowPageId: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileService = React.useMemo(() => createEditorFileService(workspaceId, rowPageId), [workspaceId, rowPageId]);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { fileId, filename } = await fileService.upload(file);
      onChange([...value, { fileId, filename }]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-h-[30px] flex-wrap items-center gap-1 px-2 py-1">
      {value.map((file) => (
        <span key={file.fileId} className="flex items-center gap-1 rounded bg-hover px-1.5 py-0.5 text-xs text-text">
          <FileIcon className="h-3 w-3" />
          <span className="max-w-[100px] truncate">{file.filename}</span>
          <button onClick={() => onChange(value.filter((f) => f.fileId !== file.fileId))} aria-label="Remove file">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-5 w-5 items-center justify-center rounded text-text-faint hover:bg-hover"
        aria-label="Attach file"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
      </button>
      <input ref={inputRef} type="file" hidden onChange={handleSelect} />
    </div>
  );
}
