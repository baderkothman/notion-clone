"use client";

import * as React from "react";
import { Avatar, Button, cn } from "@notion-clone/ui";

export interface MemberOption {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
}

/**
 * A plain-text input with "@name" autocomplete. Typing `@` opens a filtered dropdown of
 * workspace members; picking one inserts `@DisplayName ` into the text AND records the
 * user id in `mentionedUserIds` (sent to the server alongside the body — see
 * createCommentSchema — rather than re-parsed from the rendered "@Name" text, which
 * would be fragile against two members sharing a display name or a name changing
 * later).
 */
export function MentionComposer({
  members,
  onSubmit,
  placeholder,
  autoFocus,
}: {
  members: MemberOption[];
  onSubmit: (body: string, mentionedUserIds: string[]) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = React.useState("");
  const mentionedRef = React.useRef<Map<string, string>>(new Map()); // name -> userId
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = members.filter((m) => (m.name ?? m.email).toLowerCase().includes(query.toLowerCase()));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    const cursor = e.target.selectionStart ?? next.length;
    const uptoCursor = next.slice(0, cursor);
    const match = /@([\w\s]{0,30})$/.exec(uptoCursor);
    if (match) {
      setQuery(match[1] ?? "");
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  }

  function pickMember(member: MemberOption) {
    const name = member.name ?? member.email;
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const replaced = uptoCursor.replace(/@([\w\s]{0,30})$/, `@${name} `);
    const next = replaced + value.slice(cursor);
    setValue(next);
    mentionedRef.current.set(name, member.userId);
    setMenuOpen(false);
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    // Only mentions whose "@Name " literally still appears in the final text count —
    // if the user deletes the inserted name, the mention shouldn't be recorded.
    const activeMentionIds: string[] = [];
    for (const [name, userId] of mentionedRef.current) {
      if (value.includes(`@${name}`)) activeMentionIds.push(userId);
    }
    onSubmit(value.trim(), activeMentionIds);
    setValue("");
    mentionedRef.current.clear();
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-1.5">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Escape") setMenuOpen(false);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <Button type="submit" size="sm">
        Send
      </Button>
      {menuOpen && filtered.length > 0 ? (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-md border border-border bg-surface-raised p-1 shadow-[var(--color-shadow)]">
          {filtered.slice(0, 6).map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => pickMember(member)}
              className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover")}
            >
              <Avatar name={member.name ?? member.email} src={member.image} size={20} />
              <span className="truncate">{member.name ?? member.email}</span>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
