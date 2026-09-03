"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Plug } from "lucide-react";
import { cn } from "@notion-clone/ui";

export function SettingsNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const items = [
    { href: `/w/${workspaceSlug}/settings`, label: "General", icon: Settings, exact: true },
    { href: `/w/${workspaceSlug}/settings/members`, label: "Members", icon: Users, exact: false },
    { href: `/w/${workspaceSlug}/settings/integrations`, label: "Integrations", icon: Plug, exact: false },
  ];

  return (
    <nav aria-label="Settings" className="w-48 shrink-0 space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
              active ? "bg-selected text-text" : "text-text-muted hover:bg-hover hover:text-text",
            )}
          >
            <Icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
