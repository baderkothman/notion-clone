import type { PropertyType, ViewType, SelectOption } from "@notion-clone/contracts";

export interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  config: Record<string, unknown>;
  position: number;
}

export interface DatabaseRow {
  id: string;
  title: string;
  icon: string | null;
  sortKey: string;
}

export interface DatabaseRowValue {
  id: string;
  rowPageId: string;
  propertyId: string;
  value: unknown;
}

export interface DatabaseViewRecord {
  id: string;
  name: string;
  type: ViewType;
  config: {
    filters?: unknown[];
    sorts?: unknown[];
    groupByPropertyId?: string | null;
    datePropertyId?: string | null;
  };
  position: number;
}

export function selectOptions(property: DatabaseProperty): SelectOption[] {
  const options = property.config?.options;
  return Array.isArray(options) ? (options as SelectOption[]) : [];
}

const PALETTE = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;

export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

export function nextOptionColor(existing: SelectOption[]): string {
  return colorForIndex(existing.length);
}

export const SELECT_COLOR_CLASSES: Record<string, string> = {
  gray: "bg-hover text-text-muted",
  brown: "bg-[#eee0da] text-[#644a40] dark:bg-[#3a2c26] dark:text-[#d4b8a8]",
  orange: "bg-[#fadec9] text-[#8a4a1e] dark:bg-[#3d2a17] dark:text-[#f0b57e]",
  yellow: "bg-[#fdecc8] text-[#8a6d1e] dark:bg-[#3d3417] dark:text-[#f0d97e]",
  green: "bg-[#dbeddb] text-[#256a3a] dark:bg-[#1c3324] dark:text-[#8fd3a6]",
  blue: "bg-[#d3e5ef] text-[#1f5c85] dark:bg-[#1a2e3d] dark:text-[#8fc4e8]",
  purple: "bg-[#e8deee] text-[#5c3a7a] dark:bg-[#2e2438] dark:text-[#c9a8e8]",
  pink: "bg-[#f5e0e9] text-[#8a3a63] dark:bg-[#3a2430] dark:text-[#eba8c9]",
  red: "bg-[#fbdfdc] text-[#8a3226] dark:bg-[#3d2220] dark:text-[#f0a89e]",
};
