import { useMemo, useRef, type HTMLAttributes, type Ref } from "react";
import { DatePickerItem } from "../DatePicker";
import { useControllableState } from "../_shared/use-controllable-state";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { CalendarDayTile, moveDayFocus, useCalendarDevice, type CalendarDevice } from "./Calendar";
import { dayKey, eventsOnDay, formatFullDate, formatWeekday, readEvents, toDateOr, weekDays, type CalendarDateInput, type CalendarEventData } from "./calendarDates";
import "./calendar.css";

export interface CalendarWeekStripProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Any day of the week to show (Monday first). Default: the selected day, else today. */
  week?: CalendarDateInput;
  /** The selected day (controlled). */
  value?: CalendarDateInput | null;
  /** The selected day at first (uncontrolled). Default: today. */
  defaultValue?: CalendarDateInput | null;
  /** Called with the day the person picks. */
  onValueChange?: (date: Date) => void;
  /** The events of the period: a day with any shows the event dot (Dot style). */
  events?: readonly CalendarEventData[];
  /** Figma Style: `dot` (date-picker days with an event dot, default) or `tile` (weekday and date in one tile; the
   * selected day a bordered Surface tile, as Schedule/Day-Planner uses it). */
  variant?: "dot" | "tile";
  /** Figma Device: `desktop` (32px days, a side panel or picker) or `mobile` (40px days, above the day's events on a
   * phone). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** The day treated as today (Today ring / Accent date). Default: the device clock. */
  today?: CalendarDateInput;
  /** Names the strip (default: none; name it when a screen has more than one). */
  "aria-label"?: string;
  /** Figma instance overrides of the days it draws (`{ "Day[3]": { event: false } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `Calendar/Week-Strip` (16125:520): one week of selectable days. Dot: seven columns spread across the width, each
 * a weekday (Caption/Medium, Neutral/Light) over a `.Primitives/Date-Picker/Item` (desktop 32) or
 * `.Primitives/Mobile-Date-Picker/Item` (mobile 40) — DatePickerItem — Gap/2XSmall apart, with the event dot; the
 * selected day is State=Single-Selected, today State=Today. Tile: seven `.Primitives/Calendar/Day-Tile` sharing the width,
 * Gap/2XSmall. Days are buttons named with their full date (`aria-pressed` on the selected one, `aria-current="date"` on
 * today); the arrow keys move between them. Not to pick a date in a form: use DatePicker.
 */
export function CalendarWeekStrip({ week, value, defaultValue, onValueChange, events = [], variant = "dot", device: deviceProp, today: todayProp, overrides, className, ref, ...rest }: CalendarWeekStripProps) {
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const today = toDateOr(todayProp) ?? new Date();
  const list = useMemo(() => readEvents(events), [events]);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const [selected, setSelected] = useControllableState<Date | null>({ value: toDateOr(value), defaultValue: defaultValue === undefined ? today : toDateOr(defaultValue), name: "CalendarWeekStrip value" });
  const days = weekDays(toDateOr(week) ?? selected ?? today);
  const pick = (date: Date) => { setSelected(date); onValueChange?.(date); };
  return (
    <div
      {...rest}
      ref={mergedRef}
      role="group"
      className={["zen-calendar-week-strip", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-device={device}
      onKeyDown={(event) => { rest.onKeyDown?.(event); moveDayFocus(event, rootRef.current, 0); }}
    >
      {days.map((date, index) => {
        const isSelected = Boolean(selected) && dayKey(date) === dayKey(selected as Date);
        const isToday = dayKey(date) === dayKey(today);
        if (variant === "tile") {
          return nest("Day", <CalendarDayTile key={date.toISOString()} data-calendar-day={index} weekday={formatWeekday(date, locale)} day={date.getDate()} label={formatFullDate(date, locale)} selected={isSelected} today={isToday} onClick={() => pick(date)} />, index);
        }
        return (
          <div className="zen-calendar-week-strip__day" key={date.toISOString()}>
            <span className={["zen-calendar-week-strip__weekday", typographyStyles["Caption/Medium"]].join(" ")} aria-hidden="true">{formatWeekday(date, locale)}</span>
            {nest("Day", <DatePickerItem
              data-calendar-day={index}
              device={device}
              day={date.getDate()}
              date={date}
              state={isSelected ? "single-selected" : isToday ? "today" : "default"}
              event={eventsOnDay(list, date).length > 0}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              onClick={() => pick(date)}
            />, index)}
          </div>
        );
      })}
    </div>
  );
}
