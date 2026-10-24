/*
 * A date column's days (Table `edit: "date"`, or `editable` on ISO days): ISO in the data, the locale's short numeric
 * form on screen. Shared by the Table, Zen Studio's Figma push (the cell's text) and its pull (the text read back as an
 * ISO day), so the three write and read one form.
 */

/** An ISO calendar day ("2026-10-25"), the value a date column holds (Zen Studio pages write dates so too). */
export const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** An ISO day as a local Date, or null for anything else (or a day that does not exist). */
export function dayOf(value: string): Date | null {
  const match = ISO_DAY.exec(value.trim());
  if (!match) return null;
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return day.getMonth() === Number(match[2]) - 1 ? day : null;
}

export const isoOf = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

/** The locale's numeric date as parts (day, month and year with the separators between them). */
const partsOf = (day: Date, locale: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(day);

/**
 * An ISO day in the locale's short numeric form ("25/10/2024" in Vietnamese, "10/25/2024" in US English), without the
 * year in `today`'s year ("25/10"); any other text as it is. The year is cut from the full date rather than asking for
 * day and month alone, which some locales write with another separator (Vietnamese "25-10").
 */
export function dayText(value: string, locale: string, today: Date = new Date()): string {
  const day = dayOf(value);
  if (!day) return value;
  const parts = partsOf(day, locale);
  if (day.getFullYear() !== today.getFullYear()) return parts.map((part) => part.value).join("");
  const year = parts.findIndex((part) => part.type === "year");
  const literal = parts[year - 1]?.type === "literal" ? year - 1 : parts[year + 1]?.type === "literal" ? year + 1 : -1;
  return parts.filter((_, index) => index !== year && index !== literal).map((part) => part.value).join("").trim();
}

/**
 * A day as `dayText` writes it ("10/25", "10/25/2024" in US English), back to its ISO day, read in the locale's order of
 * day, month and year; `today`'s year when it has none. Null for text that is not such a day.
 */
export function dayFromText(text: string, locale: string, today: Date = new Date()): string | null {
  const numbers = text.trim().match(/\d+/g);
  if (!numbers || (numbers.length !== 2 && numbers.length !== 3) || !/^\d+\D+\d+(\D+\d+)?$/.test(text.trim())) return null;
  const order = partsOf(today, locale).map((part) => part.type).filter((type) => type === "day" || type === "month" || type === "year");
  const types = numbers.length === 3 ? order : order.filter((type) => type !== "year");
  const value: Record<string, number> = { year: today.getFullYear() };
  types.forEach((type, index) => { value[type] = Number(numbers[index]); });
  if (!value.day || !value.month || value.year < 1000) return null;
  const day = new Date(value.year, value.month - 1, value.day);
  return day.getFullYear() === value.year && day.getMonth() === value.month - 1 && day.getDate() === value.day ? isoOf(day) : null;
}
