"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../utils/cn";

export function Avatar({
  name,
  src,
  size = 24,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <AvatarPrimitive.Root
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-accent-text", className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {src ? (
        <AvatarPrimitive.Image src={src} alt={name} className="h-full w-full object-cover" />
      ) : null}
      <AvatarPrimitive.Fallback className="font-medium">{initials || "?"}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
