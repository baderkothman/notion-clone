import { Link2 } from "lucide-react";

const WEEKDAYS = [
  { key: "sun", label: "S" },
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
];
const START_OFFSET = 3;
const DAYS_IN_MONTH = 30;
const CELLS = Array.from({ length: 35 }, (_, index) => ({
  key: `calendar-slot-${index}`,
  day: index - START_OFFSET + 1,
}));
const EVENTS: Record<number, { label: string; synced?: boolean }[]> = {
  3: [{ label: "Standup" }],
  7: [{ label: "Design review", synced: true }],
  12: [{ label: "Launch prep" }, { label: "1:1s" }],
  18: [{ label: "Team offsite", synced: true }],
  24: [{ label: "Board meeting", synced: true }],
};

/** A static illustrative month grid — not a live component, no real dates — used only
 * to show the shape of the feature on the landing page, the same "built mockup, not a
 * screenshot" approach as product-preview.tsx. Days 1–30 laid out from a Wednesday
 * start, with a few illustrative events including one Google-synced pill (the `Link2`
 * mark), matching the real calendar UI's own visual language for that distinction. */
export function CalendarPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--color-shadow)]">
      <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-2.5">
        <span className="font-display text-sm font-semibold text-text">March 2026</span>
        <span className="flex items-center gap-1 rounded bg-selected px-1.5 py-0.5 text-xs font-medium text-accent">
          <Link2 className="size-2.5" /> Synced
        </span>
      </div>
      <div className="grid grid-cols-7 border-b border-border text-xs font-medium text-text-faint">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday.key} className="p-1.5 text-center">
            {weekday.label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {CELLS.map((cell) => {
          const inMonth = cell.day >= 1 && cell.day <= DAYS_IN_MONTH;
          const dayEvents = inMonth ? EVENTS[cell.day] : undefined;
          return (
            <div key={cell.key} className="min-h-14 border-b border-r border-border p-1 last:border-r-0">
              {inMonth ? (
                <>
                  <span className="text-xs text-text-faint">{cell.day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents?.map((event) => (
                      <div
                        key={event.label}
                        className="flex items-center gap-0.5 truncate rounded bg-selected px-1 py-0.5 text-xs font-medium text-accent"
                      >
                        <span className="truncate">{event.label}</span>
                        {event.synced ? <Link2 className="size-2 shrink-0 opacity-70" /> : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
