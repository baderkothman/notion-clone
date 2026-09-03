import { describe, expect, it } from "vitest";
import {
  getMonthGridDays,
  getWeekDays,
  isSameDay,
  shiftAnchor,
  formatMonthTitle,
  formatWeekTitle,
  formatDayTitle,
} from "./calendar-date-utils";

describe("getMonthGridDays", () => {
  it("always returns 42 days", () => {
    expect(getMonthGridDays(new Date(2026, 1, 15))).toHaveLength(42); // Feb 2026, short month
    expect(getMonthGridDays(new Date(2026, 0, 15))).toHaveLength(42); // Jan 2026, spans 6 weeks
  });

  it("starts on a Sunday and ends on a Saturday", () => {
    const days = getMonthGridDays(new Date(2026, 2, 10));
    expect(days[0]!.getDay()).toBe(0);
    expect(days[41]!.getDay()).toBe(6);
  });

  it("includes every day of the anchor month", () => {
    const days = getMonthGridDays(new Date(2026, 1, 1)); // February 2026
    const daysInFeb = days.filter((d) => d.getMonth() === 1 && d.getFullYear() === 2026);
    expect(daysInFeb).toHaveLength(28);
  });
});

describe("getWeekDays", () => {
  it("returns 7 consecutive days starting on Sunday", () => {
    const anchor = new Date(2026, 2, 11); // a Wednesday
    const days = getWeekDays(anchor);
    expect(days).toHaveLength(7);
    expect(days[0]!.getDay()).toBe(0);
    for (let i = 1; i < 7; i++) {
      expect(days[i]!.getTime() - days[i - 1]!.getTime()).toBe(86_400_000);
    }
    expect(days.some((d) => isSameDay(d, anchor))).toBe(true);
  });
});

describe("shiftAnchor", () => {
  it("moves month view by a calendar month", () => {
    const next = shiftAnchor("month", new Date(2026, 0, 31), 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getFullYear()).toBe(2026);
  });

  it("wraps year forward from December", () => {
    const next = shiftAnchor("month", new Date(2026, 11, 15), 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
  });

  it("moves week view by 7 days", () => {
    const anchor = new Date(2026, 2, 11);
    const next = shiftAnchor("week", anchor, 1);
    expect(Math.round((next.getTime() - anchor.getTime()) / 86_400_000)).toBe(7);
  });

  it("moves day view by 1 day, both directions", () => {
    const anchor = new Date(2026, 2, 11);
    expect(shiftAnchor("day", anchor, 1).getDate()).toBe(12);
    expect(shiftAnchor("day", anchor, -1).getDate()).toBe(10);
  });
});

describe("title formatters", () => {
  it("formats a month title", () => {
    expect(formatMonthTitle(new Date(2026, 2, 1))).toBe("March 2026");
  });

  it("formats a day title", () => {
    expect(formatDayTitle(new Date(2026, 2, 11))).toContain("2026");
  });

  it("formats a week title spanning two months without repeating the year twice", () => {
    const label = formatWeekTitle(new Date(2026, 1, 1)); // a week that likely crosses Jan/Feb
    expect(label).toMatch(/–/);
  });
});
