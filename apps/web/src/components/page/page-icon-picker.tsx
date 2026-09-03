"use client";

import * as React from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, cn } from "@notion-clone/ui";

const EMOJI_GRID = [
  "📄", "📝", "📌", "📋", "📁", "📚", "🗂️", "📊", "📈", "📅",
  "💡", "✅", "🎯", "🚀", "🔥", "⭐", "❤️", "🎉", "🧠", "🛠️",
  "🌱", "🌍", "🏠", "💼", "🎨", "🎵", "🍎", "☕", "🐶", "🐱",
];

export function PageIconPicker({
  icon,
  onChange,
  size = "lg",
}: {
  icon: string | null;
  onChange: (icon: string | null) => void;
  size?: "sm" | "lg";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center rounded-md hover:bg-hover",
            size === "lg" ? "h-16 w-16 text-5xl" : "h-7 w-7 text-lg",
          )}
          aria-label="Change icon"
        >
          {icon ?? <Smile className={size === "lg" ? "h-8 w-8 text-text-faint" : "h-4 w-4 text-text-faint"} />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="grid grid-cols-10 gap-1">
          {EMOJI_GRID.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onChange(emoji);
                setOpen(false);
              }}
              className="flex size-6 items-center justify-center rounded text-lg hover:bg-hover"
            >
              {emoji}
            </button>
          ))}
        </div>
        {icon ? (
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md py-1 text-left text-xs text-text-muted hover:bg-hover"
          >
            Remove icon
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
