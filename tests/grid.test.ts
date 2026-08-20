import { describe, expect, test } from "bun:test";
import {
  buildMonthGrid,
  compactDays,
  compactNotes,
  copyWeekdayPattern,
  fillWorkdays,
  isWorkday,
} from "../src/core/grid.ts";
import { forCountry } from "../src/core/holidays.ts";
import type { DayValue } from "../src/core/types.ts";

const FR = forCountry("FR");
const US = forCountry("US");

describe("buildMonthGrid", () => {
  test("returns one entry per calendar day", () => {
    expect(buildMonthGrid(2026, 2, FR)).toHaveLength(28);
    expect(buildMonthGrid(2024, 2, FR)).toHaveLength(29);
    expect(buildMonthGrid(2026, 8, FR)).toHaveLength(31);
  });

  test("derives weekend and holiday flags rather than reading them from storage", () => {
    const grid = buildMonthGrid(2026, 7, FR);
    const bastilleDay = grid.find((d) => d.day === 14)!;
    expect(bastilleDay.holiday).toBeTruthy();
    expect(bastilleDay.isWeekend).toBe(false);

    const saturday = grid.find((d) => d.day === 4)!;
    expect(saturday.isWeekend).toBe(true);
  });

  test("the same month renders differently for a different holiday country", () => {
    const fr = buildMonthGrid(2026, 7, FR).find((d) => d.day === 14)!;
    const us = buildMonthGrid(2026, 7, US).find((d) => d.day === 14)!;
    expect(fr.holiday).toBeTruthy();
    expect(us.holiday).toBeNull();
  });

  test("expands a sparse day map, defaulting missing days to zero", () => {
    const grid = buildMonthGrid(2026, 8, FR, { "3": 1, "4": 0.5 }, { "3": "kickoff" });
    expect(grid.find((d) => d.day === 3)!.value).toBe(1);
    expect(grid.find((d) => d.day === 3)!.note).toBe("kickoff");
    expect(grid.find((d) => d.day === 4)!.value).toBe(0.5);
    expect(grid.find((d) => d.day === 5)!.value).toBe(0);
    expect(grid.find((d) => d.day === 5)!.note).toBe("");
  });

  test("isWorkday excludes weekends and holidays", () => {
    const grid = buildMonthGrid(2026, 7, FR);
    expect(isWorkday(grid.find((d) => d.day === 14)!)).toBe(false); // holiday
    expect(isWorkday(grid.find((d) => d.day === 4)!)).toBe(false); // Saturday
    expect(isWorkday(grid.find((d) => d.day === 13)!)).toBe(true); // Monday
  });
});

describe("fillWorkdays", () => {
  test("fills weekdays and skips weekends and holidays", () => {
    const days = fillWorkdays(2026, 7, FR);
    expect(days["13"]).toBe(1); // Monday
    expect(days["14"]).toBeUndefined(); // Bastille Day
    expect(days["4"]).toBeUndefined(); // Saturday
  });

  test("produces exactly the month's workday count", () => {
    const days = fillWorkdays(2026, 8, FR);
    const grid = buildMonthGrid(2026, 8, FR);
    expect(Object.keys(days)).toHaveLength(grid.filter(isWorkday).length);
  });
});

describe("compaction", () => {
  test("drops zero days and blank notes", () => {
    expect(compactDays({ "1": 1, "2": 0, "3": 0.5 })).toEqual({ "1": 1, "3": 0.5 });
    expect(compactNotes({ "1": "  ", "2": " kickoff ", "3": "" })).toEqual({ "2": "kickoff" });
  });
});

describe("copyWeekdayPattern", () => {
  test("carries the weekday rhythm, not the dates", () => {
    // A four-day week: Monday to Thursday, no Fridays.
    const source = buildMonthGrid(2026, 6, FR);
    const worked: Record<string, DayValue> = {};
    for (const day of source) {
      if (isWorkday(day) && day.weekday <= 3) worked[String(day.day)] = 1;
    }
    const july = copyWeekdayPattern(buildMonthGrid(2026, 6, FR, worked), 2026, 7, FR);
    const julyGrid = buildMonthGrid(2026, 7, FR, july);

    for (const day of julyGrid) {
      if (day.weekday <= 3 && isWorkday(day)) expect(day.value).toBe(1);
      else expect(day.value).toBe(0);
    }
  });

  test("respects the target month's own holidays", () => {
    // Every weekday worked in June, copied into July, must skip Bastille Day.
    const source = buildMonthGrid(2026, 6, FR, fillWorkdays(2026, 6, FR));
    const july = copyWeekdayPattern(source, 2026, 7, FR);
    expect(july["14"]).toBeUndefined();
    expect(july["13"]).toBe(1);
  });

  test("keeps half-days when that is the dominant value for a weekday", () => {
    const source = buildMonthGrid(2026, 6, FR, { "3": 0.5, "10": 0.5, "17": 0.5 }); // Wednesdays
    const july = copyWeekdayPattern(source, 2026, 7, FR);
    expect(july["1"]).toBe(0.5); // 1 July 2026 is a Wednesday
    expect(july["2"]).toBeUndefined();
  });

  test("an empty source month produces an empty target", () => {
    expect(copyWeekdayPattern(buildMonthGrid(2026, 6, FR), 2026, 7, FR)).toEqual({});
  });
});
