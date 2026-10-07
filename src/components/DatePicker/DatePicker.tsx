import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { Icon } from "../Icon";
import { Button, IconButton } from "../Button";
import { Checkbox } from "../Checkbox";
import { Divider } from "../Divider";
import { InputField, InputLeadingTrailing } from "../Input";
import { useAnchoredPosition } from "../Popover/useAnchoredPosition";
import { useExclusivePopover } from "../Popover/useExclusivePopover";
import { scaleKey } from "../_shared/scale";
import { useZen, useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./date-picker.css";
import "../Icon/core";

export type DatePickerItemState =
  | "default" | "hover" | "single-selected" | "range-selected-start" | "range-selected-end"
  | "in-range" | "today" | "blank" | "weekend" | "disabled";

export interface DatePickerItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  day?: number | string;
  /** The full date of this day. It names the button in the locale ("Wednesday, September 30, 2026"); without it the
   * name is the locale's "Day N". The calendar passes it for every day. */
  date?: Date;
  state?: DatePickerItemState;
  event?: boolean;
  /** Medium 32px (default) or Small 24px; short (sm, md…) or Figma (small, medium…) spelling. Ignored on mobile. */
  size?: "md" | "sm" | "medium" | "small";
  /** `mobile`: `.Primitives/Mobile-Date-Picker/Item` (9921:3283), a square that fills its grid column (40px in the
   * component, 50px in the 350px table of a 390px phone) with the day in Body/Base/Medium; same states and tokens as desktop. */
  device?: DatePickerDevice;
}

/** Figma Date Picker primitives: desktop (`.Primitives/Date-Picker/*`) or mobile (`.Primitives/Mobile-Date-Picker/Item`,
 * Date-Picker/Mobile 9923:3576). */
export type DatePickerDevice = "desktop" | "mobile";

/** DatePickerItem CSS / Figma keys (its `data-size` values). */
const datePickerItemSizes = ["medium", "small"] as const;

/** A day's accessible name in `locale`: weekday, month, day and year ("Wednesday, September 30, 2026", vi "Thứ Tư,
 * 30 tháng 9, 2026"), so a screen reader hears which day it is, not "Day 30". */
const fullDateFormats = new Map<string, Intl.DateTimeFormat>();
function fullDateName(date: Date, locale: string) {
  let format = fullDateFormats.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    fullDateFormats.set(locale, format);
  }
  return format.format(date);
}

/** The day primitive from `.Primitives/Date-Picker/Item` (455:33517): Medium 32px on Corner-Radius/Action/Small,
 * Small 24px on Corner-Radius/Action/XSmall. The button paints the In-Range strip, its label span the day.
 * State=Today carries `aria-current="date"` (the calendar sets it on today's day in every state, selected included). */
export function DatePickerItem({ day = "", date, state = "default", event = false, size: sizeProp = "md", device = "desktop", className, "aria-current": ariaCurrent, ...props }: DatePickerItemProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const size = scaleKey(sizeProp, datePickerItemSizes);
  const blank = state === "blank" || day === "";
  return (
    <button
      {...props}
      className={["zen-date-picker__day", blank ? "is-blank" : "", className].filter(Boolean).join(" ")}
      data-state={state}
      data-size={device === "mobile" ? undefined : size}
      data-device={device === "mobile" ? "mobile" : undefined}
      type="button"
      aria-label={blank ? undefined : date ? fullDateName(date, locale) : t.day(day)}
      aria-current={blank ? undefined : ariaCurrent ?? (state === "today" ? "date" : undefined)}
      // Padding cells before the 1st / after the last day are layout only: keep them out of the accessibility tree.
      aria-hidden={blank || undefined}
      tabIndex={blank ? -1 : props.tabIndex}
      disabled={blank || state === "disabled" || props.disabled}
    >
      <span>{day}</span>
      {event ? <i aria-hidden="true" /> : null}
    </button>
  );
}

export interface DatePickerHeaderProps {
  month: Date;
  onPrevious?: () => void;
  onNext?: () => void;
  onMonthYearClick?: () => void;
  /** Figma Header Type: Interactive (month/year opens Select-Month-Year), Static (label only,
   * used by the Dual calendar) or Display (label only, no navigation slots). */
  type?: "interactive" | "static" | "display";
  /** Figma `Back` / `Next`. A hidden button keeps its 32px slot so the label stays centred (desktop). */
  back?: boolean;
  next?: boolean;
  /** `mobile` (Date-Picker/Mobile 9923:3576): month and year in Heading/Subheading at the start, Back and Next together
   * at the end; a hidden button leaves no slot. */
  device?: DatePickerDevice;
}

/** The month name of `month` ("September", vi "Tháng 9") in `locale`. */
const monthName = (month: Date, locale: string) => new Intl.DateTimeFormat(locale, { month: "long" }).format(month);
/** The 12 month names in `locale`, January first. */
const monthNamesFor = (locale: string) => Array.from({ length: 12 }, (_, index) => monthName(new Date(2026, index, 1), locale));
/** Monday-first narrow weekday names in `locale` (en M T W T F S S, vi T2 … CN); 5 January 2026 is a Monday. */
const weekdayInitials = (locale: string) => {
  const format = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 0, 5 + index)));
};

