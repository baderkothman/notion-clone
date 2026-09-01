"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { File, FileText } from "lucide-react";
import { cn } from "@notion-clone/ui";

export interface FavoriteItem {
  id: string;
  title: string;
  icon: string | null;
  type: "page" | "database";
}

export function FavoritesList({ items, workspaceSlug }: { items: FavoriteItem[]; workspaceSlug: string }) {
  const pathname = usePathname();
  if (items.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="px-2 pb-1 text-xs font-medium text-text-faint">Favorites</p>
      {items.map((item) => {
        const isActive = pathname === `/w/${workspaceSlug}/p/${item.id}`;
        return (
          <Link
            key={item.id}
            href={`/w/${workspaceSlug}/p/${item.id}`}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm",
              isActive ? "bg-selected text-text" : "text-text-muted hover:bg-hover hover:text-text",
            )}
          >
            <span className="shrink-0">
              {item.icon ?? (item.type === "database" ? <FileText className="h-3.5 w-3.5" /> : <File className="h-3.5 w-3.5" />)}
            </span>
            <span className="truncate">{item.title || "Untitled"}</span>
          </Link>
        );
      })}
    </div>
  );
}
