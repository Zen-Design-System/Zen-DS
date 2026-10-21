import { useMemo, useRef, type HTMLAttributes, type KeyboardEvent, type Ref } from "react";
import { DatePickerItem } from "../DatePicker";
import { useControllableState } from "../_shared/use-controllable-state";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { CalendarDayCell, CalendarEvent, moveDayFocus, useCalendarDevice, type CalendarDevice } from "./Calendar";
import { calendarTitle, dayKey, eventsOnDay, formatFullDate, formatTime, formatWeekday, formatWeekdayNarrow, monthStart, monthWeeks, readEvents, toDateOr, type CalendarDateInput, type CalendarEventData } from "./calendarDates";
import "./calendar.css";

/** How many chips a desktop day cell shows: all of them up to three; with more, two and "+N more" (Figma Day-Cell). */
const CELL_EVENTS = 3;

export interface CalendarMonthProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** The month to show (any day in it). Default: the selected day's month, else today's. Move it with the Toolbar. */
  month?: CalendarDateInput;
  /** The selected day (controlled): Day-Cell State=Selected on desktop, Single-Selected on mobile. */
  value?: CalendarDateInput | null;
  /** The selected day at first (uncontrolled). Default: none on desktop. */
  defaultValue?: CalendarDateInput | null;
  /** Called with the day the person presses. */
  onValueChange?: (date: Date) => void;
  /** The events to show: chips in the desktop cells, a dot under the mobile days. */
  events?: readonly CalendarEventData[];
  /** Pressing an event chip (desktop): open its details, anchored to `target`. Without it the chips are static. */
  onEventClick?: (event: CalendarEventData, target: HTMLElement) => void;
  /** The event whose details are open: its chip shows State=Selected. */
  selectedEventId?: string | null;
  /** Pressing "+N more" (desktop): show the whole day (its Agenda or Day view). Without it "+N more" is text. */
  onMoreClick?: (date: Date) => void;
  /** Figma Device: `desktop` (a 7-column grid of Day-Cells with event chips) or `mobile` (date-picker days with an
   * event dot; list the selected day below with CalendarAgenda). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** The day treated as today ("2026-09-30" or a Date). Default: the device clock. */
  today?: CalendarDateInput;
  /** Names the month (default: the month and year, "September 2026"). */
  "aria-label"?: string;
  /** Figma instance overrides of the cells and days it draws (`{ "Week[0]/Day[2]": { more: 2 } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `Calendar/Month` (16126:1093). Desktop: a Border box (`Color/Background/Surface/Default`, 1px
 * `Color/Border/Neutral/Pale/Default`, Corner-Radius/Base, clipped) holding the weekday row (Caption/Medium Neutral/Base,
 * Padding/XSmall, a Pale rule under it) and 5 weeks — 6 when the month spans six (Figma Sixth-Week) — of
 * `.Primitives/Calendar/Day-Cell`, Monday first; days of the next and previous month are Outside. A cell shows its events as
 * `.Primitives/Calendar/Event` chips: all up to three, else two and "+N more". Mobile: single-letter weekdays
 * (Caption/Medium Neutral/Light) over weeks of `.Primitives/Mobile-Date-Picker/Item` (DatePickerItem) with the event dot,
 * Gap/2XSmall between rows; days outside the month are blank.
 *
 * Semantics: an APG grid — desktop: weekday column headers and a row per week of gridcells; each day's date is a button named
 * "Wednesday, September 30, 2026, 3 events" that selects the day (`aria-pressed`; today `aria-current="date"`). One date is
 * in the tab order; the arrow keys move a day or a week, Home / End to the week's ends. Event chips are buttons with
 * `onEventClick`. Mobile days are the date-picker buttons with the same keys.
 */
