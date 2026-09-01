"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, Button, Input } from "@notion-clone/ui";

/** Phase-1 scope: covers accept an external image URL (Notion's "Link" tab) rather than
 * a direct upload. Uploaded files are addressed by a short-lived signed URL (see
 * editor-file-service.ts), which doesn't fit `pages.coverImage`'s plain-URL column —
 * wiring uploaded covers through the same fileId indirection as editor images is
 * straightforward follow-up work, intentionally deferred here. */
export function PageCover({
  coverImage,
  onChange,
}: {
  coverImage: string | null;
  onChange: (url: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  if (!coverImage) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="mx-8 mt-6 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-faint hover:bg-hover hover:text-text-muted">
            <ImagePlus className="h-3.5 w-3.5" /> Add cover
          </button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) onChange(value.trim());
              setOpen(false);
            }}
            className="flex w-72 items-center gap-2"
          >
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste an image link…" autoFocus />
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="group relative h-48 w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={coverImage} alt="" className="h-full w-full object-cover" />
      <div className="absolute right-4 top-4 hidden gap-1.5 group-hover:flex">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="rounded-md bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/60">Change</button>
          </PopoverTrigger>
          <PopoverContent align="end">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (value.trim()) onChange(value.trim());
                setOpen(false);
              }}
              className="flex w-72 items-center gap-2"
            >
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste an image link…" autoFocus />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
          </PopoverContent>
        </Popover>
        <button
          onClick={() => onChange(null)}
          aria-label="Remove cover"
          className="rounded-md bg-black/50 p-1 text-white hover:bg-black/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
