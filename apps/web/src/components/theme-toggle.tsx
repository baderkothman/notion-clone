"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@notion-clone/ui";

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
    <div className="inline-flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={pref === option.value}
          onClick={() => select(option.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors",
            pref === option.value ? "bg-hover text-text" : "text-text-muted hover:text-text",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
