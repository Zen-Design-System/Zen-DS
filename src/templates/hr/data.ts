/**
 * Sample data for the HR templates: Đìzai Studio, a 48-person product studio in Ho Chi Minh City and Hanoi, seen by
 * Alex Duong (Design Lead) on Wednesday, Sep 30, 2026. Each template copies what it needs into local state; replace
 * these records with your API and keep the formatters.
 *
 * - Days are ISO strings read as local days ("2026-10-12"); moments are local times ("2026-09-30T09:24").
 * - Money is USD. Tables and details show it whole (formatMoney), charts and KPI tiles may shorten it ({ compact }).
 * - Status vocabularies are fixed per domain and always render as a Badge with the theme from its map.
 */
import type { AvatarTheme, BadgeTheme, DockIconTheme, FlagName, IconName, TextTone } from "@zen/design-system";
import accountPhoto from "./assets/account-photo.jpg";
import workspaceLogo from "./assets/workspace-logo.png";

/* ── Time and formatters ─────────────────────────────────────────────────────────────────────────────────────── */

/** An ISO day ("2026-10-12"), an ISO local time ("2026-09-30T09:24") or a Date. */
export type DateInput = string | Date;

/** Today in the demo: Wednesday, Sep 30, 2026. */
export const today = "2026-09-30";
/** The demo clock: Sep 30, 2026 at 10:45 am. formatRelative measures from it. */
export const now = "2026-09-30T10:45";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayMs = 86_400_000;

/** A local Date from an ISO day or time, without the UTC shift of `new Date("2026-10-12")`. */
export function toDate(value: DateInput): Date {
  if (value instanceof Date) return new Date(value.getTime());
  const [day, time = "00:00"] = value.split("T");
  const [year, month, date] = day.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, date, hours, minutes);
}

/** A Date → its ISO day ("2026-10-12"). */
export function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const startOfDay = (value: DateInput) => { const date = toDate(value); date.setHours(0, 0, 0, 0); return date; };

/** Calendar days from today to the day (0 today, 1 tomorrow, -1 yesterday). */
export function daysFromToday(value: DateInput, from: DateInput = today): number {
  return Math.round((startOfDay(value).getTime() - startOfDay(from).getTime()) / dayMs);
}

/** "Oct 12, 2026" · { year: false } "Oct 12" · { weekday: true } "Mon, Oct 12, 2026". */
export function formatDate(value: DateInput, { year = true, weekday = false }: { year?: boolean; weekday?: boolean } = {}): string {
  const date = toDate(value);
  const day = `${months[date.getMonth()]} ${date.getDate()}${year ? `, ${date.getFullYear()}` : ""}`;
  return weekday ? `${weekdays[date.getDay()].slice(0, 3)}, ${day}` : day;
}

/** "10:30 am". */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  const hours = date.getHours();
  return `${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")} ${hours < 12 ? "am" : "pm"}`;
}

/** "Oct 12, 2026" (one day) · "Oct 12 – Oct 14, 2026" · "Dec 28, 2026 – Jan 4, 2027" (the year once when shared). */
export function formatRange(start: DateInput, end: DateInput): string {
  const from = toDate(start);
  const to = toDate(end);
  if (toIsoDay(from) === toIsoDay(to)) return formatDate(from);
  return `${formatDate(from, { year: from.getFullYear() !== to.getFullYear() })} – ${formatDate(to)}`;
}

/**
 * The timestamp ladder, measured from `now`: Just now · 13 minutes ago · 10:30 am · Yesterday at 10:30 am ·
 * Friday at 10:30 am · Sep 14 at 10:30 am · Sep 14, 2025. Pass moments ("…T10:30"), not days.
 */
