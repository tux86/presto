export interface Holiday {
  date: Date;
  name: string;
}

/**
 * Butcher-Meeus algorithm for computing Easter Sunday date
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns all 11 French public holidays for a given year
 */
export function getFrenchHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);

  return [
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: addDays(easter, 1), name: "Easter Monday" },
    { date: new Date(year, 4, 1), name: "Labour Day" },
    { date: new Date(year, 4, 8), name: "Victory in Europe Day" },
    { date: addDays(easter, 39), name: "Ascension Day" },
    { date: addDays(easter, 50), name: "Whit Monday" },
    { date: new Date(year, 6, 14), name: "Bastille Day" },
    { date: new Date(year, 7, 15), name: "Assumption Day" },
    { date: new Date(year, 10, 1), name: "All Saints' Day" },
    { date: new Date(year, 10, 11), name: "Armistice Day" },
    { date: new Date(year, 11, 25), name: "Christmas Day" },
  ];
}

/**
 * Check if a date is a French holiday, returns the holiday name or null
 */
export function getHolidayName(date: Date, year?: number): string | null {
  const y = year ?? date.getFullYear();
  const holidays = getFrenchHolidays(y);
  const found = holidays.find(
    (h) =>
      h.date.getFullYear() === date.getFullYear() &&
      h.date.getMonth() === date.getMonth() &&
      h.date.getDate() === date.getDate(),
  );
  return found?.name ?? null;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
