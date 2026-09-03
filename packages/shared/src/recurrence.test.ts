import { describe, expect, it } from "vitest";
import { frequencyToRRule, rruleToFrequency } from "./recurrence";

describe("frequencyToRRule", () => {
  it("returns null for 'none'", () => {
    expect(frequencyToRRule("none")).toBeNull();
  });

  it("maps daily/weekly/monthly to the matching RRULE", () => {
    expect(frequencyToRRule("daily")).toBe("RRULE:FREQ=DAILY");
    expect(frequencyToRRule("weekly")).toBe("RRULE:FREQ=WEEKLY");
    expect(frequencyToRRule("monthly")).toBe("RRULE:FREQ=MONTHLY");
  });
});

describe("rruleToFrequency", () => {
  it("returns 'none' for null/undefined", () => {
    expect(rruleToFrequency(null)).toBe("none");
    expect(rruleToFrequency(undefined)).toBe("none");
  });

  it("round-trips the three known presets", () => {
    expect(rruleToFrequency("RRULE:FREQ=DAILY")).toBe("daily");
    expect(rruleToFrequency("RRULE:FREQ=WEEKLY")).toBe("weekly");
    expect(rruleToFrequency("RRULE:FREQ=MONTHLY")).toBe("monthly");
  });

  it("maps anything else to 'custom' rather than guessing", () => {
    expect(rruleToFrequency("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe("custom");
    expect(rruleToFrequency("RRULE:FREQ=DAILY;COUNT=5")).toBe("custom");
    expect(rruleToFrequency("RRULE:FREQ=YEARLY")).toBe("custom");
  });
});