export function DatePickerHeader({ month, onPrevious, onNext, onMonthYearClick, type = "interactive", back = true, next = true, device = "desktop" }: DatePickerHeaderProps) {
  const mobile = device === "mobile";
  const t = useZenLabels();
  const locale = useZenLocale();
  // Shown as two parts, month name then year; the accessible name is the locale's "Month YYYY" ("September 2026").
  const label = [monthName(month, locale), String(month.getFullYear())];
  const fullLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const slot = (show: boolean, direction: "previous" | "next") => show
    ? <IconButton className="zen-date-picker__nav" appearance="main" level="tertiary" size="sm" aria-label={direction === "previous" ? t.previousMonth : t.nextMonth} onClick={direction === "previous" ? onPrevious : onNext} icon={<Icon name={direction === "previous" ? "icon-chevron-left-line-small" : "icon-chevron-right-line-small"} />} />
    // Mobile has no centred label to balance: a hidden button leaves no slot.
    : mobile ? null : <span className="zen-date-picker__nav-slot" aria-hidden="true" />;
  // Mobile: the month and year in Heading/Subheading at the start (Date-Container 9923:3576), then Back and Next.
  const labelStyle = typographyStyles[mobile ? "Heading/Subheading" : "Body/Extra/Bold"];
  const monthLabel = type === "interactive" ? (
    <button className={`zen-date-picker__month ${labelStyle}`} type="button" onClick={onMonthYearClick} aria-label={t.chooseMonthAndYear(fullLabel)}>
      <span>{label[0]}</span><span>{label[1]}</span>
    </button>
  ) : (
    // Display headers (the stacked list) title each month section: a heading under the sheet's h2, read by the outline.
    type === "display"
      ? <h3 className={`zen-date-picker__month ${labelStyle}`}><span>{label[0]}</span><span>{label[1]}</span></h3>
      : <span className={`zen-date-picker__month ${labelStyle}`} aria-live="polite"><span>{label[0]}</span><span>{label[1]}</span></span>
  );
  return (
    // A div, not <header>: outside a sectioning element a header is a banner landmark, and the stacked list has one per month.
    <div className="zen-date-picker__header" data-type={type} data-device={mobile ? "mobile" : undefined}>
      {!mobile && type !== "display" ? slot(back, "previous") : null}
      {monthLabel}
      {mobile && type !== "display" ? slot(back, "previous") : null}
      {type !== "display" ? slot(next, "next") : null}
    </div>
  );
}

export interface DatePickerActionProps {
  /** Figma Action: `dual` (Cancel + Submit) or `single` (Submit only). */
  action?: "single" | "dual";
  /** Pressing Cancel (the Tertiary button). */
  onCancel?: () => void;
  /** Pressing Submit (the Primary button). */
  onApply?: () => void;
  /** Text of the Tertiary button. Default: the locale's "Cancel". */
  cancelLabel?: ReactNode;
  /** Text of the Primary button. Default: the locale's "Submit". */
  applyLabel?: ReactNode;
  /** Cancel in its Button/Main Disabled state, e.g. while there is nothing to cancel. */
  cancelDisabled?: boolean;
  /** Submit in its Button/Main Disabled state, e.g. until a range has its end date. */
  applyDisabled?: boolean;
}

/** `.Primitives/Date-Picker/Action` (460:38871): Button/Main Small Tertiary "Cancel" + Primary "Submit", gap Spacing/Gap/XSmall. */
export function DatePickerAction({ action = "dual", onCancel, onApply, cancelLabel: cancelLabelProp, applyLabel: applyLabelProp, cancelDisabled, applyDisabled }: DatePickerActionProps) {
  const t = useZenLabels();
  const cancelLabel = cancelLabelProp === undefined ? t.cancel : cancelLabelProp;
  const applyLabel = applyLabelProp === undefined ? t.apply : applyLabelProp;
  return (
    <footer className="zen-date-picker__actions">
      {action === "dual" ? <Button level="tertiary" size="sm" disabled={cancelDisabled} onClick={onCancel}>{cancelLabel}</Button> : null}
      <Button level="primary" size="sm" disabled={applyDisabled} onClick={onApply}>{applyLabel}</Button>
    </footer>
  );
}

/** Row pitch of the wheel: 28px Heading/4 row + Spacing/Gap/2XSmall. */
const WHEEL_PITCH = 32;
/** Figma (Calendar 478:30561, Type=Select-Month-Year) fades rows 1 / 0.25 / 0.1 by distance from the selection;
 * interpolated for motion, 0 at 3. */
function wheelOpacity(distance: number) {
  const d = Math.abs(distance);
  if (d <= 1) return 1 - 0.75 * d;
  if (d <= 2) return 0.25 - 0.15 * (d - 1);
  return Math.max(0, 0.1 - 0.1 * (d - 2));
}
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Carousel-style wheel. `position` is a continuous index (a float): drag moves it 1:1 with the
 * pointer, release adds momentum and glides to the nearest row, wheel/trackpad input and keys move a
 * target the position eases towards. Rows are laid out absolutely from the position, so everything
 * slides instead of stepping.
 */
