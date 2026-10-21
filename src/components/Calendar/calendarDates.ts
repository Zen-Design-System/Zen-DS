// Date arithmetic and layout for the Calendar views (Figma ❖ Calendar 16121:3). Local time throughout: a calendar
// shows the wall clock of the person reading it. Weeks start on Monday, as every Figma Calendar set draws them.

/** The Support hues an event can take (Figma `Color` of .Primitives/Calendar/Event, Event-Block and Agenda-Item). */
export const calendarColors = ["brand", "blue", "violet", "teal", "green", "orange", "pink"] as const;
/** The event's calendar colour. Brand is the default; the other hues only tell calendars apart. */
export type CalendarColor = (typeof calendarColors)[number];

/** The views the Toolbar's switch offers (Figma: Month, Week, Day; 3-Day on phones; Agenda). */
export const calendarViews = ["month", "week", "day", "3-day", "agenda"] as const;
export type CalendarView = (typeof calendarViews)[number];

/**
 * A day or a moment: a `Date`, or an ISO string read in local time — "2026-09-30" (that day) or "2026-09-30T09:00"
 * (that minute). Strings let a page that holds only literals (a Zen Studio page, an AI UI spec) say a date.
 */
export type CalendarDateInput = Date | string;

/** One event, as the data-driven views (Month, Time-Grid, Agenda, Week-Strip) take it. */
export interface CalendarEventData {
  /** Stable key (also passed back by `onEventClick`). */
  id: string;
  title: string;
  /** Start ("2026-09-30T09:00" or a Date). For an all-day event only the day counts ("2026-10-01"). */
  start: CalendarDateInput;
  /** End (exclusive). Default: start + 30 minutes for a timed event, the end of the start day for an all-day one. An
   * all-day event whose end falls on a later day runs over every day up to it. */
  end?: CalendarDateInput;
  /** Figma Kind=All-day: a Solid chip, no time; in the Time-Grid's all-day row and "All day" in the Agenda. */
  allDay?: boolean;
  /** The event's calendar colour (default brand). */
  color?: CalendarColor;
  /** Agenda-Item Meta: place · link ("Room 2 · Google Meet"). */
  meta?: string;
  /** Agenda-Item Attendees (desktop): the people, as AvatarStack items. */
  attendees?: Array<{ src?: string; alt?: string }>;
}

/** An event with its dates read: what the views lay out. `source` is the object the app passed (onEventClick gets it). */
export interface CalendarEventDates extends Omit<CalendarEventData, "start" | "end"> { start: Date; end?: Date; source: CalendarEventData }

const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
/** A `CalendarDateInput` as a Date: an ISO day or minute in local time (never UTC), anything else through `new Date`. */
export function toDate(value: CalendarDateInput): Date {
  if (value instanceof Date) return value;
  const match = ISO.exec(value.trim());
  if (!match) return new Date(value);
  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}
/** `toDate` that passes `undefined` and `null` through (optional and controlled-empty props). */
export function toDateOr<T extends null | undefined>(value: CalendarDateInput | T): Date | T {
  return value === undefined || value === null ? (value as T) : toDate(value);
}
/** The events with their dates read, in the order given. */
export function readEvents(events: readonly CalendarEventData[]): CalendarEventDates[] {
  return events.map((event) => ({ ...event, start: toDate(event.start), end: event.end === undefined ? undefined : toDate(event.end), source: event }));
}

export const MINUTE = 60_000;
const DAY = 86_400_000;

export function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
export function addDays(date: Date, days: number) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days); }
export function addMonths(date: Date, months: number) { return new Date(date.getFullYear(), date.getMonth() + months, 1); }
export function monthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
export function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
/** A day's key (its local midnight in ms): equal days, equal keys. */
export function dayKey(date: Date) { return startOfDay(date).getTime(); }
/** The Monday of `date`'s week. */
export function startOfWeek(date: Date) { const day = startOfDay(date); return addDays(day, -((day.getDay() + 6) % 7)); }
/** The days of `date`'s week, Monday first. */
export function weekDays(date: Date) { const monday = startOfWeek(date); return Array.from({ length: 7 }, (_, index) => addDays(monday, index)); }

/** The weeks of `month`'s grid, Monday first: 5 weeks, or 6 when the month spans six (Figma Sixth-Week). Days of the
 * previous and next month fill the first and last week (Day-Cell State=Outside). */
export function monthWeeks(month: Date) {
  const first = monthStart(month);
  const start = startOfWeek(first);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const count = Math.round((startOfWeek(last).getTime() - start.getTime()) / (7 * DAY)) + 1;
  return Array.from({ length: Math.max(5, count) }, (_, week) => Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)));
}

/** The end of an event (exclusive), with the defaults of `CalendarEventData.end`. */
export function eventEnd(event: CalendarEventDates) {
  if (event.end && event.end.getTime() > event.start.getTime()) return event.end;
  return event.allDay ? addDays(startOfDay(event.start), 1) : new Date(event.start.getTime() + 30 * MINUTE);
}

