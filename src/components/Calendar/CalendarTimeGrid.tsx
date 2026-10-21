import { useEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type MouseEvent, type Ref } from "react";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { CalendarDate, CalendarEvent, CalendarEventBlock, CalendarNowLine, useCalendarDevice, type CalendarDevice } from "./Calendar";
import { addDays, calendarTitle, dayKey, eventEnd, eventsOnDay, formatFullDate, formatTimeRange, formatWeekday, layoutDay, MINUTE, readEvents, startOfDay, startOfWeek, toDateOr, type CalendarDateInput, type CalendarEventData } from "./calendarDates";
import "./calendar.css";

/** The Time-Grid's views: a week (desktop), one day, or three days around the date (mobile). */
export type CalendarTimeGridView = "week" | "day" | "3-day";

export interface CalendarTimeGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Figma View: `week` (Monday to Sunday), `day`, or `3-day` (the day before, the day, the day after). Default `week`
   * on desktop and `3-day` on mobile; `week` on a phone draws the 3-Day grid (a week does not fit). */
  view?: CalendarTimeGridView;
  /** The day the view is built around ("2026-09-30" or a Date). Default: today. */
  date?: CalendarDateInput;
  /** The events: all-day ones in the all-day row, timed ones as blocks at their hours. */
  events?: CalendarEventData[];
  /** First hour shown (default 8: 08:00). */
  startHour?: number;
  /** Hour the grid ends at (default 18: the last row is 17:00–18:00). Extend it for longer days. */
  endHour?: number;
  /** The current time: the now line in today's column. Default: the device clock, updated every minute. */
  now?: CalendarDateInput;
  /** The day treated as today (the Accent date, the now line). Default: `now`'s day. */
  today?: CalendarDateInput;
  /** Pressing an event: open its details, anchored to `target`. Without it the blocks are static. */
  onEventClick?: (event: CalendarEventData, target: HTMLElement) => void;
  /** The event whose details are open: its block (or chip) shows State=Selected. */
  selectedEventId?: string | null;
  /** Pressing an empty slot (pointer): the start of that half hour, to create an event there. Keyboard users create
   * events from the page's main action. */
  onSlotPress?: (start: Date) => void;
  /** Figma Device: `desktop` (56px hour gutter) or `mobile` (44px). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Names the grid (default: the period, "Sep 28 – Oct 4, 2026"). */
  "aria-label"?: string;
  /** Figma instance overrides of the blocks and dates it draws (`{ "Day[2]/Date": { size: "md" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** The device clock, re-read each minute (the now line moves). */
function useMinuteClock(enabled: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, MINUTE);
    return () => window.clearInterval(timer);
  }, [enabled]);
  return now;
}

/**
 * Figma `Calendar/Time-Grid` (16127:1172): the week and day views. A Border box (`Color/Background/Surface/Default`, 1px
 * `Color/Border/Neutral/Pale/Default`, Corner-Radius/Base, clipped) with three rows, each split by a Pale rule: the days
 * (weekday Caption/Medium Neutral/Base over a Large `.Primitives/Calendar/Date`, Padding/XSmall, Gap/3XSmall), the all-day
 * row ("All day" Caption/Regular Neutral/Light; all-day `.Primitives/Calendar/Event` chips, Padding/2XSmall) and the hours:
 * a gutter of hour labels (Caption/Regular Neutral/Light, 56px desktop / 44px mobile) beside day columns of 30-minute
 * `.Primitives/Calendar/Slot` rows (64px per hour, the hour rule on top), each column split by a Pale rule.
 * `.Primitives/Calendar/Event-Block` instances sit at their start time — y = (start − first hour) × 64 + 1, height =
 * length × 64 − 2, 2px from the column's left edge and 4px from its right — and overlapping events share the column in
 * lanes. The `.Primitives/Calendar/Now-Line` crosses today's column at the current minute.
 *
 * Semantics: each day column is a group named with its date; blocks are buttons with `onEventClick` (named by title and
 * time). The header, hour labels, slots and the now line are decorative. Give the box a height (or max-height) to scroll
 * the hours under the fixed day header.
 */
