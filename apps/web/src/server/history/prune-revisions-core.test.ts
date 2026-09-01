import { describe, expect, it } from "vitest";
import { idsToPrune, type RevisionStub } from "./prune-revisions-core";

const NOW = new Date("2026-06-15T12:00:00Z").getTime();
const HOUR = 60 * 60 * 1000;

function at(hoursAgo: number, id: string): RevisionStub {
  return { id, createdAt: new Date(NOW - hoursAgo * HOUR) };
}

describe("idsToPrune", () => {
  it("keeps every revision from the last 24 hours, however many there are", () => {
    const revisions = [at(0.1, "a"), at(1, "b"), at(5, "c"), at(23, "d")];
    expect(idsToPrune(revisions, NOW)).toEqual([]);
  });

  it("thins revisions between 24h and 30 days old to one per hour, keeping the newest", () => {
    // Buckets are absolute clock hours, not "N hours ago" — these two fall in the same
    // hour (11:00 and 11:40 on the same day), the third in the next hour over.
    const revisions = [
      { id: "later-in-hour", createdAt: new Date("2026-06-14T11:40:00Z") },
      { id: "earlier-in-hour", createdAt: new Date("2026-06-14T11:00:00Z") },
      { id: "next-hour", createdAt: new Date("2026-06-14T12:00:00Z") },
    ];
    const pruned = idsToPrune(revisions, NOW);
    expect(pruned).toEqual(["earlier-in-hour"]);
  });

  it("thins revisions older than 30 days to one per day, keeping the newest", () => {
    const day31 = 31 * 24;
    const revisions = [
      { id: "morning", createdAt: new Date(NOW - day31 * HOUR) },
      { id: "evening-same-day", createdAt: new Date(NOW - day31 * HOUR - 3 * HOUR) },
    ];
    const pruned = idsToPrune(revisions, NOW);
    expect(pruned).toEqual(["evening-same-day"]);
  });

  it("never prunes the only revision in a bucket", () => {
    const revisions = [at(48, "solo")];
    expect(idsToPrune(revisions, NOW)).toEqual([]);
  });

  it("handles an empty history", () => {
    expect(idsToPrune([], NOW)).toEqual([]);
  });
});