export function CalendarMonth({ month: monthProp, value, defaultValue = null, onValueChange, events = [], onEventClick, selectedEventId = null, onMoreClick, device: deviceProp, today: todayProp, "aria-label": ariaLabel, overrides, className, ref, ...rest }: CalendarMonthProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const today = toDateOr(todayProp) ?? new Date();
  const list = useMemo(() => readEvents(events), [events]);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const [selected, setSelected] = useControllableState<Date | null>({ value: toDateOr(value), defaultValue: toDateOr(defaultValue), name: "CalendarMonth value" });
  const month = monthStart(toDateOr(monthProp) ?? selected ?? today);
  const weeks = monthWeeks(month);
  const inMonth = (date: Date) => date.getMonth() === month.getMonth();
  const pick = (date: Date) => { setSelected(date); onValueChange?.(date); };
  // The one day in the tab order: the selected day when it is in this month, else today, else the 1st.
  const focusKey = [selected, today].find((date) => date && inMonth(date)) ?? month;
  const isSelected = (date: Date) => Boolean(selected) && dayKey(date) === dayKey(selected as Date);
  const label = ariaLabel ?? calendarTitle(month, "month", locale);
  const keys = (event: KeyboardEvent<HTMLDivElement>) => { rest.onKeyDown?.(event); moveDayFocus(event, rootRef.current, 7); };

  if (device === "mobile") {
    return (
      <div {...rest} ref={mergedRef} role="grid" aria-label={label} className={["zen-calendar-month", className].filter(Boolean).join(" ")} data-device="mobile" onKeyDown={keys}>
        <div className="zen-calendar-month__weekdays" aria-hidden="true">
          {weeks[0].map((date) => <span key={date.getDay()} className={typographyStyles["Caption/Medium"]}>{formatWeekdayNarrow(date, locale)}</span>)}
        </div>
        {weeks.map((week, row) => (
          <div className="zen-calendar-month__week" role="row" key={week[0].toISOString()}>
            {week.map((date, column) => <span key={date.toISOString()} role="gridcell">{inMonth(date)
              ? nest("Day", <DatePickerItem
                  data-calendar-day={row * 7 + column}
                  device="mobile"
                  day={date.getDate()}
                  date={date}
                  state={isSelected(date) ? "single-selected" : dayKey(date) === dayKey(today) ? "today" : "default"}
                  event={eventsOnDay(list, date).length > 0}
                  aria-pressed={isSelected(date)}
                  aria-current={dayKey(date) === dayKey(today) ? "date" : undefined}
                  tabIndex={dayKey(date) === dayKey(focusKey) ? 0 : -1}
                  onClick={() => pick(date)}
                />, row * 7 + column)
              : <DatePickerItem device="mobile" state="blank" />}</span>)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div {...rest} ref={mergedRef} role="grid" aria-label={label} className={["zen-calendar-month", className].filter(Boolean).join(" ")} data-device="desktop" onKeyDown={keys}>
      <div className="zen-calendar-month__weekdays" role="row">
        {weeks[0].map((date) => (
          <span key={date.getDay()} role="columnheader" className={typographyStyles["Caption/Medium"]} aria-label={new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date)}>{formatWeekday(date, locale)}</span>
        ))}
      </div>
      {weeks.map((week, row) => (
        <div className="zen-calendar-month__week" role="row" key={week[0].toISOString()}>
          {week.map((date, column) => {
            const index = row * 7 + column;
            if (!inMonth(date)) return nest("Day", <CalendarDayCell key={date.toISOString()} role="gridcell" day={date.getDate()} label={formatFullDate(date, locale)} state="outside" />, index);
            const dayEvents = eventsOnDay(list, date);
            const shown = dayEvents.length > CELL_EVENTS ? dayEvents.slice(0, CELL_EVENTS - 1) : dayEvents;
            const isToday = dayKey(date) === dayKey(today);
            return nest("Day", (
              <CalendarDayCell
                key={date.toISOString()}
                role="gridcell"
                day={date.getDate()}
                label={[formatFullDate(date, locale), dayEvents.length ? t.eventCount(dayEvents.length) : null].filter(Boolean).join(", ")}
                state={isSelected(date) ? "selected" : isToday ? "today" : "default"}
                today={isToday}
                more={dayEvents.length - shown.length}
                onMoreClick={onMoreClick ? () => onMoreClick(date) : undefined}
                onSelect={() => pick(date)}
                focusable={dayKey(date) === dayKey(focusKey)}
                dateProps={{ "data-calendar-day": index }}
              >
                {shown.map((event) => (
                  <CalendarEvent
                    key={event.id}
                    title={event.title}
                    time={event.allDay ? undefined : formatTime(event.start, locale)}
                    kind={event.allDay ? "all-day" : "timed"}
                    color={event.color}
                    selected={event.id === selectedEventId}
                    aria-expanded={onEventClick ? event.id === selectedEventId : undefined}
                    onClick={onEventClick ? (click) => onEventClick(event.source, click.currentTarget) : undefined}
                  />
                ))}
              </CalendarDayCell>
            ), index);
          })}
        </div>
      ))}
    </div>
  );
}
