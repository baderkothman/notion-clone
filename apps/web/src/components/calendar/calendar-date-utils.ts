/**
 * Pure date-range math for the calendar views — no framework dependency, matches the
 * extraction pattern already used for filter/sort logic (see
 * ../database/filter-sort-core.ts). All ranges are `[start, end)`-ish inclusive day
 * boundaries in the *local* timezone (the browser's), since that's what a person
 * looking at a month grid actually expects — the query range sent to the server is
 * widened defensively (whole UTC days) so a timezone offset never clips an event.
 */

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** The 6-week (42-day), Sunday-first grid a month view renders — always 42 cells so
 * the grid height never jumps between months with 4 vs. 6 visible weeks. */
export function getMonthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = addDays(startOfDay(firstOfMonth), -firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function getWeekDays(anchor: Date): Date[] {
  const start = addDays(startOfDay(anchor), -anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The server-query range for a given view + anchor date. Padded by a day on each
 * side and widened to whole days (not just whole *local* days) — an event stored with
 * a different timezone than the viewer's could otherwise fall just outside a
 * tightly-clipped UTC boundary for a day that, locally, it clearly belongs to. */
export function getQueryRangeForView(
  view: "month" | "week" | "day" | "agenda",
  anchor: Date,
): { rangeStart: Date; rangeEnd: Date } {
  switch (view) {
    case "month": {
      const days = getMonthGridDays(anchor);
      return { rangeStart: addDays(days[0]!, -1), rangeEnd: addDays(days[days.length - 1]!, 2) };
    }
    case "week": {
      const days = getWeekDays(anchor);
      return { rangeStart: addDays(days[0]!, -1), rangeEnd: addDays(days[days.length - 1]!, 2) };
    }
    case "day":
      return { rangeStart: addDays(startOfDay(anchor), -1), rangeEnd: addDays(startOfDay(anchor), 2) };
    case "agenda":
      return { rangeStart: addDays(startOfDay(anchor), -1), rangeEnd: addDays(startOfDay(anchor), 31) };
  }
}

/** Moves the anchor date forward/back by one "page" of the given view — a month, a
 * week, or a day. Agenda pages by the same window it queries (31 days) so "next" moves
 * past everything currently visible rather than re-showing part of it. */
export function shiftAnchor(view: "month" | "week" | "day" | "agenda", anchor: Date, direction: 1 | -1): Date {
  switch (view) {
    case "month":
      return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
    case "week":
      return addDays(anchor, 7 * direction);
    case "day":
      return addDays(anchor, direction);
    case "agenda":
      return addDays(anchor, 30 * direction);
  }
}

export function formatMonthTitle(anchor: Date): string {
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWeekTitle(anchor: Date): string {
  const days = getWeekDays(anchor);
  const start = days[0]!;
  const end = days[6]!;
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" },
  );
  return `${startLabel} – ${endLabel}`;
}

export function formatDayTitle(anchor: Date): string {
  return anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
