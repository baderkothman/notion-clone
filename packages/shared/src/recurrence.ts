/**
 * Converts our bounded recurrence-preset list (contracts/calendar.ts's
 * `RecurrenceFrequency`) into a real RFC 5545 `RRULE` string, the format Google
 * Calendar's API expects on `event.recurrence`. Pure/no I/O — see recurrence.test.ts.
 *
 * Deliberately not a general RRULE builder: this app doesn't offer a custom-recurrence
 * UI (see calendar.ts schema's doc comment on the scope cut), so there are exactly four
 * inputs this ever needs to handle.
 */

export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";

/** Returns `null` for "none" (a non-recurring event has no RRULE at all — Google
 * omits `recurrence` entirely for single events, it's never an empty array). */
export function frequencyToRRule(frequency: RecurrenceFrequency): string | null {
  switch (frequency) {
    case "none":
      return null;
    case "daily":
      return "RRULE:FREQ=DAILY";
    case "weekly":
      return "RRULE:FREQ=WEEKLY";
    case "monthly":
      return "RRULE:FREQ=MONTHLY";
  }
}

/** Inverse mapping for events pulled *from* Google — used to decide how to label an
 * incoming recurring event in our own UI. Anything Google sends that isn't one of our
 * three exact presets (a custom interval, BYDAY list, COUNT/UNTIL bound, etc.) maps to
 * `"custom"` rather than being silently misrepresented as one of our presets — the
 * event still syncs and displays correctly (Google's own expanded instances are what we
 * store, per calendar.ts schema's doc comment), it just can't be re-edited as a preset
 * in our UI. */
export function rruleToFrequency(rrule: string | null | undefined): RecurrenceFrequency | "custom" {
  if (!rrule) return "none";
  const normalized = rrule.replace(/^RRULE:/, "");
  if (normalized === "FREQ=DAILY") return "daily";
  if (normalized === "FREQ=WEEKLY") return "weekly";
  if (normalized === "FREQ=MONTHLY") return "monthly";
  return "custom";
}
