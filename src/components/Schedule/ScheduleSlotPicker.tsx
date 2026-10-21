import { useId, useMemo, useRef, type HTMLAttributes, type Ref } from "react";
import { CalendarWeekStrip, useCalendarDevice, type CalendarDevice } from "../Calendar";
import { dayKey, formatFullDate, formatTime, startOfDay, toDate, toDateOr, type CalendarDateInput } from "../Calendar/calendarDates";
import { useControllableState } from "../_shared/use-controllable-state";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { ScheduleSlot } from "./Schedule";
import type { ScheduleSlotData } from "./scheduleData";
import "./schedule.css";

export interface ScheduleSlotPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** The bookable times (any days); a day shows its slots in time order. */
  slots: ScheduleSlotData[];
  /** The days to offer (desktop columns, the phone's week strip). Default: the days the slots fall on, at most five. */
  days?: CalendarDateInput[];
  /** The chosen slot's id (controlled). */
  value?: string | null;
  /** The chosen slot at first (uncontrolled). */
  defaultValue?: string | null;
  /** Called with the slot the person picks. The confirm action ("Book 10:00") belongs to the page or sheet footer. */
  onValueChange?: (id: string, slot: ScheduleSlotData) => void;
  /** Phone: the day the slots show (controlled). Default: the chosen slot's day, else the first day. */
  day?: CalendarDateInput;
  /** Phone: called with the day picked on the week strip. */
  onDayChange?: (day: Date) => void;
  /** The day treated as today ("Today" in Accent). Default: the device clock. */
  today?: CalendarDateInput;
  /** Figma Device: `desktop` (day columns) or `mobile` (a week strip, then Morning / Afternoon groups of three per row,
   * 44px touch targets). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Names the times (default the locale's "Available times"). */
  "aria-label"?: string;
  /** The radios' group name (default a generated one). */
  name?: string;
  /** Figma instance overrides of the slots (`{ "Slot[2026-10-01T10:00]": { size: "sm" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `Schedule/Slot-Picker` (16135:14046): a booking picker, one `.Primitives/Schedule/Slot` chosen at a time (a radio
 * group). Desktop: day columns Gap/Small apart, each a header (weekday Caption/Medium Neutral/Light — "Today" in
 * Accent/Base — over the date in Body/Base/Medium) and its slots Gap/XSmall, filling the column. Mobile: a Calendar/
 * Week-Strip (Dot) Gap/Medium over Morning / Afternoon / Evening groups — a Body/Small/Bold Light kicker, Gap/XSmall, then
 * slots three per row Gap/Small apart. Booked or past times are Disabled, struck through, still in place. Each radio is
 * named with its day and time; the arrow keys move between them.
 */
export function ScheduleSlotPicker({ slots, days: daysProp, value, defaultValue = null, onValueChange, day: dayProp, onDayChange, today: todayProp, device: deviceProp, "aria-label": ariaLabel, name: nameProp, overrides, className, ref, ...rest }: ScheduleSlotPickerProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const generated = useId();
  const name = nameProp ?? `zen-slots-${generated}`;
  const today = toDateOr(todayProp) ?? new Date();
  const [chosen, setChosen] = useControllableState<string | null>({ value, defaultValue, name: "ScheduleSlotPicker value" });
  const read = useMemo(() => slots.map((slot) => ({ slot, start: toDate(slot.start) })).sort((a, b) => a.start.getTime() - b.start.getTime()), [slots]);
  const days = useMemo(() => {
    if (daysProp) return daysProp.map((item) => startOfDay(toDate(item)));
    const keys = [...new Set(read.map((item) => dayKey(item.start)))].slice(0, 5);
    return keys.map((key) => new Date(key));
  }, [daysProp, read]);
  const chosenSlot = read.find((item) => item.slot.id === chosen);
  const [shownDay, setShownDay] = useControllableState<Date>({ value: toDateOr(dayProp), defaultValue: chosenSlot ? startOfDay(chosenSlot.start) : days[0] ?? startOfDay(today), name: "ScheduleSlotPicker day" });
  const pick = (item: (typeof read)[number]) => { setChosen(item.slot.id); onValueChange?.(item.slot.id, item.slot); };
  const slotOf = (item: (typeof read)[number], mobile: boolean) => nest("Slot", (
    <ScheduleSlot
      key={item.slot.id}
      className="zen-schedule-picker__slot"
      name={name}
      value={item.slot.id}
      time={formatTime(item.start, locale)}
      size="md"
      checked={item.slot.id === chosen}
      disabled={item.slot.disabled}
      aria-label={`${formatFullDate(item.start, locale)}, ${formatTime(item.start, locale)}${item.slot.disabled ? `, ${t.unavailable}` : ""}`}
      onChange={() => pick(item)}
      data-mobile={mobile || undefined}
    />
  ), item.slot.id);
  const label = ariaLabel ?? t.availableTimes;

  if (device === "mobile") {
    const dayItems = read.filter((item) => dayKey(item.start) === dayKey(shownDay));
    const groups = [
      { id: "morning", label: t.morning, items: dayItems.filter((item) => item.start.getHours() < 12) },
      { id: "afternoon", label: t.afternoon, items: dayItems.filter((item) => item.start.getHours() >= 12 && item.start.getHours() < 17) },
      { id: "evening", label: t.evening, items: dayItems.filter((item) => item.start.getHours() >= 17) },
    ].filter((group) => group.items.length);
    return (
      <div {...rest} ref={mergedRef} className={["zen-schedule-picker", className].filter(Boolean).join(" ")} data-device="mobile">
        {nest("Week", <CalendarWeekStrip device="mobile" value={shownDay} today={today} events={read.filter((item) => !item.slot.disabled).map((item) => ({ id: item.slot.id, title: "", start: item.start }))}
          onValueChange={(next) => { setShownDay(next); onDayChange?.(next); }} aria-label={t.chooseDate} />)}
        <div className="zen-schedule-picker__groups" role="radiogroup" aria-label={`${label}, ${formatFullDate(shownDay, locale)}`}>
          {groups.length ? groups.map((group) => (
            <div key={group.id} className="zen-schedule-picker__group" role="group" aria-label={group.label}>
              <span className={["zen-schedule-picker__kicker", typographyStyles["Body/Small/Bold"]].join(" ")} aria-hidden="true">{group.label}</span>
              <div className="zen-schedule-picker__slots">{group.items.map((item) => slotOf(item, true))}</div>
            </div>
          )) : <span className={["zen-schedule-picker__none", typographyStyles["Body/Small/Regular"]].join(" ")}>{t.noTimes}</span>}
        </div>
      </div>
    );
  }

  return (
    <div {...rest} ref={mergedRef} role="radiogroup" aria-label={label} className={["zen-schedule-picker", className].filter(Boolean).join(" ")} data-device="desktop">
      {days.map((day) => {
        const isToday = dayKey(day) === dayKey(today);
        return (
          <div key={day.toISOString()} className="zen-schedule-picker__day" role="group" aria-label={formatFullDate(day, locale)}>
            <span className="zen-schedule-picker__header" aria-hidden="true">
              <span className={["zen-schedule-picker__weekday", typographyStyles["Caption/Medium"]].join(" ")} data-today={isToday || undefined}>{isToday ? t.today : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</span>
              <span className={["zen-schedule-picker__date", typographyStyles["Body/Base/Medium"]].join(" ")}>{new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(day)}</span>
            </span>
            {read.filter((item) => dayKey(item.start) === dayKey(day)).map((item) => slotOf(item, false))}
          </div>
        );
      })}
    </div>
  );
}
