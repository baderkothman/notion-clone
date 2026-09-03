"use client";

import Link from "next/link";
import { LogOut, Settings, Users } from "lucide-react";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notion-clone/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/(app)/actions/auth";

export function SidebarFooter({
  user,
  workspaceSlug,
}: {
  user: { name: string | null; email: string; image: string | null };
  workspaceSlug: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pr-1 text-left hover:bg-hover">
            <Avatar name={user.name ?? user.email} src={user.image} size={22} />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-text">
              {user.name ?? user.email}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/w/${workspaceSlug}/settings/members`}>
              <Users className="size-3.5" /> Members
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/w/${workspaceSlug}/settings`}>
              <Settings className="size-3.5" /> Workspace settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onSelect={() => {
              void signOutAction();
            }}
          >
            <LogOut className="size-3.5" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ThemeToggle />
    </div>
  );
}