function WheelColumn({ id, label, value, count, format, onChange, align = "start" }: {
  /** Stable prefix of the option ids (the accessible `label` is translated). */
  id: string;
  label: string;
  value: number;
  /** Wrap modulo `count` (months); omit for an open-ended sequence (years). */
  count?: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  align?: "start" | "end";
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const resolve = (index: number) => (count ? ((index % count) + count) % count : index);
  const [position, setPosition] = useState(value);
  const motion = useRef({ position: value, target: value, frame: 0, last: 0, emitted: value });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  const apply = (next: number) => {
    const state = motion.current;
    state.position = next;
    setPosition(next);
    const selected = resolveRef.current(Math.round(next));
    if (selected !== state.emitted) {
      state.emitted = selected;
      onChangeRef.current(selected);
    }
  };
  // Frame-rate independent ease towards the target (critically damped feel, ~70ms time constant).
  const tick = (time: number) => {
    const state = motion.current;
    const dt = state.last ? Math.min(64, time - state.last) : 16;
    state.last = time;
    const gap = state.target - state.position;
    if (Math.abs(gap) < 0.002) { state.frame = 0; state.last = 0; apply(state.target); return; }
    apply(state.position + gap * (1 - Math.exp(-dt / 70)));
    state.frame = requestAnimationFrame(tick);
  };
  const glideTo = (target: number) => {
    const state = motion.current;
    state.target = target;
    if (prefersReducedMotion()) { cancelAnimationFrame(state.frame); state.frame = 0; apply(target); return; }
    if (!state.frame) { state.last = 0; state.frame = requestAnimationFrame(tick); }
  };
  const stop = () => { cancelAnimationFrame(motion.current.frame); motion.current.frame = 0; motion.current.last = 0; };
  useEffect(() => stop, []);

  // Wheel / trackpad: move the target continuously (one mouse notch ≈ one row), snap once input rests.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    let settle = 0;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rows = Math.max(-1, Math.min(1, event.deltaY / WHEEL_PITCH));
      glideTo(motion.current.target + rows);
      window.clearTimeout(settle);
      settle = window.setTimeout(() => glideTo(Math.round(motion.current.target)), 120);
    };
    list.addEventListener("wheel", handleWheel, { passive: false });
    return () => { list.removeEventListener("wheel", handleWheel); window.clearTimeout(settle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Press-and-hold drag with momentum. Capture starts after 4px so a plain press still clicks a row.
  const drag = useRef<{ pointerId: number; startY: number; startPosition: number; moved: boolean; samples: Array<{ y: number; t: number }> } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = null;
    setDragging(false);
    if (!current?.moved) return;
    suppressClick.current = true;
    const samples = current.samples;
    const first = samples[0];
    const last = samples[samples.length - 1];
    // Held still before letting go → no momentum. Otherwise flick velocity (rows/ms) projected
    // ~220ms ahead, capped at ±6 rows so a very fast flick stays controllable.
    const resting = event.timeStamp - last.t > 80;
    const velocity = resting ? 0 : -((last.y - first.y) / WHEEL_PITCH) / Math.max(16, last.t - first.t);
    const momentum = Math.max(-6, Math.min(6, velocity * 220));
    glideTo(Math.round(motion.current.position + momentum));
  };

  const selectedIndex = Math.round(position);
  const base = Math.floor(position);
  const centreTop = 4 + 2 * WHEEL_PITCH; // 4px block padding + two rows above the selection
  return (
    <div
      ref={listRef}
      className="zen-date-picker__wheel"
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${id}-${selectedIndex}`}
      data-align={align}
      data-dragging={dragging ? "true" : undefined}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        glideTo(Math.round(motion.current.target) + (event.key === "ArrowDown" ? 1 : -1));
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        drag.current = { pointerId: event.pointerId, startY: event.clientY, startPosition: motion.current.position, moved: false, samples: [{ y: event.clientY, t: event.timeStamp }] };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const distance = event.clientY - current.startY;
        if (!current.moved) {
          if (Math.abs(distance) < 4) return;
          current.moved = true;
          setDragging(true);
          stop();
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        current.samples.push({ y: event.clientY, t: event.timeStamp });
        // Velocity from the last ~80ms of movement.
        while (current.samples.length > 2 && event.timeStamp - current.samples[0].t > 80) current.samples.shift();
        const next = current.startPosition - distance / WHEEL_PITCH;
        motion.current.target = next;
        apply(next);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {Array.from({ length: 7 }, (_, slot) => base - 3 + slot).map((index) => {
        const distance = index - position;
        if (Math.abs(distance) >= 3) return null;
        return (
          <button
            key={index}
            id={`${id}-${index}`}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            tabIndex={-1}
            className={`zen-date-picker__wheel-item ${typographyStyles["Heading/4"]}`}
            style={{ transform: `translateY(${centreTop + distance * WHEEL_PITCH}px)`, opacity: wheelOpacity(distance) }}
            onClick={() => { glideTo(index); listRef.current?.focus(); }}
          >
            {format(resolve(index))}
          </button>
        );
      })}
    </div>
  );
}

export interface DatePickerMonthYearProps {
  month: Date;
  onSubmit?: (month: Date) => void;
  onCancel?: () => void;
}

/** `.Primitives/Date-Picker/Calendar` Type=Select-Month-Year: the focused month/year header, a
 * month wheel and a year wheel (Heading/4, 5 visible rows), then Cancel / Submit. */
export function DatePickerMonthYear({ month, onSubmit, onCancel }: DatePickerMonthYearProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const monthNames = useMemo(() => monthNamesFor(locale), [locale]);
  const [draftMonth, setDraftMonth] = useState(month.getMonth());
  const [draftYear, setDraftYear] = useState(month.getFullYear());
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { rootRef.current?.querySelector<HTMLElement>(".zen-date-picker__wheel")?.focus({ preventScroll: true }); }, []);
  return (
    <>
      <div ref={rootRef} className="zen-date-picker__month-year">
        <header className="zen-date-picker__header" data-type="interactive" data-state="focused">
          <button className={`zen-date-picker__month ${typographyStyles["Body/Extra/Bold"]}`} type="button" onClick={onCancel} aria-label={t.backToCalendar}>
            <span>{monthNames[draftMonth]}</span><span>{draftYear}</span>
          </button>
        </header>
        <div className="zen-date-picker__wheels">
          <WheelColumn id="Month" label={t.month} value={draftMonth} count={12} format={(value) => monthNames[value]} onChange={setDraftMonth} />
          <WheelColumn id="Year" label={t.year} value={draftYear} format={String} onChange={setDraftYear} align="end" />
        </div>
      </div>
      <DatePickerAction action="dual" onCancel={onCancel} onApply={() => onSubmit?.(new Date(draftYear, draftMonth, 1))} />
    </>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function dateKey(date: Date) { return startOfDay(date).getTime(); }
function monthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
/** Monday-first weeks; `null` is a Blank item. */
function monthDays(month: Date) {
  const first = monthStart(month);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day < 1 || day > count ? null : new Date(first.getFullYear(), first.getMonth(), day);
  });
}
/** What the calendar shows: the single date and the range (each selection mode reads its own). */
type DatePickerSelection = { date: Date | null; range: DatePickerRange | null };
/** The selection in `mode` as a key of days (not instants): equal keys are the same selection. */
function selectionKey(selection: DatePickerSelection, mode: "single" | "range") {
  const day = (date: Date | null | undefined) => (date ? dateKey(date) : "");
  return mode === "range" ? `${day(selection.range?.start)}-${day(selection.range?.end)}` : day(selection.date);
}
const sameSelection = (a: DatePickerSelection, b: DatePickerSelection, mode: "single" | "range") => selectionKey(a, mode) === selectionKey(b, mode);

/** A date range; `end` is null until the second date is picked. */
export interface DatePickerRange {
  start: Date;
  end: Date | null;
}

/** What the Time-Picker holds: 24-hour "HH:mm" times (null while a field is empty) and the All day checks. */
export interface DatePickerTime {
  /** Start time, "HH:mm" (24-hour), or null. */
  from: string | null;
  /** End time, "HH:mm" (24-hour), or null. */
  to: string | null;
  /** All day: the start has no time (single calendar: the whole day, both fields). */
  fromAllDay?: boolean;
  /** Range (dual calendar): the end day is all day. */
  toAllDay?: boolean;
}

const emptyTime: DatePickerTime = { from: null, to: null, fromAllDay: false, toAllDay: false };
const timeKey = (time: DatePickerTime) => `${time.from ?? ""}|${time.to ?? ""}|${time.fromAllDay ? 1 : 0}|${time.toAllDay ? 1 : 0}`;
const pad2 = (value: number) => String(value).padStart(2, "0");
/** Reads "9", "930", "9:30", "09.30" or a 24-hour "21:30"; hours above 12 pick PM, 0 is 12 AM. */
function parseTime(raw: string): { hours: number; minutes: number; period?: "AM" | "PM" } | null {
  const match = raw.trim().match(/^(\d{1,2})(?:[:.h]?(\d{2}))?$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (hours > 23 || minutes > 59) return null;
  if (hours === 0) return { hours: 12, minutes, period: "AM" };
  if (hours > 12) return { hours: hours - 12, minutes, period: "PM" };
  return { hours, minutes };
}
const to24 = (hours: number, minutes: number, period: "AM" | "PM") => `${pad2((hours % 12) + (period === "PM" ? 12 : 0))}:${pad2(minutes)}`;
function from24(value: string | null): { text: string; period: "AM" | "PM" } | null {
  const match = value?.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  return { text: `${pad2(hours % 12 || 12)}:${match[2]}`, period: hours >= 12 ? "PM" : "AM" };
}

/** One time of the Time-Picker: Input/Text-Field Small ("hh:mm") with the AM/PM picker as its Leading-Trailing
 *  (Label + Dropdown). All day makes it Read-only: the times stay readable. */
function DatePickerTimeField({ label, value, allDay, onValueChange, device = "desktop" }: { label: string; value: string | null; allDay: boolean; onValueChange: (value: string | null) => void; device?: DatePickerDevice }) {
  const t = useZenLabels();
  const shown = from24(value);
  const [text, setText] = useState(shown?.text ?? "");
  const [period, setPeriod] = useState<"AM" | "PM">(shown?.period ?? "AM");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    const next = from24(value);
    setText(next?.text ?? "");
    if (next) setPeriod(next.period);
    setInvalid(false);
  }, [value]);
  const commit = (raw: string, nextPeriod: "AM" | "PM") => {
    if (!raw.trim()) { setInvalid(false); if (value !== null) onValueChange(null); return; }
    const parsed = parseTime(raw);
    if (!parsed) { setInvalid(true); return; }
    const resolvedPeriod = parsed.period ?? nextPeriod;
    setInvalid(false);
    setPeriod(resolvedPeriod);
    setText(`${pad2(parsed.hours)}:${pad2(parsed.minutes)}`);
    const next = to24(parsed.hours, parsed.minutes, resolvedPeriod);
    if (next !== value) onValueChange(next);
  };
  return (
    <InputField
      // Figma's Time-Picker fields are Small; on a phone fields stay full size (Medium), like every other input there.
      size={device === "mobile" ? "md" : "sm"}
      label={label}
      placeholder={t.timePlaceholder}
      inputMode="numeric"
      autoComplete="off"
      value={allDay ? "" : text}
      state={allDay ? "read-only" : undefined}
      error={invalid && !allDay ? t.invalidTime : undefined}
      onChange={(event) => { setText(event.target.value); if (invalid) setInvalid(false); }}
      onBlur={() => commit(text, period)}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(text, period); } }}
      trailing={(
        <InputLeadingTrailing
          label={period === "AM" ? t.timeAm : t.timePm}
          options={[{ value: "AM", label: t.timeAm }, { value: "PM", label: t.timePm }]}
          value={period}
          popoverLabel={label}
          interactive={!allDay}
          dropdown
          onValueChange={(next) => { const resolved = next === "PM" ? "PM" : "AM"; setPeriod(resolved); if (text.trim()) commit(text, resolved); }}
        />
      )}
    />
  );
}

export interface DatePickerTimePickerProps {
  /** Figma Type: `single` (From over To, one All day; the Single-Calendar) or `range` (From | To side by side, each with
   *  its own All day; the Dual-Calendar). */
  type?: "single" | "range";
  value: DatePickerTime;
  onValueChange: (time: DatePickerTime) => void;
  /** `mobile`: the time fields are Medium (phones keep full-size inputs); DatePicker passes its own `device`. */
  device?: DatePickerDevice;
}

/** Figma `.Primitives/Date-Picker/Time-Picker` (460:38628): Input/Text-Field Small times with an AM/PM picker and
 *  Checkbox/Text "All day", Spacing/Gap/Medium apart (Gap/XSmall between a range side's field and its checkbox). */
export function DatePickerTimePicker({ type = "single", value, onValueChange, device = "desktop" }: DatePickerTimePickerProps) {
  const t = useZenLabels();
  const set = (patch: Partial<DatePickerTime>) => onValueChange({ ...value, ...patch });
  if (type === "range") {
    return (
      <div className="zen-date-picker__time" data-type="range">
        <div className="zen-date-picker__time-side">
          <DatePickerTimeField device={device} label={t.timeFrom} value={value.from} allDay={Boolean(value.fromAllDay)} onValueChange={(from) => set({ from })} />
          <Checkbox label={t.allDay} checked={Boolean(value.fromAllDay)} onCheckedChange={(fromAllDay) => set({ fromAllDay })} />
        </div>
        <div className="zen-date-picker__time-side">
          <DatePickerTimeField device={device} label={t.timeTo} value={value.to} allDay={Boolean(value.toAllDay)} onValueChange={(to) => set({ to })} />
          <Checkbox label={t.allDay} checked={Boolean(value.toAllDay)} onCheckedChange={(toAllDay) => set({ toAllDay })} />
        </div>
      </div>
    );
  }
  const allDay = Boolean(value.fromAllDay);
  return (
    <div className="zen-date-picker__time" data-type="single">
      <div className="zen-date-picker__time-fields">
        <DatePickerTimeField device={device} label={t.timeFrom} value={value.from} allDay={allDay} onValueChange={(from) => set({ from })} />
        <DatePickerTimeField device={device} label={t.timeTo} value={value.to} allDay={allDay} onValueChange={(to) => set({ to })} />
      </div>
      <Checkbox label={t.allDay} checked={allDay} onCheckedChange={(on) => set({ fromAllDay: on, toAllDay: on })} />
    </div>
  );
}

export interface DatePickerProps {
  /** Default true: DatePicker is the calendar panel itself. As a popover, pass `open` with `onOpenChange` (or `onClose`). */
  open?: boolean;
  /** Single mode, controlled: the selected date. With `showActions` it is the applied date; picks stay a draft until Submit. */
  value?: Date | null;
  /** Single mode, uncontrolled: the date selected at first. */
  defaultValue?: Date | null;
  /** Range mode, controlled: the selected range. With `showActions` it is the applied range; picks stay a draft until Submit. */
  range?: DatePickerRange | null;
  /** Range mode, uncontrolled: the range selected at first. */
  defaultRange?: DatePickerRange | null;
  /** First (left) visible month. */
  month?: Date;
  /** Called with each picked date; in range mode with the start, then again with the end (see `onRangeChange`). With
   * `showActions` a pick is a draft: read the applied value in `onApply`. */
  onValueChange?: (date: Date | null) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (date: Date | null) => void;
  /** Range mode: called with the new start (end = null) and again once the end date is picked. With `showActions`
   * these are drafts: read the applied range in `onApply`. */
  onRangeChange?: (range: DatePickerRange) => void;
  onMonthChange?: (month: Date) => void;
  /**
   * With `showActions`, pressing Submit (the Primary action) applies the picks, then closes a popover. Called with the
   * picked date (single mode; null in range mode) and the picked range (range mode; null in single mode). An
   * uncontrolled picker keeps what was applied and Cancel returns to it; a controlled one expects `value` / `range` to
   * follow. Inline, Submit is disabled until there is a change, and in range mode until the end date is picked.
   */
  onApply?: (value: Date | null, range: DatePickerRange | null, time?: DatePickerTime) => void;
  /**
   * With `showActions`, pressing Cancel (the Tertiary action) drops the picks made since the last Submit (the
   * calendar shows the applied value again), then calls this and closes a popover. Inline, Cancel is disabled while
   * there is nothing to drop. Escape and an outside click close a popover without applying, too.
   */
  onCancel?: () => void;
  /** Popover behaviour: called on a pointer-down outside the picker (and outside `anchorRef`), on
   * Escape, after a single date / a complete range is picked (without actions), and by the actions. */
  onClose?: () => void;
  /** Called with `false` wherever `onClose` is called (the `open` / `onOpenChange` pair of every Zen overlay). */
  onOpenChange?: (open: boolean) => void;
  /** The trigger. Pointer-downs on it are left to its own toggle; Escape returns focus to it. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Figma `Actions`: Cancel + Submit under the calendar. Picks are then a draft that Submit applies (`onApply`) and
   * Cancel drops (`onCancel`); without actions a pick applies at once. */
  showActions?: boolean;
  /** `.Primitives/Date-Picker/Action`: `dual` (Cancel + Submit, default) or `single` (Submit only). */
  action?: "single" | "dual";
  selectionMode?: "single" | "range";
  /** Figma Date-Picker/Single-Calendar or Date-Picker/Dual-Calendar (two consecutive months side by
   * side; Static headers with Back on the first and Next on the second). `stacked`: Date-Picker/Mobile Variant=Multiple
   * (9923:3574) — `monthCount` months one under another, Display headers (no Back / Next: the list scrolls), and one
   * weekday row that stays at the top of the scrolling box (`.Primitives/Date-Picker` 9923:2323 Option 2). */
  calendar?: "single" | "dual" | "stacked";
  /** `calendar="stacked"`: how many months follow the first one shown. Default 12. */
  monthCount?: number;
  /**
   * Figma Date-Picker/Mobile (9923:3576) primitives: `mobile` days fill the width (square cells in Body/Base/Medium,
   * `.Primitives/Mobile-Date-Picker/Item` 9921:3283) under a Heading/Subheading month with Back / Next at the end,
   * Spacing/Gap/XLarge apart (Gap/XSmall for the dual calendar, whose months stack Gap/Medium apart). Unset, an inline
   * calendar follows the breakpoint (the nearest `data-breakpoint`, else ZenProvider) and a popover stays `desktop`
   * (Figma has no mobile popover). A `mobile` popover spans its containing block (a DateField's width).
   */
  device?: DatePickerDevice;
  /**
   * Figma `Time-Picker`: a Divider and `.Primitives/Date-Picker/Time-Picker` under the calendar — From / To times
   * (hh:mm + AM/PM) and All day; stacked on the single calendar, side by side on the dual one. Picking a date no longer
   * closes a popover (the times come next): pair it with `showActions`, whose Submit applies date and time together.
   */
  timePicker?: boolean;
  /** Controlled times (with `timePicker`); with `showActions` it is the applied time. */
  time?: DatePickerTime;
  /** Uncontrolled times at first. */
  defaultTime?: DatePickerTime;
  /** Called with each time change; with `showActions` it is a draft, read the applied one in `onApply`. */
  onTimeChange?: (time: DatePickerTime) => void;
  minDate?: Date;
  maxDate?: Date;
  /**
   * The day the calendar treats as today: the Today ring (`.Primitives/Date-Picker/Item` State=Today) and the month it
   * opens on without a value. Default: the device clock. Pass your app's date when it is not the device's (a server or
   * business date, a demo world, a test).
   */
  today?: Date;
  /** Accessible name of the calendar. Default: the locale's "Choose date" ("Choose dates" for the dual calendar). Name an
   * inline calendar after what it sets ("Start date") when a form shows more than one. */
  "aria-label"?: string;
  /** id of a visible element that names the calendar (a heading or label next to an inline calendar); wins over `aria-label`. */
  "aria-labelledby"?: string;
  className?: string;
}

/** Figma `Date-Picker/Single-Calendar` (895:31954) and `Date-Picker/Dual-Calendar` on the shared token and
 * Button primitives. The single calendar's month/year opens the Select-Month-Year state. It is
 * also the calendar surface used by Input/Date-Field. With `showActions` (Figma Actions,
 * `.Primitives/Date-Picker/Action` 460:38871) picks are a draft: Submit applies it through `onApply(value, range)`,
 * Cancel drops it (`onCancel`) and the calendar shows the applied `value` / `range` again.
 * As a popover (`onClose` / `onOpenChange` / `anchorRef`) it is the Single-Calendar surface: Color/Background/Popover/
 * Default, Color/Border/Popover/Subtle, Corner-Radius/3XLarge, Spacing/Padding/Medium and Effect/Popover. Inline (none of
 * those) it sits in the flow of its container with no surface, as Figma's in-place calendar (`.Primitives/Date-Picker/
 * Calendar` 478:30561, `Date-Picker/Mobile` 9923:3576: no fill, stroke or effect), so it never casts a popover shadow.
 * Semantics follow: the popover is a `role="dialog"`, the inline calendar a `role="group"` (part of the page, not a
 * window over it); both are named "Choose date" / "Choose dates" unless `aria-label` / `aria-labelledby` name them.
 * Today's day carries `aria-current="date"`. */
export function DatePicker({
  open = true,
  value,
  defaultValue = null,
  range,
  defaultRange = null,
  month: controlledMonth,
  onValueChange,
  onChange,
  onRangeChange,
  onMonthChange,
  onApply,
  onCancel,
  onClose,
  onOpenChange,
  anchorRef,
  showActions = false,
  action = "dual",
  selectionMode = "single",
  calendar = "single",
  monthCount = 12,
  device: deviceProp,
  timePicker = false,
  time,
  defaultTime = emptyTime,
  onTimeChange,
  minDate,
  maxDate,
  today: todayProp,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
}: DatePickerProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const weekdays = useMemo(() => weekdayInitials(locale), [locale]);
  // The app's today when given, else the device clock (read each render, so an open calendar crosses midnight).
  const today = todayProp ?? new Date();
  const [internalValue, setInternalValue] = useState<Date | null>(defaultValue);
  const [internalRange, setInternalRange] = useState<DatePickerRange | null>(defaultRange);
  const [internalMonth, setInternalMonth] = useState<Date>(() => monthStart(value ?? defaultValue ?? range?.start ?? defaultRange?.start ?? today));
  const [view, setView] = useState<"days" | "month-year">("days");
  // The applied selection; with actions, picks are a draft over it until Submit (null: no draft, show the applied one).
  const applied: DatePickerSelection = { date: value === undefined ? internalValue : value, range: range === undefined ? internalRange : range };
  const [draft, setDraft] = useState<DatePickerSelection | null>(null);
  const shown = showActions && draft ? draft : applied;
  const selected = shown.date;
  const rangeStart = shown.range?.start ?? null;
  const rangeEnd = shown.range?.end ?? null;
  // Times follow the same draft rule as dates.
  const [internalTime, setInternalTime] = useState<DatePickerTime>(defaultTime);
  const appliedTime = time ?? internalTime;
  const [draftTime, setDraftTime] = useState<DatePickerTime | null>(null);
  const shownTime = showActions && draftTime ? draftTime : appliedTime;
  const timeDirty = Boolean(timePicker && showActions && draftTime && timeKey(draftTime) !== timeKey(appliedTime));
  const dirty = Boolean(showActions && draft && !sameSelection(draft, applied, selectionMode)) || timeDirty;
  // A new applied value (Submit, a controlled change such as a date typed into the field) replaces any draft.
  const appliedKey = selectionKey(applied, selectionMode);
  useEffect(() => { setDraft(null); }, [appliedKey]);
  const appliedTimeKey = timeKey(appliedTime);
  useEffect(() => { setDraftTime(null); }, [appliedTimeKey]);
  const changeTime = (next: DatePickerTime) => {
    if (showActions) setDraftTime(next);
    else if (time === undefined) setInternalTime(next);
    onTimeChange?.(next);
  };
  const currentMonth = controlledMonth ? monthStart(controlledMonth) : internalMonth;
  const months = useMemo(() => (calendar === "stacked" ? Array.from({ length: Math.max(1, monthCount) }, (_, index) => addMonths(currentMonth, index)) : calendar === "dual" ? [currentMonth, addMonths(currentMonth, 1)] : [currentMonth]), [calendar, currentMonth, monthCount]);
  // Smooth view switch: the viewport height follows the measured content (CSS transitions it) and
  // the incoming view plays its enter animation — only after a switch, not on first open.
  const viewRef = useRef<HTMLDivElement>(null);
  const [viewHeight, setViewHeight] = useState<number>();
  const [switched, setSwitched] = useState(false);
  // The viewport clips only while a view switch plays: at rest, hover halos and focus rings (the All day Checkbox's 8px
  // halo) paint past its edge.
  const [switching, setSwitching] = useState(false);
  useLayoutEffect(() => {
    const node = viewRef.current;
    if (!node) return undefined;
    setViewHeight(node.offsetHeight);
    const observer = new ResizeObserver(() => setViewHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, [view, open]);
  const switchView = (next: "days" | "month-year") => {
    setSwitched(true);
    setSwitching(true);
    setView(next);
    // The focused control unmounts with the old view; land on the month/year header of the day view.
    if (next === "days") requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("button.zen-date-picker__month")?.focus({ preventScroll: true }));
  };
  // Light dismiss, as a popover: pointer-down outside the surface and its trigger closes it.
  const rootRef = useRef<HTMLDivElement>(null);
  // As a popover (absolutely positioned), sit 4px from the trigger's input box — or above it when
  // the trigger is near the bottom of the viewport. Inline (static) pickers are not moved.
  const placement = useAnchoredPosition(rootRef, open, {
    anchor: () => {
      const anchor = anchorRef?.current;
      return anchor?.querySelector<HTMLElement>(".zen-input__control") ?? anchor;
    },
  });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const hasClose = Boolean(onClose || onOpenChange);
  // Inline: rendered in place (no close callback, no trigger) rather than as a popover. It drops the popover surface.
  const inline = !hasClose && !anchorRef;
  // Device: an inline calendar follows the nearest data-breakpoint (ZenProvider's, or a frame that only sets the attribute,
  // such as a phone preview), else the provider's breakpoint; a popover stays desktop unless `device` says otherwise.
  const zen = useZen();
  const [domBreakpoint, setDomBreakpoint] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (open) setDomBreakpoint(rootRef.current?.parentElement?.closest("[data-breakpoint]")?.getAttribute("data-breakpoint") ?? null);
  }, [open, zen?.breakpoint]);
  const device: DatePickerDevice = deviceProp ?? (inline && (domBreakpoint ?? zen?.breakpoint) === "mobile" ? "mobile" : "desktop");
  /** Every close request: `onClose()` and `onOpenChange(false)`. */
  const requestClose = () => { onCloseRef.current?.(); onOpenChangeRef.current?.(false); };
  // One popover at a time (shared with Popover): opening the calendar closes any other object's popover and vice versa.
  useExclusivePopover(open, hasClose ? requestClose : undefined, rootRef, anchorRef);
  useEffect(() => {
    if (!open || !hasClose) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target) || anchorRef?.current?.contains(target)) return;
      requestClose();
    };
    // Escape while focus is still on the trigger (e.g. an input that opened it on focus).
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active = document.activeElement;
      if (active && anchorRef?.current?.contains(active)) requestClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, hasClose, anchorRef]);
  // Every opening starts on the day view and on the applied value (closing without Submit drops the draft).
  useEffect(() => { if (!open) { setView("days"); setSwitched(false); setDraft(null); setDraftTime(null); } }, [open]);
  // …and on its month: a date typed into the field while the calendar was closed (or set by the app) is where it opens,
  // else today's month. Before paint, so the old month never flashes. A controlled `month` stays the caller's.
  // Only when it opens (deps: open): browsing months while open is the user's.
  useLayoutEffect(() => {
    if (open && !controlledMonth) setInternalMonth(monthStart(applied.date ?? applied.range?.start ?? today));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => {
    requestClose();
    // Back to the trigger: the anchor itself, else a field's own input (not a label tooltip or action before it), else
    // the anchor's first focusable element.
    const anchor = anchorRef?.current;
    (anchor?.matches("button, input, [tabindex]") ? anchor : anchor?.querySelector<HTMLElement>(".zen-input__native:not(:disabled)") ?? anchor?.querySelector<HTMLElement>("button, input, [tabindex]"))?.focus({ preventScroll: true });
  };
  if (!open) return null;
  const setMonth = (next: Date) => {
    const resolved = monthStart(next);
    setInternalMonth(resolved);
    onMonthChange?.(resolved);
  };
  const selectDate = (date: Date) => {
    if (minDate && dateKey(date) < dateKey(minDate)) return;
    if (maxDate && dateKey(date) > dateKey(maxDate)) return;
    if (selectionMode === "range") {
      // A pick after a complete range (or the first one) starts a new range; the next completes it, in either order.
      const before = rangeStart && !rangeEnd ? dateKey(date) < dateKey(rangeStart) : false;
      const next: DatePickerRange = !rangeStart || rangeEnd ? { start: date, end: null } : { start: before ? date : rangeStart, end: before ? rangeStart : date };
      if (showActions) setDraft({ date: shown.date, range: next });
      else if (range === undefined) setInternalRange(next);
      onValueChange?.(next.end ?? next.start);
      onChange?.(next.end ?? next.start);
      onRangeChange?.(next);
      // With a Time-Picker the times come after the dates, so a pick never closes the popover.
      if (next.end && !showActions && !timePicker) close();
      return;
    }
    if (showActions) setDraft({ date, range: shown.range });
    else if (value === undefined) setInternalValue(date);
    onValueChange?.(date);
    onChange?.(date);
    if (!showActions && !timePicker) close();
  };
  // Inline, both actions turn disabled once nothing is left to apply or drop: keyboard focus on the one just pressed
  // would fall back to the page, so it moves to the calendar (the selected day, else the first day that can be picked).
  const finishAction = () => {
    if (hasClose) { close(); return; }
    const root = rootRef.current;
    if (!root?.querySelector(".zen-date-picker__actions")?.contains(document.activeElement)) return;
    requestAnimationFrame(() => {
      const days = root.querySelector(".zen-date-picker__panels");
      (days?.querySelector<HTMLElement>(".zen-date-picker__day:is([data-state^='range-selected'], [data-state='single-selected'])") ?? days?.querySelector<HTMLElement>(".zen-date-picker__day:not(:disabled)"))?.focus({ preventScroll: true });
    });
  };
  // Submit: the draft becomes the applied value (kept here when uncontrolled; a controlled parent follows onApply).
  const apply = () => {
    if (selectionMode === "range") { if (range === undefined) setInternalRange(shown.range); }
    else if (value === undefined) setInternalValue(shown.date);
    if (timePicker && time === undefined) setInternalTime(shownTime);
    setDraft(null);
    setDraftTime(null);
    onApply?.(selectionMode === "range" ? null : shown.date, selectionMode === "range" ? shown.range : null, timePicker ? shownTime : undefined);
    finishAction();
  };
  // Cancel: drop the draft, so the calendar shows the applied value again.
  const cancel = () => {
    setDraft(null);
    setDraftTime(null);
    onCancel?.();
    finishAction();
  };
  // A range is applied whole: Submit waits for its end date.
  const complete = selectionMode !== "range" || !shown.range || shown.range.end !== null;
  const isDisabled = (date: Date) => Boolean((minDate && dateKey(date) < dateKey(minDate)) || (maxDate && dateKey(date) > dateKey(maxDate)));
  const stateFor = (date: Date): DatePickerItemState => {
    const key = dateKey(date);
    if (isDisabled(date)) return "disabled";
    if (selectionMode === "range" && rangeStart && rangeEnd && key > dateKey(rangeStart) && key < dateKey(rangeEnd)) return "in-range";
    if (selectionMode === "range" && rangeStart && key === dateKey(rangeStart)) return "range-selected-start";
    if (selectionMode === "range" && rangeEnd && key === dateKey(rangeEnd)) return "range-selected-end";
    if (selected && key === dateKey(selected)) return "single-selected";
    if (key === dateKey(today)) return "today";
    if (date.getDay() === 0 || date.getDay() === 6) return "weekend";
    return "default";
  };
  const dual = calendar === "dual" || calendar === "stacked";
  const stacked = calendar === "stacked";
  const weekdayRow = (className?: string) => <div className={["zen-date-picker__weekdays", className].filter(Boolean).join(" ")} aria-hidden={stacked || undefined}>{weekdays.map((day, dayIndex) => <span key={`${day}-${dayIndex}`}>{day}</span>)}</div>;
  return (
    <div
      ref={rootRef}
      className={["zen-date-picker", className].filter(Boolean).join(" ")}
      // A popover is a dialog over the page; an inline calendar is a group within it.
      role={inline ? "group" : "dialog"}
      aria-label={ariaLabelledBy ? undefined : ariaLabel ?? (dual ? t.chooseDates : t.chooseDate)}
      aria-labelledby={ariaLabelledBy}
      data-calendar={calendar}
      data-device={device}
      data-view={view}
      data-placement={inline ? "inline" : "popover"}
      data-side={inline ? undefined : placement.side}
      style={inline ? undefined : placement.style}
      onKeyDown={(event) => {
        // An inner popover (the AM/PM picker) handles its own Escape first.
        if (event.key !== "Escape" || event.defaultPrevented) return;
        // Escape steps back out of Select-Month-Year first, then closes the popover. Either way the key is used up here
        // (preventDefault + stopPropagation), so a Dialog or Side Panel around the field stays open. Inline, on the day
        // view, there is nothing to close: Escape goes on to the page.
        if (view === "month-year") switchView("days");
        else if (hasClose) close();
        else return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="zen-date-picker__viewport" data-switching={switching || undefined} style={viewHeight === undefined ? undefined : { height: viewHeight + 8 }}
        onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === "height") setSwitching(false); }}>
        <div ref={viewRef} key={view} className={["zen-date-picker__view", switched ? "is-entering" : ""].filter(Boolean).join(" ")}
          onAnimationEnd={(event) => { if (event.target === event.currentTarget) setSwitching(false); }}>
          {view === "month-year" ? (
            <DatePickerMonthYear
              month={currentMonth}
              onCancel={() => switchView("days")}
              onSubmit={(next) => { setMonth(next); switchView("days"); }}
            />
          ) : (
            <>
              {stacked ? <div className={`zen-date-picker__sticky-weekdays ${typographyStyles["Body/Small/Medium"]}`}>{weekdayRow()}</div> : null}
              <div className="zen-date-picker__panels">
                {months.map((month, index) => (
                  <div className="zen-date-picker__panel" key={month.toISOString()}>
                    <DatePickerHeader
                      month={month}
                      type={stacked ? "display" : dual ? "static" : "interactive"}
                      back={!dual || index === 0}
                      next={!dual || index === months.length - 1}
                      onPrevious={() => setMonth(addMonths(currentMonth, -1))}
                      onNext={() => setMonth(addMonths(currentMonth, 1))}
                      onMonthYearClick={() => switchView("month-year")}
                      device={device}
                    />
                    <div className={`zen-date-picker__calendar ${typographyStyles["Body/Small/Medium"]}`}>
                      {stacked ? null : weekdayRow()}
                      <div className="zen-date-picker__grid">{monthDays(month).map((date, dayIndex) => date ? <DatePickerItem key={date.toISOString()} device={device} day={date.getDate()} date={date} state={stateFor(date)} aria-current={dateKey(date) === dateKey(today) ? "date" : undefined} disabled={isDisabled(date)} onClick={() => selectDate(date)} /> : <DatePickerItem key={`blank-${dayIndex}`} device={device} state="blank" />)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {timePicker ? <><Divider /><DatePickerTimePicker type={dual ? "range" : "single"} value={shownTime} onValueChange={changeTime} device={device} /></> : null}
              {/* Inline there is nothing to close: the actions are live only while there is a draft to apply or drop. */}
              {showActions ? <DatePickerAction action={action} onCancel={cancel} onApply={apply} cancelDisabled={!dirty && !hasClose} applyDisabled={!complete || (!dirty && !hasClose)} /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
