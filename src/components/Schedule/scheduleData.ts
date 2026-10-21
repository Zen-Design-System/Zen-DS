// Data for the Schedule views (Figma ❖ Schedule 16121:6). Dates read like the Calendar's (`toDate`: a Date or a local
// ISO string), so Studio pages and AI UI specs can hold them.
import { addDays, MINUTE, startOfDay, startOfWeek, toDate, type CalendarColor, type CalendarDateInput } from "../Calendar/calendarDates";

/** An Event-Card's hue: the calendar colours plus `neutral` for personal blocks (Figma Event-Card Color). */
export type ScheduleColor = CalendarColor | "neutral";

/** A row of the Resource-Grid: a person or a room (any resource: a vehicle, a device). */
export interface ScheduleResourceData {
  id: string;
  /** Full name ("Alex Duong"). */
  name: string;
  /** The phone's 64px column shows this (default: the first word of `name`). */
  shortName?: string;
  /** A role or a capacity ("Designer", "8 seats"). */
  meta?: string;
  /** `person` (Avatar) or `room` (Dock-Icon). Default person. (`kind`, not `type`: a data object with `type` reads as a
   * component node in an AI UI spec.) */
  kind?: "person" | "room";
  /** Person: the photo. */
  avatarSrc?: string;
}

/** A booking, shift or leave on a resource's row. */
export interface ScheduleBookingData {
  id: string;
  /** The row it sits on (ScheduleResourceData.id). */
  resourceId: string;
  title: string;
  start: CalendarDateInput;
  end: CalendarDateInput;
  color?: CalendarColor;
  /** The bar's second line. Default: "10:30 – 12:00" on the Hours scale, "Mon – Wed" on the Days scale. */
  time?: string;
}

/** One stop of an itinerary. */
export interface ScheduleStopData {
  id: string;
  title: string;
  start: CalendarDateInput;
  end: CalendarDateInput;
  /** Place · who ("Room 2 · Linh Tran"). */
  meta?: string;
}

/** A bookable time of the Slot-Picker. `id` is the value the picker reports ("2026-10-01T10:00" works well). */
export interface ScheduleSlotData {
  id: string;
  /** The slot's start; its label is the time ("10:00") and it is grouped into Morning / Afternoon on phones. */
  start: CalendarDateInput;
  /** Taken or past: struck through, still in place. */
  disabled?: boolean;
}

/** One card of the Day-Planner. */
export interface ScheduleCardData {
  id: string;
  title: string;
  start: CalendarDateInput;
  end: CalendarDateInput;
  color?: ScheduleColor;
  /** In words ("Done", "In progress", "Upcoming"). */
  status?: string;
  note?: string;
  attendees?: Array<{ src?: string; alt?: string }>;
}

/** Minutes from `from` to `to`. */
export const minutesBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / MINUTE);

/** The columns of a Resource-Grid scale: hours of `date` from `startHour` to `endHour`, or the 7 days of its week. */
export function scaleColumns(date: CalendarDateInput, scale: "hours" | "days", startHour: number, endHour: number) {
  const day = startOfDay(toDate(date));
  if (scale === "days") {
    const monday = startOfWeek(day);
    return Array.from({ length: 7 }, (_, index) => ({ start: addDays(monday, index), end: addDays(monday, index + 1) }));
  }
  return Array.from({ length: Math.max(1, endHour - startHour) }, (_, index) => ({
    start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour + index),
    end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour + index + 1),
  }));
}

/** Where `value` falls on a scale that runs from `from` over `count` columns of `step` ms: in columns, unclipped (a bar
 * that starts before the range starts below 0 and scrolls in with the track, never squeezed to the edge). */
export const columnsAt = (value: Date, from: Date, step: number) => (value.getTime() - from.getTime()) / step;

/** A stop's status at `now`: past once it has ended, now while it runs, upcoming before it starts. */
export function stopStatus(start: Date, end: Date, now: Date): "past" | "now" | "upcoming" {
  if (end.getTime() <= now.getTime()) return "past";
  if (start.getTime() <= now.getTime()) return "now";
  return "upcoming";
}
