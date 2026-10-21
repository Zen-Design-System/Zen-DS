import { useMemo, useRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { EmptyState } from "../EmptyState";
import "../Icon/core";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { CalendarAgendaItem, CalendarDate, useCalendarDevice, type CalendarDevice } from "./Calendar";
import { addDays, dayKey, eventEnd, eventsOnDay, formatFullDate, formatShortDate, formatTime, formatWeekday, readEvents, startOfDay, toDateOr, type CalendarDateInput, type CalendarEventData, type CalendarEventDates } from "./calendarDates";
import "./calendar.css";

export interface CalendarAgendaProps extends HTMLAttributes<HTMLDivElement> {
  /** The events; they are listed day by day, all-day first, then by start time. */
  events?: readonly CalendarEventData[];
  /** First day of the range ("2026-09-30" or a Date). Default: today. */
  from?: CalendarDateInput;
  /** How many days the range covers (default 7). Days without events are left out. */
  days?: number;
  /** Pressing an event: open its details, anchored to `target`. Without it the rows are static. */
  onEventClick?: (event: CalendarEventData, target: HTMLElement) => void;
  /** Figma Device: `desktop` (a date column beside each day's rows, in a bordered box) or `mobile` (a kicker over each
   * day's rows). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** The day treated as today (Accent date and kicker, "Today ·"). Default: the device clock. */
  today?: CalendarDateInput;
  /** Shown when the range has no events. Default: an Empty-State Small, "No events". */
  empty?: ReactNode;
  /** Figma instance overrides of the rows it draws (`{ "Day[0]/Item[1]": { color: "teal" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `Calendar/Agenda` (16128:1036): days in order, each with its events as `.Primitives/Calendar/Agenda-Item` rows.
 * Desktop: a Border box (`Color/Background/Surface/Default`, 1px `Color/Border/Neutral/Pale/Default`, Corner-Radius/Base)
 * of day rows (Padding Medium · Large, Gap/Large) split by Pale rules: a 48px date column (weekday in All-Caps/S, Large
 * date; Today in Accent) beside the rows (Gap/2XSmall). Mobile: per day a Body/Small/Bold kicker ("Today · Wed, Sep 30"
 * in Accent/Base, other days Neutral/Light), Gap/XSmall to its rows (Gap/3XSmall), Gap/Large between days.
 * Empty days are left out; a range without events shows an Empty-State.
 */
export function CalendarAgenda({ events = [], from, days = 7, onEventClick, device: deviceProp, today: todayProp, empty, overrides, className, ref, ...rest }: CalendarAgendaProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const today = toDateOr(todayProp) ?? new Date();
  const list = useMemo(() => readEvents(events), [events]);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const mobile = device === "mobile";
  const start = startOfDay(toDateOr(from) ?? today);
  const groups = Array.from({ length: Math.max(1, days) }, (_, index) => addDays(start, index))
    .map((day) => ({ day, items: eventsOnDay(list, day) }))
    .filter((group) => group.items.length > 0);
  const root = (children: ReactNode, list = true) => (
    <div {...rest} ref={mergedRef} className={["zen-calendar-agenda", className].filter(Boolean).join(" ")} data-device={device} data-empty={list ? undefined : "true"}>{children}</div>
  );
  if (!groups.length) return root(empty ?? <EmptyState size="sm" title={t.noEvents} icon="icon-calendar-line">{t.noEventsDescription}</EmptyState>, false);
  const row = (event: CalendarEventDates, day: Date, dayIndex: number, index: number) => {
    const startsToday = dayKey(event.start) === dayKey(day);
    const endsToday = dayKey(eventEnd(event)) === dayKey(day) || eventEnd(event).getTime() === addDays(day, 1).getTime();
    return (
      <li key={event.id}>
        {nest("Item", <CalendarAgendaItem
          device={device}
          start={event.allDay ? t.allDay : startsToday ? formatTime(event.start, locale) : "00:00"}
          end={event.allDay ? undefined : endsToday ? formatTime(eventEnd(event), locale) : "24:00"}
          title={event.title}
          meta={event.meta}
          color={event.color}
          attendees={event.attendees}
          onClick={onEventClick ? (click) => onEventClick(event.source, click.currentTarget) : undefined}
        />, `${dayIndex}-${index}`)}
      </li>
    );
  };
  return root(groups.map(({ day, items }, dayIndex) => {
    const isToday = dayKey(day) === dayKey(today);
    const isTomorrow = dayKey(day) === dayKey(addDays(today, 1));
    const name = formatFullDate(day, locale);
    return (
      <div key={day.toISOString()} className="zen-calendar-agenda__day" role="group" aria-label={name} data-today={isToday || undefined}>
        {mobile ? (
          <span className={["zen-calendar-agenda__kicker", typographyStyles["Body/Small/Bold"]].join(" ")} aria-hidden="true">
            {[isToday ? t.today : isTomorrow ? t.tomorrow : null, formatShortDate(day, locale)].filter(Boolean).join(" · ")}
          </span>
        ) : (
          <span className="zen-calendar-agenda__date" aria-hidden="true">
            <span className={["zen-calendar-agenda__weekday", typographyStyles["All-Caps/S"]].join(" ")}>{formatWeekday(day, locale)}</span>
            <CalendarDate size="lg" day={day.getDate()} state={isToday ? "today" : "default"} />
          </span>
        )}
        <ul className="zen-calendar-agenda__events" role="list">{items.map((event, index) => row(event, day, dayIndex, index))}</ul>
      </div>
    );
  }));
}
