"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@notion-clone/ui";

type ThemePreference = "light" | "dark" | "system";

function applyTheme(pref: ThemePreference) {
  const isDark =
    pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

// Module scope, not rebuilt every render: these are plain, static React elements (no
// props depending on component state), so there's nothing to gain from recreating the
// array on each render.
const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun className="size-3.5" /> },
  { value: "dark", label: "Dark", icon: <Moon className="size-3.5" /> },
  { value: "system", label: "System", icon: <Monitor className="size-3.5" /> },
];

export function ThemeToggle() {
  const [pref, setPref] = React.useState<ThemePreference>("system");

  React.useEffect(() => {
    const stored = (localStorage.getItem("theme") as ThemePreference | null) ?? "system";
    setPref(stored);
  }, []);

  function select(next: ThemePreference) {
    setPref(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  return (
    // Icon-only: this lives in the sidebar footer (sidebar-footer.tsx) alongside the
    // user menu button in a fixed-width column, and the previous icon+label design
    // ("Light"/"Dark"/"System" spelled out) was wide enough to overflow that row on
    // its own — squeezing the user menu button down to just its avatar, or clipping
    // itself, depending on content length. A tooltip carries the label visually
    // instead; `aria-label` (not the tooltip, which isn't reliably exposed to every
    // assistive technology) is what keeps each button's accessible name intact.
    <div className="inline-flex shrink-0 gap-0.5 rounded-md border border-border p-0.5" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((option) => (
        <Tooltip key={option.value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={pref === option.value}
              aria-label={option.label}
              onClick={() => select(option.value)}
              className={cn(
                "flex size-6 items-center justify-center rounded-[5px] transition-colors",
                pref === option.value ? "bg-hover text-text" : "text-text-muted hover:text-text",
              )}
            >
              {option.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{option.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