/** Whether `event` falls on `day` (an all-day event on each day it covers; a timed one on the days its hours touch). */
export function eventOnDay(event: CalendarEventDates, day: Date) {
  const from = startOfDay(day).getTime();
  const to = addDays(day, 1).getTime();
  const start = event.allDay ? startOfDay(event.start).getTime() : event.start.getTime();
  const end = event.allDay ? Math.max(startOfDay(eventEnd(event)).getTime(), start + 1) : eventEnd(event).getTime();
  return start < to && end > from;
}

/** The events on `day`, all-day first, then by start time, then the longer first. */
export function eventsOnDay(events: readonly CalendarEventDates[], day: Date) {
  return events.filter((event) => eventOnDay(event, day)).sort(compareEvents);
}

export function compareEvents(a: CalendarEventDates, b: CalendarEventDates) {
  if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1;
  return a.start.getTime() - b.start.getTime() || eventEnd(b).getTime() - eventEnd(a).getTime() || a.title.localeCompare(b.title);
}

/** A placed timed event in one day column: its lane among the events it overlaps and how many lanes that group uses
 * (Figma Time-Grid: "Overlapping events split the column width"). */
export interface PlacedEvent { event: CalendarEventDates; start: Date; end: Date; lane: number; lanes: number }

/** Lays out the timed events of `day` in lanes: each overlapping group shares the column, an event takes the first
 * free lane. Start and end are clipped to the day. */
export function layoutDay(events: readonly CalendarEventDates[], day: Date): PlacedEvent[] {
  const from = startOfDay(day).getTime();
  const to = addDays(day, 1).getTime();
  const timed = events.filter((event) => !event.allDay && eventOnDay(event, day)).sort(compareEvents);
  const placed: PlacedEvent[] = [];
  let group: PlacedEvent[] = [];
  let groupEnd = -Infinity;
  const closeGroup = () => { const lanes = Math.max(1, ...group.map((item) => item.lane + 1)); for (const item of group) item.lanes = lanes; group = []; };
  for (const event of timed) {
    const start = Math.max(event.start.getTime(), from);
    const end = Math.min(eventEnd(event).getTime(), to);
    if (start >= groupEnd) closeGroup();
    const busy = new Set(group.filter((item) => item.end.getTime() > start).map((item) => item.lane));
    let lane = 0;
    while (busy.has(lane)) lane += 1;
    const item: PlacedEvent = { event, start: new Date(start), end: new Date(end), lane, lanes: 1 };
    group.push(item);
    placed.push(item);
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return placed;
}

/* ── formatting (Intl, in the provider's locale) ──────────────────────────────────────────────────────────────────── */

const formats = new Map<string, Intl.DateTimeFormat>();
function format(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let value = formats.get(key);
  if (!value) { value = new Intl.DateTimeFormat(locale, options); formats.set(key, value); }
  return value;
}

/** "09:00" — 24-hour, as Figma writes every time. */
export function formatTime(date: Date, locale: string) { return format(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date); }
/** "09:00 – 10:00" (Event-Block Time). */
export function formatTimeRange(start: Date, end: Date, locale: string) { return `${formatTime(start, locale)} – ${formatTime(end, locale)}`; }
/** "Wednesday, September 30, 2026": a day's accessible name. */
export function formatFullDate(date: Date, locale: string) { return format(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(date); }
/** "Wed" (short weekday). */
export function formatWeekday(date: Date, locale: string) { return format(locale, { weekday: "short" }).format(date); }
/** "M" (narrow weekday, the mobile month header). */
export function formatWeekdayNarrow(date: Date, locale: string) { return format(locale, { weekday: "narrow" }).format(date); }
/** "Wed, Sep 30" (the mobile agenda kicker). */
export function formatShortDate(date: Date, locale: string) { return format(locale, { weekday: "short", month: "short", day: "numeric" }).format(date); }

/**
 * The Toolbar title for the period around `date` (Figma Title "September 2026"): the month for Month and Agenda, the week's
 * span for Week ("Sep 28 – Oct 4, 2026"), the three days for 3-Day, the full date for Day. `short` (the phone toolbar,
 * where Heading/3 is 26px in the Mobile typography): "Sep 2026", "Sep 28 – Oct 4", "Wed, Sep 30".
 */
export function calendarTitle(date: Date, view: CalendarView, locale: string, { short = false }: { short?: boolean } = {}) {
  if (view === "month" || view === "agenda") return format(locale, { month: short ? "short" : "long", year: "numeric" }).format(date);
  if (view === "day") return format(locale, short ? { weekday: "short", month: "short", day: "numeric" } : { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
  const from = view === "week" ? startOfWeek(date) : addDays(startOfDay(date), -1);
  const to = addDays(from, view === "week" ? 6 : 2);
  return format(locale, short ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).formatRange(from, to);
}

/** The period Previous / Next move by for `view`: a month, a week, three days or one day. */
export function shiftPeriod(date: Date, view: CalendarView, step: 1 | -1) {
  if (view === "month") return addMonths(date, step);
  if (view === "week" || view === "agenda") return addDays(date, 7 * step);
  return addDays(date, (view === "3-day" ? 3 : 1) * step);
}
