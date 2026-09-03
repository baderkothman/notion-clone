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
      return <TextCell value={typeof value === "string" ? value : ""} onChange={onChange} label={property.name} />;
    case "number":
      return <NumberCell value={typeof value === "number" ? value : null} onChange={onChange} label={property.name} />;
    case "url":
      return <UrlCell value={typeof value === "string" ? value : ""} onChange={onChange} label={property.name} />;
    case "checkbox":
      return <CheckboxCell value={value === true} onChange={onChange} label={property.name} />;
    case "date":
      return <DateCell value={typeof value === "string" ? value : ""} onChange={onChange} label={property.name} />;
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

/** Local "draft" state resynced from `value` on every prop change, committed only on
 * blur — deliberate (Notion/Airtable-style inline cells all work this way), not a bug
 * on its own. The one real risk is the resync effect firing while the user is
 * mid-edit-but-not-yet-blurred (e.g. another edit elsewhere in the same row replaces
 * this row's data and happens to leave this cell's own `value` unchanged in a way that
 * still re-renders it) and clobbering their in-progress keystrokes with the server
 * value — `isFocusedRef` guards exactly that, without changing the resync/blur-commit
 * behavior otherwise. Shared by TextCell/NumberCell/UrlCell below. */
function useDraftValue<T>(value: T, toDraft: (v: T) => string): [string, (draft: string) => void, React.RefObject<boolean>] {
  const [draft, setDraft] = React.useState(() => toDraft(value));
  const isFocusedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isFocusedRef.current) setDraft(toDraft(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return [draft, setDraft, isFocusedRef];
}

function TextCell({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [draft, setDraft, isFocusedRef] = useDraftValue(value, (v) => v);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => (isFocusedRef.current = true)}
      onBlur={() => {
        isFocusedRef.current = false;
        if (draft !== value) onChange(draft);
      }}
      aria-label={label}
      className="w-full bg-transparent px-2 py-1.5 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-focus"
      placeholder="Empty"
    />
  );
}

function NumberCell({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  const [draft, setDraft, isFocusedRef] = useDraftValue(value, (v) => (v === null ? "" : String(v)));
  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => (isFocusedRef.current = true)}
      onBlur={() => {
        isFocusedRef.current = false;
        const parsed = draft.trim() === "" ? null : Number(draft);
        if (parsed !== value) onChange(parsed);
      }}
      aria-label={label}
      className="w-full bg-transparent px-2 py-1.5 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-focus"
      placeholder="Empty"
    />
  );
}

function UrlCell({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [draft, setDraft, isFocusedRef] = useDraftValue(value, (v) => v);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => (isFocusedRef.current = true)}
      onBlur={() => {
        isFocusedRef.current = false;
        if (draft !== value) onChange(draft);
      }}
      aria-label={label}
      className="w-full bg-transparent px-2 py-1.5 text-base text-accent underline outline-none focus-visible:ring-2 focus-visible:ring-focus"
      placeholder="Empty"
    />
  );
}

function CheckboxCell({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex justify-center px-2 py-1.5">
      <button
        onClick={() => onChange(!value)}
        aria-checked={value}
        aria-label={label}
        role="checkbox"
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          value ? "border-accent bg-accent text-accent-text" : "border-border-strong",
        )}
      >
        {value ? <Check className="size-3" /> : null}
      </button>
    </div>
  );
}

function DateCell({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full bg-transparent px-2 py-1.5 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
  const selectedIds = new Set(value);
  const selected = options.filter((o) => selectedIds.has(o.id));

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
              <UserIcon className="size-3.5" /> {compact ? "" : "Empty"}
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
            {member.userId === value ? <Check className="size-3.5 text-accent" /> : null}
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
          <FileIcon className="size-3" />
          <span className="max-w-[100px] truncate">{file.filename}</span>
          <button onClick={() => onChange(value.filter((f) => f.fileId !== file.fileId))} aria-label="Remove file">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex size-5 items-center justify-center rounded text-text-faint hover:bg-hover"
        aria-label="Attach file"
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
      </button>
      <input ref={inputRef} type="file" hidden onChange={handleSelect} />
    </div>
  );
}