export function CalendarTimeGrid({ view: viewProp, date, events = [], startHour = 8, endHour = 18, now: nowProp, today: todayProp, onEventClick, selectedEventId = null, onSlotPress, device: deviceProp, "aria-label": ariaLabel, overrides, className, style, ref, ...rest }: CalendarTimeGridProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const clock = useMinuteClock(!nowProp);
  const now = toDateOr(nowProp) ?? clock;
  const today = toDateOr(todayProp) ?? now;
  const anchor = startOfDay(toDateOr(date) ?? today);
  const list = useMemo(() => readEvents(events), [events]);
  const view: CalendarTimeGridView = viewProp === "week" && device === "mobile" ? "3-day" : viewProp ?? (device === "mobile" ? "3-day" : "week");
  const days = view === "week" ? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchor), index))
    : view === "3-day" ? [-1, 0, 1].map((offset) => addDays(anchor, offset))
    : [anchor];
  const first = Math.max(0, Math.min(23, Math.floor(startHour)));
  const last = Math.max(first + 1, Math.min(24, Math.ceil(endHour)));
  const hours = Array.from({ length: last - first }, (_, index) => first + index);
  const minutesOf = (value: Date, day: Date) => (value.getTime() - startOfDay(day).getTime()) / MINUTE - first * 60;
  const nowMinutes = minutesOf(now, now);
  const label = ariaLabel ?? calendarTitle(anchor, view, locale);
  const press = (day: Date) => onSlotPress ? (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const minutes = Math.max(0, Math.floor((y / 64) * 2) * 30);
    onSlotPress(new Date(startOfDay(day).getTime() + (first * 60 + minutes) * MINUTE));
  } : undefined;
  const columns = { "--zen-calendar-days": days.length } as CSSProperties;
  return (
    <div {...rest} ref={mergedRef} role="group" aria-label={label} className={["zen-calendar-time-grid", className].filter(Boolean).join(" ")} data-device={device} data-view={view} style={{ ...columns, ...style }}>
      <div className="zen-calendar-time-grid__days" aria-hidden="true">
        <span className="zen-calendar-time-grid__gutter" />
        {days.map((day, index) => (
          <span key={day.toISOString()} className="zen-calendar-time-grid__day">
            <span className={["zen-calendar-time-grid__weekday", typographyStyles["Caption/Medium"]].join(" ")}>{formatWeekday(day, locale)}</span>
            {nest("Date", <CalendarDate size="lg" day={day.getDate()} state={dayKey(day) === dayKey(today) ? "today" : "default"} />, index)}
          </span>
        ))}
      </div>
      <div className="zen-calendar-time-grid__all-day">
        <span className={["zen-calendar-time-grid__gutter", typographyStyles["Caption/Regular"]].join(" ")} aria-hidden="true">{t.allDay}</span>
        {days.map((day) => (
          <div key={day.toISOString()} className="zen-calendar-time-grid__all-day-cell" role="group" aria-label={`${formatFullDate(day, locale)}, ${t.allDay}`}>
            {eventsOnDay(list, day).filter((event) => event.allDay).map((event) => (
              <CalendarEvent key={event.id} kind="all-day" title={event.title} color={event.color} selected={event.id === selectedEventId}
                aria-expanded={onEventClick ? event.id === selectedEventId : undefined}
                onClick={onEventClick ? (click) => onEventClick(event.source, click.currentTarget) : undefined} />
            ))}
          </div>
        ))}
      </div>
      <div className="zen-calendar-time-grid__hours" style={{ "--zen-calendar-hours": hours.length } as CSSProperties}>
        <div className="zen-calendar-time-grid__gutter" aria-hidden="true">
          {hours.map((hour) => <span key={hour} className={["zen-calendar-time-grid__hour", typographyStyles["Caption/Regular"]].join(" ")}>{`${String(hour).padStart(2, "0")}:00`}</span>)}
        </div>
        {days.map((day) => {
          const isToday = dayKey(day) === dayKey(today);
          return (
            <div key={day.toISOString()} className="zen-calendar-time-grid__column" role="group" aria-label={formatFullDate(day, locale)} onClick={press(day)}>
              {layoutDay(list, day).map(({ event, start, end, lane, lanes }) => {
                const top = Math.max(0, minutesOf(start, day));
                const bottom = Math.min(hours.length * 60, minutesOf(end, day));
                if (bottom <= 0 || top >= hours.length * 60) return null;
                const length = bottom - top;
                return (
                  <CalendarEventBlock
                    key={event.id}
                    className="zen-calendar-time-grid__block"
                    style={{ "--zen-calendar-top": top, "--zen-calendar-length": length, "--zen-calendar-lane": lane, "--zen-calendar-lanes": lanes } as CSSProperties}
                    title={event.title}
                    time={formatTimeRange(event.start, eventEnd(event), locale)}
                    showTime={length >= 45}
                    // Two title lines and the time need an hour; shorter blocks hold one title line (and the time from 45 minutes).
                    titleLines={length < 60 ? 1 : 2}
                    color={event.color}
                    selected={event.id === selectedEventId}
                    aria-expanded={onEventClick ? event.id === selectedEventId : undefined}
                    onClick={onEventClick ? (click) => onEventClick(event.source, click.currentTarget) : undefined}
                  />
                );
              })}
              {isToday && nowMinutes >= 0 && nowMinutes < hours.length * 60
                ? <CalendarNowLine className="zen-calendar-time-grid__now" style={{ "--zen-calendar-top": nowMinutes } as CSSProperties} />
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
