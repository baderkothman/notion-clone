"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notion-clone/ui";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  role: string;
}

export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-hover">
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-accent text-xs font-semibold text-accent-text">
            {current.icon ?? current.name[0]?.toUpperCase()}
          </span>
          <span className="flex-1 truncate text-sm font-medium text-text">{current.name}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-text-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} onSelect={() => router.push(`/w/${workspace.slug}`)}>
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-accent text-xs font-semibold text-accent-text">
              {workspace.icon ?? workspace.name[0]?.toUpperCase()}
            </span>
            <span className="flex-1 truncate">{workspace.name}</span>
            {workspace.id === current.id ? <span className="text-xs text-text-faint">Current</span> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding" className="flex items-center gap-2">
            <Plus className="size-3.5" /> New workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
