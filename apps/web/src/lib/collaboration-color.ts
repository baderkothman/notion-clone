const COLORS = [
  "#eb5757", // red
  "#d9822b", // orange
  "#2f9e44", // green
  "#0891b2", // cyan
  "#2f80ed", // blue
  "#8b5cf6", // purple
  "#db2777", // pink
  "#65a30d", // lime
];

/** A deterministic color for a user's collaboration cursor/selection, stable across
 * sessions and reconnects (same user always gets the same color) without a dedicated
 * "color" column anywhere — derived from their id alone. */
export function collaborationColorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length]!;
}