export function formatRelative(value: DateInput, from: DateInput = now): string {
  const date = toDate(value);
  const minutes = Math.floor((toDate(from).getTime() - date.getTime()) / 60_000);
  if (minutes >= 0 && minutes < 1) return "Just now";
  if (minutes >= 1 && minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const gap = -daysFromToday(date, from);
  const time = formatTime(date);
  if (gap === 0) return time;
  if (gap === 1) return `Yesterday at ${time}`;
  if (gap === -1) return `Tomorrow at ${time}`;
  if (gap > 1 && gap < 7) return `${weekdays[date.getDay()]} at ${time}`;
  if (date.getFullYear() === toDate(from).getFullYear()) return `${formatDate(date, { year: false })} at ${time}`;
  return formatDate(date);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

/** "$1,280.40" · { cents: false } "$12,000" · { compact: true } "$20.5K" (charts and KPI tiles only; under $1,000 stays exact). */
export function formatMoney(amount: number, { compact = false, cents = true }: { compact?: boolean; cents?: boolean } = {}): string {
  if (compact && Math.abs(amount) >= 1000) return usdCompact.format(amount);
  return (cents ? usd : usdWhole).format(amount);
}

/** "1 day" · "0.5 days" · "12 days". */
export function formatDays(days: number): string {
  return `${days.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${days === 1 ? "day" : "days"}`;
}

/* ── Workspace, teams and people ─────────────────────────────────────────────────────────────────────────────── */

export interface Workspace { name: string; email: string; logo: string; plan: string; headcount: number; offices: string[] }
export const workspace: Workspace = { name: "Đìzai Studio", email: "hello@dizai.studio", logo: workspaceLogo, plan: "Pro", headcount: 48, offices: ["Ho Chi Minh City", "Hanoi"] };

export type TeamId = "design" | "engineering" | "product" | "marketing" | "operations";
export interface Team { id: TeamId; name: string; lead: PersonId; headcount: number; icon: IconName; theme: DockIconTheme }
/** The studio's five teams (48 people in all). */
export const teams: Record<TeamId, Team> = {
  design: { id: "design", name: "Design", lead: "alex", headcount: 9, icon: "icon-pen-tool-02-line", theme: "violet" },
  engineering: { id: "engineering", name: "Engineering", lead: "gia", headcount: 20, icon: "icon-terminal-square-line", theme: "blue" },
  product: { id: "product", name: "Product", lead: "hana", headcount: 6, icon: "icon-rocket-line", theme: "orange" },
  marketing: { id: "marketing", name: "Marketing", lead: "priya", headcount: 6, icon: "icon-presentation-chart-line", theme: "pink" },
  operations: { id: "operations", name: "Operations", lead: "linh", headcount: 7, icon: "icon-building-02-line", theme: "green" },
};
export const teamList: Team[] = Object.values(teams);

/** The public-holiday calendars the studio follows: one per country people work from (Flag names). */
export const holidayCountries = ["Vietnam", "Singapore", "United States", "United Kingdom", "Germany"] as const satisfies readonly FlagName[];
export type HolidayCountry = (typeof holidayCountries)[number];

export type PersonId = "alex" | "bao" | "chi" | "em" | "minh-anh" | "lena" | "gia" | "duy" | "james" | "hana" | "priya" | "daniel" | "linh" | "thu" | "khoa";
export interface Person {
  id: PersonId;
  name: string;
  initials: string;
  role: string;
  team: TeamId;
  email: string;
  city: string;
  /** The holiday calendar they follow. */
  country: HolidayCountry;
  /** Their steady initials colour; a photo (Alex only) replaces it. */
  theme: Exclude<AvatarTheme, "photo">;
  photo?: string;
  /** Who approves their leave and claims. */
  manager?: PersonId;
  joined: string;
}

export const people: Record<PersonId, Person> = {
  alex: { id: "alex", name: "Alex Duong", initials: "AD", role: "Design Lead", team: "design", email: "alex.duong@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "blue", photo: accountPhoto, manager: "khoa", joined: "2021-03-15" },
  bao: { id: "bao", name: "Bao Nguyen", initials: "BN", role: "Product Designer", team: "design", email: "bao.nguyen@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "green", manager: "alex", joined: "2023-06-01" },
  chi: { id: "chi", name: "Chi Tran", initials: "CT", role: "UX Researcher", team: "design", email: "chi.tran@dizai.studio", city: "Hanoi", country: "Vietnam", theme: "pink", manager: "alex", joined: "2022-09-12" },
  em: { id: "em", name: "Em Pham", initials: "EP", role: "Brand Designer", team: "design", email: "em.pham@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "orange", manager: "alex", joined: "2024-02-19" },
  "minh-anh": { id: "minh-anh", name: "Minh Anh Vo", initials: "MV", role: "Motion Designer", team: "design", email: "minhanh.vo@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "violet", manager: "alex", joined: "2025-04-07" },
  lena: { id: "lena", name: "Lena Fischer", initials: "LF", role: "Product Designer", team: "design", email: "lena.fischer@dizai.studio", city: "Berlin", country: "Germany", theme: "cyan", manager: "alex", joined: "2024-10-01" },
  gia: { id: "gia", name: "Gia Pham", initials: "GP", role: "Engineering Lead", team: "engineering", email: "gia.pham@dizai.studio", city: "Hanoi", country: "Vietnam", theme: "indigo", manager: "khoa", joined: "2020-08-03" },
  duy: { id: "duy", name: "Duy Le", initials: "DL", role: "Frontend Engineer", team: "engineering", email: "duy.le@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "teal", manager: "gia", joined: "2023-01-09" },
  james: { id: "james", name: "James Carter", initials: "JC", role: "Senior Backend Engineer", team: "engineering", email: "james.carter@dizai.studio", city: "London", country: "United Kingdom", theme: "brown", manager: "gia", joined: "2022-05-16" },
  hana: { id: "hana", name: "Hana Kim", initials: "HK", role: "Product Manager", team: "product", email: "hana.kim@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "plum", manager: "khoa", joined: "2022-11-21" },
  priya: { id: "priya", name: "Priya Raman", initials: "PR", role: "Marketing Lead", team: "marketing", email: "priya.raman@dizai.studio", city: "Singapore", country: "Singapore", theme: "crimson", manager: "khoa", joined: "2023-08-14" },
  daniel: { id: "daniel", name: "Daniel Brooks", initials: "DB", role: "Partnerships Manager", team: "marketing", email: "daniel.brooks@dizai.studio", city: "New York", country: "United States", theme: "purple", manager: "priya", joined: "2025-01-13" },
  linh: { id: "linh", name: "Linh Hoang", initials: "LH", role: "People Partner", team: "operations", email: "linh.hoang@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "yellow", manager: "khoa", joined: "2021-07-05" },
  thu: { id: "thu", name: "Thu Bui", initials: "TB", role: "Finance Manager", team: "operations", email: "thu.bui@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "red", manager: "khoa", joined: "2021-01-11" },
  khoa: { id: "khoa", name: "Khoa Dang", initials: "KD", role: "Managing Director", team: "operations", email: "khoa.dang@dizai.studio", city: "Ho Chi Minh City", country: "Vietnam", theme: "neutral", joined: "2019-05-02" },
};
export const personList: Person[] = Object.values(people);
/** The signed-in person. */
export const currentUser: Person = people.alex;

/** Avatar props for a person: `<Avatar size="md" {...avatarOf(person)} />` (photo, or initials in their colour). */
export function avatarOf(person: Person): { theme: AvatarTheme; src?: string; alt: string; children?: string } {
  return person.photo ? { theme: "photo", src: person.photo, alt: person.name } : { theme: person.theme, alt: person.name, children: person.initials };
}

/* ── Public holidays 2026 ────────────────────────────────────────────────────────────────────────────────────── */

export interface PublicHoliday {
  id: string;
  country: HolidayCountry;
  name: string;
  start: string;
  end: string;
  /** The working day off when the holiday falls on a weekend. */
  inLieu?: string;
}
export interface HolidayCalendar { country: HolidayCountry; region: string; headcount: number; active: boolean }

/** Who follows which calendar (48 people). */
export const holidayCalendars: HolidayCalendar[] = [
  { country: "Vietnam", region: "Nationwide", headcount: 42, active: true },
  { country: "Singapore", region: "Nationwide", headcount: 2, active: true },
  { country: "United States", region: "Federal", headcount: 1, active: true },
  { country: "United Kingdom", region: "England", headcount: 1, active: true },
  { country: "Germany", region: "Berlin", headcount: 2, active: true },
];

const holiday = (country: HolidayCountry, name: string, start: string, end = start, inLieu?: string): PublicHoliday =>
  ({ id: `${country.toLowerCase().replace(/\s+/g, "-")}-${start}`, country, name, start, end, inLieu });

/** The 2026 public holidays of the five calendars (official dates; weekend holidays carry their day in lieu). */
export const publicHolidays: PublicHoliday[] = [
  holiday("Vietnam", "New Year's Day", "2026-01-01"),
  holiday("Vietnam", "Lunar New Year (Tết)", "2026-02-16", "2026-02-20"),
  holiday("Vietnam", "Hung Kings' Commemoration Day", "2026-04-26", "2026-04-26", "2026-04-27"),
  holiday("Vietnam", "Reunification Day", "2026-04-30"),
  holiday("Vietnam", "International Labour Day", "2026-05-01"),
  holiday("Vietnam", "National Day", "2026-09-01", "2026-09-02"),
  holiday("Vietnam", "Vietnam Culture Day", "2026-11-24"),

  holiday("Singapore", "New Year's Day", "2026-01-01"),
  holiday("Singapore", "Chinese New Year", "2026-02-17", "2026-02-18"),
  holiday("Singapore", "Hari Raya Puasa", "2026-03-21"),
  holiday("Singapore", "Good Friday", "2026-04-03"),
  holiday("Singapore", "Labour Day", "2026-05-01"),
  holiday("Singapore", "Hari Raya Haji", "2026-05-27"),
  holiday("Singapore", "Vesak Day", "2026-05-31", "2026-05-31", "2026-06-01"),
  holiday("Singapore", "National Day", "2026-08-09", "2026-08-09", "2026-08-10"),
  holiday("Singapore", "Deepavali", "2026-11-08", "2026-11-08", "2026-11-09"),
  holiday("Singapore", "Christmas Day", "2026-12-25"),

  holiday("United States", "New Year's Day", "2026-01-01"),
  holiday("United States", "Martin Luther King Jr. Day", "2026-01-19"),
  holiday("United States", "Presidents' Day", "2026-02-16"),
  holiday("United States", "Memorial Day", "2026-05-25"),
  holiday("United States", "Juneteenth", "2026-06-19"),
  holiday("United States", "Independence Day", "2026-07-04", "2026-07-04", "2026-07-03"),
  holiday("United States", "Labor Day", "2026-09-07"),
  holiday("United States", "Columbus Day", "2026-10-12"),
  holiday("United States", "Veterans Day", "2026-11-11"),
  holiday("United States", "Thanksgiving Day", "2026-11-26"),
  holiday("United States", "Christmas Day", "2026-12-25"),

  holiday("United Kingdom", "New Year's Day", "2026-01-01"),
  holiday("United Kingdom", "Good Friday", "2026-04-03"),
  holiday("United Kingdom", "Easter Monday", "2026-04-06"),
  holiday("United Kingdom", "Early May bank holiday", "2026-05-04"),
  holiday("United Kingdom", "Spring bank holiday", "2026-05-25"),
  holiday("United Kingdom", "Summer bank holiday", "2026-08-31"),
  holiday("United Kingdom", "Christmas Day", "2026-12-25"),
  holiday("United Kingdom", "Boxing Day", "2026-12-26", "2026-12-26", "2026-12-28"),

  holiday("Germany", "New Year's Day", "2026-01-01"),
  holiday("Germany", "Good Friday", "2026-04-03"),
  holiday("Germany", "Easter Monday", "2026-04-06"),
  holiday("Germany", "Labour Day", "2026-05-01"),
  holiday("Germany", "Ascension Day", "2026-05-14"),
  holiday("Germany", "Whit Monday", "2026-05-25"),
  holiday("Germany", "German Unity Day", "2026-10-03"),
  holiday("Germany", "Christmas Day", "2026-12-25"),
  holiday("Germany", "St. Stephen's Day", "2026-12-26"),
];

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

/** The working days a holiday takes off (weekdays in its range, plus its day in lieu). */
export function holidayDaysOff(item: PublicHoliday): string[] {
  const days: string[] = [];
  for (const day = toDate(item.start), last = toDate(item.end); day <= last; day.setDate(day.getDate() + 1)) if (!isWeekend(day)) days.push(toIsoDay(day));
  if (item.inLieu) days.push(item.inLieu);
  return days;
}

/** A country's holidays in date order. */
export function holidaysIn(country: HolidayCountry, holidays: PublicHoliday[] = publicHolidays): PublicHoliday[] {
  return holidays.filter((item) => item.country === country).sort((a, b) => a.start.localeCompare(b.start));
}

/** The next holiday on or after a day (today by default), or undefined when the year has none left. */
export function nextHoliday(country: HolidayCountry, from: string = today, holidays: PublicHoliday[] = publicHolidays): PublicHoliday | undefined {
  return holidaysIn(country, holidays).find((item) => (item.inLieu ?? item.end) >= from);
}

/** Mon–Fri days from start to end (both included), minus the country's public holidays when a country is given. */
export function workingDaysBetween(start: DateInput, end: DateInput, country?: HolidayCountry, holidays: PublicHoliday[] = publicHolidays): number {
  const off = new Set(country ? holidaysIn(country, holidays).flatMap(holidayDaysOff) : []);
  let count = 0;
  for (const day = startOfDay(start), last = startOfDay(end); day <= last; day.setDate(day.getDate() + 1)) if (!isWeekend(day) && !off.has(toIsoDay(day))) count += 1;
  return count;
}

/* ── Leave ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export type LeaveKindId = "annual" | "sick" | "family" | "study" | "unpaid";
export interface LeaveKind { id: LeaveKindId; name: string; emoji: string; paid: boolean; /** Days per year. */ allowance: number; description: string; active: boolean }
/** The studio's leave types, each with its emoji Dock Icon. */
export const leaveKinds: Record<LeaveKindId, LeaveKind> = {
  annual: { id: "annual", name: "Annual leave", emoji: "🏝️", paid: true, allowance: 15, description: "Holidays and rest, booked two weeks ahead for five days or more.", active: true },
  sick: { id: "sick", name: "Sick leave", emoji: "🤒", paid: true, allowance: 10, description: "Illness or a medical appointment, with a doctor's note after two days.", active: true },
  family: { id: "family", name: "Family leave", emoji: "🏡", paid: true, allowance: 3, description: "Weddings, funerals and family emergencies.", active: true },
  study: { id: "study", name: "Study leave", emoji: "📚", paid: true, allowance: 3, description: "Courses, conferences and exams that grow your craft.", active: true },
  unpaid: { id: "unpaid", name: "Unpaid leave", emoji: "🧳", paid: false, allowance: 30, description: "Extended time away, agreed with your lead first.", active: true },
};
export const leaveKindList: LeaveKind[] = Object.values(leaveKinds);

export const leaveStatuses = ["Pending", "Approved", "Declined", "Cancelled"] as const;
export type LeaveStatus = (typeof leaveStatuses)[number];
export const leaveStatusTheme: Record<LeaveStatus, BadgeTheme> = { Pending: "yellow", Approved: "green", Declined: "red", Cancelled: "neutral" };

export interface LeaveRequest {
  id: string;
  person: PersonId;
  kind: LeaveKindId;
  start: string;
  end: string;
  /** Working days, net of the person's public holidays. */
  days: number;
  /** A half day off. */
  half?: "morning" | "afternoon";
  status: LeaveStatus;
  submitted: string;
  approver: PersonId;
  /** When it was approved, declined or cancelled. */
  decided?: string;
  /** The requester's reason. */
  note?: string;
  /** The approver's reply. */
  reply?: string;
}

type LeaveSeed = Omit<LeaveRequest, "days" | "approver">;
const leaveSeed: LeaveSeed[] = [
  { id: "leave-14", person: "bao", kind: "annual", start: "2026-10-12", end: "2026-10-14", status: "Pending", submitted: "2026-09-30T09:24", note: "Moving to a new apartment." },
  { id: "leave-13", person: "duy", kind: "unpaid", start: "2026-11-02", end: "2026-11-13", status: "Pending", submitted: "2026-09-29T18:30", note: "Caring for my father after his surgery." },
  { id: "leave-12", person: "chi", kind: "sick", start: "2026-09-29", end: "2026-09-30", status: "Approved", submitted: "2026-09-29T07:52", decided: "2026-09-29T08:30", note: "Flu." },
  { id: "leave-11", person: "alex", kind: "annual", start: "2026-12-28", end: "2026-12-31", status: "Pending", submitted: "2026-09-28T15:20", note: "Year-end break with family." },
  { id: "leave-10", person: "em", kind: "family", start: "2026-10-05", end: "2026-10-07", status: "Pending", submitted: "2026-09-25T11:02", note: "My sister's wedding in Hue." },
  { id: "leave-09", person: "priya", kind: "sick", start: "2026-09-22", end: "2026-09-22", half: "afternoon", status: "Approved", submitted: "2026-09-22T12:10", decided: "2026-09-22T12:40", note: "Dentist appointment." },
  { id: "leave-08", person: "minh-anh", kind: "annual", start: "2026-10-19", end: "2026-10-23", status: "Declined", submitted: "2026-09-21T14:12", decided: "2026-09-22T09:40", note: "Trip to Phu Quoc.", reply: "I'm out that week too. Could you take Oct 26 – Oct 30?" },
  { id: "leave-07", person: "daniel", kind: "annual", start: "2026-11-25", end: "2026-11-27", status: "Approved", submitted: "2026-09-14T17:05", decided: "2026-09-15T09:12", note: "Thanksgiving with family." },
  { id: "leave-06", person: "alex", kind: "annual", start: "2026-10-19", end: "2026-10-23", status: "Approved", submitted: "2026-09-02T09:30", decided: "2026-09-03T10:10", note: "Trip to Japan." },
  { id: "leave-05", person: "lena", kind: "annual", start: "2026-09-28", end: "2026-10-02", status: "Approved", submitted: "2026-08-31T10:00", decided: "2026-08-31T13:25", note: "Hiking in the Alps." },
  { id: "leave-04", person: "alex", kind: "family", start: "2026-09-03", end: "2026-09-04", status: "Cancelled", submitted: "2026-08-24T16:45", decided: "2026-08-31T09:00", note: "Cousin's wedding in Can Tho." },
  { id: "leave-03", person: "alex", kind: "annual", start: "2026-08-17", end: "2026-08-21", status: "Declined", submitted: "2026-07-27T09:10", decided: "2026-07-28T11:20", note: "Beach week in Nha Trang.", reply: "That's the Lumen launch week. Could you move it to October?" },
  { id: "leave-02", person: "alex", kind: "annual", start: "2026-07-20", end: "2026-07-24", status: "Approved", submitted: "2026-06-15T10:05", decided: "2026-06-15T14:30", note: "Family trip to Da Lat." },
  { id: "leave-01", person: "alex", kind: "sick", start: "2026-06-08", end: "2026-06-08", status: "Approved", submitted: "2026-06-08T07:40", decided: "2026-06-08T08:15", note: "Fever." },
];

/** A new request's working days for a person (half days count 0.5). */
export function leaveDays(person: PersonId, start: DateInput, end: DateInput, half?: LeaveRequest["half"]): number {
  return half ? 0.5 : workingDaysBetween(start, end, people[person].country);
}

/** Leave requests across the studio, newest first: past, current (Chi and Lena are off today) and upcoming. */
export const leaveRequests: LeaveRequest[] = leaveSeed.map((request) => ({
  ...request,
  days: leaveDays(request.person, request.start, request.end, request.half),
  approver: people[request.person].manager ?? request.person,
}));

export interface LeaveBalance {
  kind: LeaveKindId;
  allowance: number;
  /** Approved days that have started. */
  used: number;
  /** Approved days still ahead. */
  planned: number;
  /** Days waiting for approval. */
  pending: number;
  /** allowance − used − planned. */
  available: number;
}

/** A person's balance per leave type for 2026, from their requests (Alex's by default). */
export function leaveBalances(requests: LeaveRequest[] = leaveRequests, person: PersonId = currentUser.id, kinds: LeaveKind[] = leaveKindList): LeaveBalance[] {
  const mine = requests.filter((request) => request.person === person && request.start.startsWith("2026"));
  const sum = (kind: LeaveKindId, match: (request: LeaveRequest) => boolean) => mine.filter((request) => request.kind === kind && match(request)).reduce((total, request) => total + request.days, 0);
  return kinds.map((kind) => {
    const used = sum(kind.id, (request) => request.status === "Approved" && request.start <= today);
    const planned = sum(kind.id, (request) => request.status === "Approved" && request.start > today);
    return { kind: kind.id, allowance: kind.allowance, used, planned, pending: sum(kind.id, (request) => request.status === "Pending"), available: kind.allowance - used - planned };
  });
}
/** Alex's balances: Annual 5 of 15 left (4 more pending), Sick 9 of 10, Family 3, Study 3, Unpaid 30. */
export const myLeaveBalances: LeaveBalance[] = leaveBalances();

/** Approved requests that cover a day: who is off (today by default). */
export function peopleOff(day: string = today, requests: LeaveRequest[] = leaveRequests): LeaveRequest[] {
  return requests.filter((request) => request.status === "Approved" && request.start <= day && request.end >= day);
}

/* ── Expenses ────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ExpenseCategoryId = "equipment" | "software" | "travel" | "transport" | "meals" | "team" | "learning";
export interface ExpenseCategory { id: ExpenseCategoryId; name: string; icon: IconName; theme: DockIconTheme; /** Policy limit per claim, when there is one. */ limit?: number }
/** Expense categories, each with its Dock Icon. */
export const expenseCategories: Record<ExpenseCategoryId, ExpenseCategory> = {
  equipment: { id: "equipment", name: "Equipment", icon: "icon-laptop-line", theme: "blue", limit: 1500 },
  software: { id: "software", name: "Software", icon: "icon-terminal-browser-line", theme: "violet" },
  travel: { id: "travel", name: "Travel", icon: "icon-plane-line", theme: "cyan" },
  transport: { id: "transport", name: "Local transport", icon: "icon-car-01-line", theme: "teal", limit: 100 },
  meals: { id: "meals", name: "Meals & entertainment", icon: "icon-restaurant-line", theme: "orange", limit: 150 },
  team: { id: "team", name: "Team events", icon: "icon-users-line", theme: "pink", limit: 400 },
  learning: { id: "learning", name: "Learning", icon: "icon-graduation-hat-line", theme: "green", limit: 500 },
};
export const expenseCategoryList: ExpenseCategory[] = Object.values(expenseCategories);

export const claimStatuses = ["Draft", "Submitted", "Approved", "Paid", "Rejected"] as const;
export type ClaimStatus = (typeof claimStatuses)[number];
export const claimStatusTheme: Record<ClaimStatus, BadgeTheme> = { Draft: "neutral", Submitted: "yellow", Approved: "blue", Paid: "green", Rejected: "red" };

export interface ExpenseClaim {
  /** The claim number people quote ("EXP-1052"). */
  id: string;
  person: PersonId;
  title: string;
  merchant: string;
  category: ExpenseCategoryId;
  /** USD. */
  amount: number;
  /** The day of the purchase. */
  spent: string;
  /** Absent on drafts. */
  submitted?: string;
  status: ClaimStatus;
  approver: PersonId;
  /** When it was approved or rejected. */
  decided?: string;
  /** The payout day, once Paid. */
  paid?: string;
  /** The receipt's file name; absent when it's missing. */
  receipt?: string;
  note?: string;
  /** The approver's reason, on rejections. */
  reply?: string;
}

type ClaimSeed = Omit<ExpenseClaim, "approver">;
const claimSeed: ClaimSeed[] = [
  { id: "EXP-1052", person: "alex", title: "Taxi to the Lumen workshop", merchant: "Grab", category: "transport", amount: 14.8, spent: "2026-09-29", status: "Draft", receipt: "grab-sep-29.jpg" },
  { id: "EXP-1051", person: "chi", title: "Rides to user interviews", merchant: "Grab", category: "transport", amount: 38.6, spent: "2026-09-24", submitted: "2026-09-29T17:40", status: "Submitted", receipt: "grab-rides-sep.pdf", note: "Four interviews across Hanoi." },
  { id: "EXP-1050", person: "alex", title: "Flights to the Hanoi studio", merchant: "Vietnam Airlines", category: "travel", amount: 214.6, spent: "2026-09-21", submitted: "2026-09-25T16:10", status: "Submitted", receipt: "vna-e-ticket.pdf" },
  { id: "EXP-1049", person: "alex", title: "Hotel for the Hanoi studio visit", merchant: "Somerset West Point Hanoi", category: "travel", amount: 286, spent: "2026-09-23", submitted: "2026-09-25T16:14", status: "Submitted", receipt: "somerset-invoice.pdf", note: "Two nights." },
  { id: "EXP-1048", person: "em", title: "Adobe Creative Cloud, October", merchant: "Adobe", category: "software", amount: 59.99, spent: "2026-09-28", submitted: "2026-09-28T09:30", status: "Submitted", receipt: "adobe-oct.pdf" },
  { id: "EXP-1047", person: "bao", title: "Drawing tablet", merchant: "Wacom", category: "equipment", amount: 379, spent: "2026-09-19", submitted: "2026-09-25T14:15", status: "Submitted", receipt: "wacom-order.pdf" },
  { id: "EXP-1046", person: "alex", title: "Figma seats, Q4", merchant: "Figma", category: "software", amount: 165, spent: "2026-09-15", submitted: "2026-09-15T11:00", status: "Approved", decided: "2026-09-16T09:05", receipt: "figma-q4.pdf" },
  { id: "EXP-1045", person: "minh-anh", title: "Motion design course", merchant: "Domestika", category: "learning", amount: 24.9, spent: "2026-09-11", submitted: "2026-09-11T20:30", status: "Approved", decided: "2026-09-14T10:00", receipt: "domestika.pdf" },
  { id: "EXP-1044", person: "lena", title: "Train to the Hamburg workshop", merchant: "Deutsche Bahn", category: "travel", amount: 142.8, spent: "2026-09-03", submitted: "2026-09-04T08:50", status: "Paid", decided: "2026-09-04T15:20", paid: "2026-09-15", receipt: "db-ticket.pdf" },
  { id: "EXP-1043", person: "duy", title: "Mechanical keyboard", merchant: "Keychron", category: "equipment", amount: 189, spent: "2026-08-30", submitted: "2026-08-31T10:20", status: "Rejected", decided: "2026-09-01T09:00", receipt: "keychron.pdf", reply: "Keyboards come from IT. Order one from the equipment catalogue instead." },
  { id: "EXP-1042", person: "alex", title: "Design team dinner", merchant: "Pizza 4P's", category: "team", amount: 229, spent: "2026-08-28", submitted: "2026-08-29T10:00", status: "Paid", decided: "2026-08-31T09:30", paid: "2026-09-10", receipt: "pizza-4ps.jpg", note: "Nine people, end of the Lumen sprint." },
  { id: "EXP-1041", person: "daniel", title: "Lunch with Kestrel Health", merchant: "The Smith", category: "meals", amount: 142, spent: "2026-08-26", submitted: "2026-08-27T09:15", status: "Approved", decided: "2026-08-27T16:40", receipt: "the-smith.jpg" },
  { id: "EXP-1040", person: "priya", title: "Tech in Asia conference pass", merchant: "Tech in Asia", category: "learning", amount: 349, spent: "2026-08-19", submitted: "2026-08-19T13:00", status: "Paid", decided: "2026-08-20T10:30", paid: "2026-09-01", receipt: "tia-pass.pdf" },
  { id: "EXP-1039", person: "alex", title: "Dinner with the Lumen team", merchant: "Cục Gạch Quán", category: "meals", amount: 186.5, spent: "2026-08-14", submitted: "2026-08-17T09:40", status: "Rejected", decided: "2026-08-18T10:15", receipt: "cuc-gach.jpg", reply: "Client dinners are capped at $150. Resubmit up to the limit." },
  { id: "EXP-1038", person: "alex", title: "USB-C hub and display cable", merchant: "FPT Shop", category: "equipment", amount: 64.9, spent: "2026-08-12", submitted: "2026-08-12T15:30", status: "Paid", decided: "2026-08-13T09:00", paid: "2026-08-25", receipt: "fpt-shop.pdf" },
  { id: "EXP-1037", person: "alex", title: "UX course membership", merchant: "Interaction Design Foundation", category: "learning", amount: 199, spent: "2026-07-14", submitted: "2026-07-14T11:20", status: "Paid", decided: "2026-07-15T10:00", paid: "2026-07-30", receipt: "idf-membership.pdf" },
];

/** Expense claims from the last three months, newest first: Alex's own (8, every status) and other people's. */
export const expenseClaims: ExpenseClaim[] = claimSeed.map((claim) => ({ ...claim, approver: people[claim.person].manager ?? claim.person }));

export type Quarter = "Q3 2026" | "Q4 2026";
export interface TeamBudget {
  team: TeamId;
  quarter: Quarter;
  budget: number;
  /** Paid out so far. */
  spent: number;
  /** Approved or submitted, not paid yet. */
  committed: number;
}
/** Team budgets: Q3 closes today (Marketing ran over), Q4 starts tomorrow with its first commitments. */
export const teamBudgets: TeamBudget[] = [
  { team: "design", quarter: "Q3 2026", budget: 12000, spent: 11426.4, committed: 480 },
  { team: "engineering", quarter: "Q3 2026", budget: 28000, spent: 24915.75, committed: 1260 },
  { team: "product", quarter: "Q3 2026", budget: 8000, spent: 6120, committed: 0 },
  { team: "marketing", quarter: "Q3 2026", budget: 15000, spent: 15842.3, committed: 349 },
  { team: "operations", quarter: "Q3 2026", budget: 10000, spent: 7356.2, committed: 212 },
  { team: "design", quarter: "Q4 2026", budget: 12500, spent: 0, committed: 2340 },
  { team: "engineering", quarter: "Q4 2026", budget: 30000, spent: 0, committed: 6480 },
  { team: "product", quarter: "Q4 2026", budget: 8000, spent: 0, committed: 950 },
  { team: "marketing", quarter: "Q4 2026", budget: 18000, spent: 0, committed: 4200 },
  { team: "operations", quarter: "Q4 2026", budget: 10000, spent: 0, committed: 1150 },
];

export interface MonthlySpend { month: string; label: string; spend: Record<ExpenseCategoryId, number> }
/** Studio spend per category, Apr–Sep 2026 (Jul–Sep add up to the Q3 team spend, $65,660.65). */
export const monthlySpend: MonthlySpend[] = [
  { month: "2026-04", label: "Apr", spend: { equipment: 4096.6, software: 5438.34, travel: 3089.31, transport: 948.21, meals: 2826.89, team: 1646.51, learning: 1794.49 } },
  { month: "2026-05", label: "May", spend: { equipment: 4624.08, software: 5542.59, travel: 3434.91, transport: 970.91, meals: 3151.74, team: 1739.31, learning: 1812.36 } },
  { month: "2026-06", label: "Jun", spend: { equipment: 4183.22, software: 5008.16, travel: 3740.81, transport: 938.91, meals: 2982.62, team: 1667.62, learning: 1889.26 } },
  { month: "2026-07", label: "Jul", spend: { equipment: 3609.35, software: 6138.91, travel: 4046.64, transport: 924.46, meals: 2871.92, team: 1897.2, learning: 1891.72 } },
  { month: "2026-08", label: "Aug", spend: { equipment: 4078.67, software: 5515.94, travel: 3736.14, transport: 976.27, meals: 2636.63, team: 1915.56, learning: 2055.89 } },
  { month: "2026-09", label: "Sep", spend: { equipment: 4398.56, software: 6304.61, travel: 3858.03, transport: 1071.3, meals: 3621.54, team: 1827.77, learning: 2283.54 } },
];

/* ── Workbench: spaces and tasks ─────────────────────────────────────────────────────────────────────────────── */

export type SpaceId = "product-design" | "development" | "marketing";
export interface Space { id: SpaceId; name: string; /** Task key prefix. */ key: string; initial: string; theme: Exclude<AvatarTheme, "photo">; projects: string[] }
/** Workbench spaces; the Sidebar marks each with a Solid XSmall Avatar of its initial. */
export const spaces: Record<SpaceId, Space> = {
  "product-design": { id: "product-design", name: "Product Design", key: "PD", initial: "P", theme: "accent", projects: ["Lumen app", "Design system"] },
  development: { id: "development", name: "Development", key: "DEV", initial: "D", theme: "purple", projects: ["Lumen app", "Client portal"] },
  marketing: { id: "marketing", name: "Marketing", key: "MKT", initial: "M", theme: "orange", projects: ["Studio website"] },
};
export const spaceList: Space[] = Object.values(spaces);

export const taskStatuses = ["To do", "In progress", "In review", "Done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const taskStatusTheme: Record<TaskStatus, BadgeTheme> = { "To do": "neutral", "In progress": "blue", "In review": "yellow", Done: "green" };
/** How far along each status is, for a ProgressCircle status mark (0 · 25 · 50 · 100). */
export const taskStatusProgress: Record<TaskStatus, number> = { "To do": 0, "In progress": 25, "In review": 50, Done: 100 };

export const taskPriorities = ["Urgent", "High", "Medium", "Low"] as const;
export type TaskPriority = (typeof taskPriorities)[number];
/** Priority mark: the flag icon in its family's Light content colour (`<Icon name={icon} tone={tone} />`: Light is the icon level), or a Badge theme. */
export const taskPriorityMeta: Record<TaskPriority, { icon: IconName; tone: TextTone; theme: BadgeTheme }> = {
  Urgent: { icon: "icon-flag-03-solid", tone: "negative-light", theme: "red" },
  High: { icon: "icon-flag-03-solid", tone: "warning-light", theme: "orange" },
  Medium: { icon: "icon-flag-03-solid", tone: "info-light", theme: "blue" },
  Low: { icon: "icon-flag-03-solid", tone: "light", theme: "neutral" },
};

export type TaskLabel = "UI design" | "UX research" | "Design system" | "Motion" | "Frontend" | "Backend" | "Bug" | "Content";
export const taskLabelTheme: Record<TaskLabel, BadgeTheme> = {
  "UI design": "orange", "UX research": "violet", "Design system": "cyan", Motion: "plum", Frontend: "blue", Backend: "indigo", Bug: "red", Content: "pink",
};

export interface Task {
  /** The task key ("PD-142"). */
  id: string;
  title: string;
  space: SpaceId;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: PersonId[];
  reporter: PersonId;
  start?: string;
  due: string;
  labels: TaskLabel[];
  description: string;
  updated: string;
}

/** Tasks across the three spaces: 5 to do, 5 in progress, 4 in review, 4 done; one overdue, one due today. */
export const tasks: Task[] = [
  { id: "PD-145", title: "Icon set for spending categories", space: "product-design", project: "Lumen app", status: "To do", priority: "Low", assignees: ["em"], reporter: "alex", due: "2026-10-16", labels: ["UI design"], description: "Twelve category icons in the Lumen style, line and solid.", updated: "2026-09-29T11:05" },
  { id: "PD-144", title: "Interview five small-business owners", space: "product-design", project: "Lumen app", status: "In progress", priority: "Medium", assignees: ["chi"], reporter: "alex", start: "2026-09-24", due: "2026-10-07", labels: ["UX research"], description: "Learn how owners split personal and business spending before we design budgets.", updated: "2026-09-28T16:20" },
  { id: "PD-143", title: "Usability test the new onboarding", space: "product-design", project: "Lumen app", status: "To do", priority: "Medium", assignees: ["chi"], reporter: "alex", start: "2026-10-05", due: "2026-10-09", labels: ["UX research"], description: "Five moderated sessions on the prototype, with a summary of the top issues.", updated: "2026-09-25T10:40" },
  { id: "PD-142", title: "Redesign the Lumen onboarding flow", space: "product-design", project: "Lumen app", status: "In progress", priority: "High", assignees: ["alex", "bao"], reporter: "hana", start: "2026-09-21", due: "2026-10-02", labels: ["UI design"], description: "Cut sign-up from seven steps to four and verify identity later.", updated: "2026-09-30T08:05" },
  { id: "PD-140", title: "Card transfer confirmation screens", space: "product-design", project: "Lumen app", status: "In review", priority: "High", assignees: ["bao"], reporter: "hana", start: "2026-09-17", due: "2026-10-01", labels: ["UI design"], description: "Success, pending and failed states for card-to-card transfers.", updated: "2026-09-29T17:55" },
  { id: "PD-138", title: "Audit tables for dark mode", space: "product-design", project: "Design system", status: "In review", priority: "Urgent", assignees: ["lena", "alex"], reporter: "alex", start: "2026-09-22", due: "2026-09-30", labels: ["Design system"], description: "Check every table cell and state against the dark colour tokens.", updated: "2026-09-30T10:32" },
  { id: "PD-136", title: "Loading and success animations", space: "product-design", project: "Lumen app", status: "In progress", priority: "Medium", assignees: ["minh-anh"], reporter: "bao", start: "2026-09-14", due: "2026-09-28", labels: ["Motion"], description: "Lottie files for loading, success and error, under 30 KB each.", updated: "2026-09-25T15:10" },
  { id: "PD-139", title: "Document button usage guidelines", space: "product-design", project: "Design system", status: "Done", priority: "Low", assignees: ["em"], reporter: "alex", due: "2026-09-25", labels: ["Design system", "Content"], description: "When to use each level, with do and don't examples.", updated: "2026-09-24T14:00" },
  { id: "PD-133", title: "Sync colour tokens with the Figma library", space: "product-design", project: "Design system", status: "Done", priority: "High", assignees: ["lena"], reporter: "alex", due: "2026-09-18", labels: ["Design system"], description: "Export the variables and update the token package.", updated: "2026-09-17T18:30" },
  { id: "DEV-316", title: "Rate limit the public API", space: "development", project: "Lumen app", status: "To do", priority: "High", assignees: ["james"], reporter: "gia", due: "2026-10-21", labels: ["Backend"], description: "100 requests a minute per key, with clear 429 responses.", updated: "2026-09-23T09:45" },
  { id: "DEV-314", title: "Ship dark mode tokens to the web app", space: "development", project: "Client portal", status: "To do", priority: "Medium", assignees: ["duy"], reporter: "gia", due: "2026-10-14", labels: ["Frontend", "Design system"], description: "Swap hard-coded colours for the new tokens and test both themes.", updated: "2026-09-22T11:30" },
  { id: "DEV-311", title: "Fix the date picker focus trap in Safari", space: "development", project: "Client portal", status: "In progress", priority: "Urgent", assignees: ["duy"], reporter: "chi", start: "2026-09-29", due: "2026-10-01", labels: ["Bug", "Frontend"], description: "Tab leaves the open calendar in Safari 18; keep focus inside until it closes.", updated: "2026-09-30T09:50" },
  { id: "DEV-308", title: "Build the onboarding API endpoints", space: "development", project: "Lumen app", status: "In review", priority: "High", assignees: ["james"], reporter: "gia", start: "2026-09-15", due: "2026-10-02", labels: ["Backend"], description: "Create, resume and finish sign-up, with identity checks queued.", updated: "2026-09-29T19:10" },
  { id: "DEV-305", title: "Upgrade the client portal to React 19", space: "development", project: "Client portal", status: "Done", priority: "Medium", assignees: ["duy", "gia"], reporter: "gia", due: "2026-09-24", labels: ["Frontend"], description: "Move to React 19 and remove the deprecated lifecycle code.", updated: "2026-09-24T17:25" },
  { id: "MKT-61", title: "Shoot team photos in the Hanoi studio", space: "marketing", project: "Studio website", status: "To do", priority: "Low", assignees: ["em", "linh"], reporter: "priya", due: "2026-10-23", labels: ["Content"], description: "Portraits and candid shots for the careers page.", updated: "2026-09-21T10:15" },
  { id: "MKT-58", title: "Write the Lumen case study", space: "marketing", project: "Studio website", status: "In progress", priority: "Medium", assignees: ["priya", "alex"], reporter: "priya", start: "2026-09-21", due: "2026-10-09", labels: ["Content"], description: "The problem, our process and the launch results, in 1,200 words.", updated: "2026-09-29T13:40" },
  { id: "MKT-55", title: "Refresh the careers page", space: "marketing", project: "Studio website", status: "In review", priority: "Medium", assignees: ["bao", "priya"], reporter: "priya", start: "2026-09-14", due: "2026-10-05", labels: ["UI design", "Content"], description: "New layout, open roles from the ATS and the team photos.", updated: "2026-09-28T12:00" },
  { id: "MKT-52", title: "Publish the Q3 newsletter", space: "marketing", project: "Studio website", status: "Done", priority: "Low", assignees: ["daniel"], reporter: "priya", due: "2026-09-29", labels: ["Content"], description: "Studio news, the Lumen launch and three open roles.", updated: "2026-09-29T09:00" },
];

/* ── Inbox and assistant ─────────────────────────────────────────────────────────────────────────────────────── */

export interface InboxItem {
  id: string;
  title: string;
  caption: string;
  at: string;
  /** A person's request leads with their Avatar… */
  person?: PersonId;
  /** …a system update with a Dock Icon. */
  icon?: IconName;
  theme?: DockIconTheme;
  unread: boolean;
  /** Where it leads (an HrShell navigation target). */
  target: { module: "time-off" | "expenses" | "workbench"; page: string };
}

const leaveOf = (id: string) => leaveRequests.find((request) => request.id === id)!;
const claimOf = (id: string) => expenseClaims.find((claim) => claim.id === id)!;
const leaveCaption = (request: LeaveRequest) => `${leaveKinds[request.kind].name} · ${formatRange(request.start, request.end)}`;
const culture = publicHolidays.find((item) => item.id === "vietnam-2026-11-24")!;

/** Alex's notifications, newest first. */
export const inboxItems: InboxItem[] = [
  { id: "inbox-5", title: "Lena Fischer moved PD-138", caption: "In review · Audit tables for dark mode", at: "2026-09-30T10:32", person: "lena", unread: true, target: { module: "workbench", page: "tasks" } },
  { id: "inbox-4", title: `Bao Nguyen requested ${formatDays(leaveOf("leave-14").days)} off`, caption: leaveCaption(leaveOf("leave-14")), at: leaveOf("leave-14").submitted, person: "bao", unread: true, target: { module: "time-off", page: "approvals" } },
  { id: "inbox-3", title: "Chi Tran submitted an expense", caption: `${claimOf("EXP-1051").title} · ${formatMoney(claimOf("EXP-1051").amount)}`, at: claimOf("EXP-1051").submitted!, person: "chi", unread: true, target: { module: "expenses", page: "approvals" } },
  { id: "inbox-2", title: `Public holiday on ${formatDate(culture.start, { year: false })}`, caption: `${culture.name} · Both studios closed`, at: "2026-09-28T08:00", icon: "icon-calendar-heart-line", theme: "red", unread: false, target: { module: "time-off", page: "public-holiday" } },
  { id: "inbox-1", title: "Figma seats claim approved", caption: `${claimOf("EXP-1046").id} · ${formatMoney(claimOf("EXP-1046").amount)}`, at: claimOf("EXP-1046").decided!, icon: "icon-check-circle-line", theme: "green", unread: false, target: { module: "expenses", page: "my-expenses" } },
];

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Canned Zen AI answers built from the data above; replace with your assistant's API. */
export function assistantAnswer(prompt: string): string {
  const me = currentUser;
  const annual = myLeaveBalances.find((balance) => balance.kind === "annual")!;
  const leaveToApprove = leaveRequests.filter((request) => request.approver === me.id && request.status === "Pending");
  const claimsToApprove = expenseClaims.filter((claim) => claim.approver === me.id && claim.status === "Submitted");
  const myOpenClaims = expenseClaims.filter((claim) => claim.person === me.id && claim.status === "Submitted");
  const budget = teamBudgets.find((item) => item.team === me.team && item.quarter === "Q3 2026")!;
  const off = peopleOff().map((request) => people[request.person].name);
  const holiday = nextHoliday(me.country);
  const due = tasks.filter((task) => task.assignees.includes(me.id) && task.status !== "Done").sort((a, b) => a.due.localeCompare(b.due));
  if (/approv|review|wait/i.test(prompt)) return `${count(leaveToApprove.length, "leave request")} and ${count(claimsToApprove.length, "expense claim")} are waiting for you.`;
  if (/leave|time off|day off|balance|holiday/i.test(prompt)) return [`You have ${formatDays(annual.available)} of annual leave left this year, and ${formatDays(annual.pending)} waiting for approval.`, holiday ? `The next public holiday is ${holiday.name}, ${formatDate(holiday.start, { weekday: true })}.` : ""].join(" ").trim();
  if (/expense|claim|spend|budget/i.test(prompt)) return `${teams[me.team].name} has spent ${formatMoney(budget.spent)} of its ${formatMoney(budget.budget, { cents: false })} Q3 budget. ${count(myOpenClaims.length, "of your claims is", "of your claims are")} waiting for approval.`;
  if (/task|due|work/i.test(prompt) && due.length) return `You have ${count(due.length, "open task")}. The next one due is ${due[0].id}, “${due[0].title}”, ${daysFromToday(due[0].due) === 0 ? "today" : `on ${formatDate(due[0].due, { year: false })}`}.`;
  return `${off.length ? `${off.join(" and ")} ${off.length === 1 ? "is" : "are"} off today, and` : "Everyone is in today, and"} ${count(leaveToApprove.length + claimsToApprove.length, "request is", "requests are")} waiting for your approval.`;
}
