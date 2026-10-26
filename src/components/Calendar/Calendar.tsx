import { useLayoutEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type MouseEventHandler, type ReactNode, type Ref, type RefObject } from "react";
import { AvatarStack } from "../Avatar";
import { VisuallyHidden } from "../VisuallyHidden";
import { scaleKey } from "../_shared/scale";
import { useZen, useZenLabels } from "../_shared/zen-context";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { typographyStyles } from "../../tokens/typography.generated";
import type { CalendarColor } from "./calendarDates";
import "./calendar.css";

/** Figma Device of the Calendar sets: `desktop` or `mobile` (phones). */
export type CalendarDevice = "desktop" | "mobile";

/**
 * The device a view draws: the `device` prop, else the nearest `data-breakpoint` (a ZenProvider, or a phone frame that
 * only sets the attribute), else the provider's breakpoint — as DatePicker. Read after mount, so the first paint of a
 * server render is desktop.
 */
export function useCalendarDevice(device: CalendarDevice | undefined, rootRef: RefObject<HTMLElement | null>): CalendarDevice {
  const zen = useZen();
  const [domBreakpoint, setDomBreakpoint] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!device) setDomBreakpoint(rootRef.current?.parentElement?.closest("[data-breakpoint]")?.getAttribute("data-breakpoint") ?? null);
  }, [device, zen?.breakpoint, rootRef]);
  return device ?? ((domBreakpoint ?? zen?.breakpoint) === "mobile" ? "mobile" : "desktop");
}

const join = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/**
 * Arrow keys between the day buttons of a calendar grid (month cells, the mobile month, the week strip): each button
 * carries `data-calendar-day="<grid index>"`; ArrowLeft / ArrowRight move a day, ArrowUp / ArrowDown a week (`columns`
 * days; 0 on a single row), Home / End to the row's ends. Days that are not buttons (blank cells) are skipped over.
 */
export function moveDayFocus(event: { key: string; target: EventTarget; preventDefault: () => void }, root: HTMLElement | null, columns: number) {
  const target = event.target as HTMLElement;
  if (!root || !target.hasAttribute?.("data-calendar-day")) return;
  const from = Number(target.getAttribute("data-calendar-day"));
  const days = new Map(Array.from(root.querySelectorAll<HTMLElement>("[data-calendar-day]:not(:disabled)")).map((day) => [Number(day.getAttribute("data-calendar-day")), day]));
  const last = Math.max(...days.keys());
  const rowStart = from - (from % 7);
  // Candidate grid indexes in the order to try: the first real day wins (blank cells are skipped).
  const walk = (start: number, step: number, end: number) => { const out: number[] = []; for (let index = start; step > 0 ? index <= end : index >= end; index += step) out.push(index); return out; };
  const order: Record<string, number[]> = {
    ArrowLeft: walk(from - 1, -1, 0),
    ArrowRight: walk(from + 1, 1, last),
    ArrowUp: columns ? walk(from - columns, -columns, 0) : [],
    ArrowDown: columns ? walk(from + columns, columns, last) : [],
    Home: walk(rowStart, 1, rowStart + 6),
    End: walk(rowStart + 6, -1, rowStart),
  };
  const next = (order[event.key] ?? []).map((index) => days.get(index)).find(Boolean);
  if (!next) return;
  event.preventDefault();
  next.focus();
}

/* ── .Primitives/Calendar/Event (16123:87) ───────────────────────────────────────────────────────────────────────── */

export interface CalendarEventProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "color"> {
  /** Figma Title: one line, truncated with "…". */
  title: ReactNode;
  /** Figma Time ("09:00"); not shown on an all-day event. */
  time?: ReactNode;
  /** Figma Kind: `timed` (Subtle fill, time + title) or `all-day` (Solid fill, title only). */
  kind?: "timed" | "all-day";
  /** Figma Color: the event's calendar. Brand is the default; other hues only tell calendars apart. */
  color?: CalendarColor;
  /** Figma State=Selected: while the event's details popover is open (Solid fill; Rich for all-day). Pair it with the
   * popover's open state and pass `aria-expanded` yourself. */
  selected?: boolean;
  /** Pressing the chip (open its details). Without it the chip is static text, not a button. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Ref to the root element (a `<button>` when pressable, else a `<div>`). */
  ref?: Ref<HTMLElement>;
}

/**
 * Figma `.Primitives/Calendar/Event` (16123:87): an event chip in a month cell. Padding 3XSmall · 2XSmall, Gap/2XSmall,
 * Corner-Radius/XSmall. Timed: `Color/Background/Support/<Hue>/Subtle` with Time (Caption/Bold) and Title
 * (Caption/Medium) in `Color/Content/Support/<Hue>/Strongest` (Brand: `Color/Content/Accent/Strongest`); Selected
 * fills Solid with `Color/Content/On-Colors`. All-day: Solid with the title in Caption/Bold On-Colors; Selected Rich.
 */
export function CalendarEvent({ title, time, kind = "timed", color = "brand", selected = false, onClick, className, ref, ...rest }: CalendarEventProps) {
  const allDay = kind === "all-day";
  const content = (
    <>
      {!allDay && time ? <span className={join("zen-calendar-event__time", typographyStyles["Caption/Bold"])}>{time}</span> : null}
      <span className={join("zen-calendar-event__title", typographyStyles[allDay ? "Caption/Bold" : "Caption/Medium"])}>{title}</span>
    </>
  );
  const shared = { className: join("zen-calendar-event", className), "data-color": color, "data-kind": kind, "data-selected": selected || undefined };
  return onClick
    ? <button {...rest} {...shared} ref={ref as Ref<HTMLButtonElement>} type="button" onClick={onClick}>{content}</button>
    : <div {...(rest as HTMLAttributes<HTMLDivElement>)} {...shared} ref={ref as Ref<HTMLDivElement>}>{content}</div>;
}

/* ── .Primitives/Calendar/Event-Block (16123:130) ────────────────────────────────────────────────────────────────── */

export interface CalendarEventBlockProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "color"> {
  /** Figma Title: up to two lines, truncated. */
  title: ReactNode;
  /** Figma Time ("11:00 – 12:00"): one line, truncated. */
  time?: ReactNode;
  /** Figma Show-Time (default true). The Time-Grid hides it on a block too short for two lines. */
  showTime?: boolean;
  /** How many lines the title may take before "…": 2 (Figma, default) or 1. The Time-Grid sets 1 on blocks shorter
   * than an hour, whose height holds one title line (and the time from 45 minutes). */
  titleLines?: 1 | 2;
  /** Figma Color (default brand). */
  color?: CalendarColor;
  /** Figma State=Selected: while its details popover is open (Solid fill, On-Colors text). */
  selected?: boolean;
  /** Pressing the block (open its details). Without it the block is static. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Ref to the root element (a `<button>` when pressable, else a `<div>`). */
  ref?: Ref<HTMLElement>;
}

/**
 * Figma `.Primitives/Calendar/Event-Block` (16123:130): a timed event in the week / day grid. Padding 2XSmall · XSmall,
 * Gap/3XSmall, Corner-Radius/XSmall, clipped; `Support/<Hue>/Subtle` with a 2px `Color/Border/Support/<Hue>/Solid` rule
 * on the leading edge and Effect/Overlay (a backdrop blur over the hour rules). Title Caption/Bold Strongest (2 lines),
 * Time Caption/Regular Base. Selected: Solid fill, On-Colors text, no effect.
 */
export function CalendarEventBlock({ title, time, showTime = true, titleLines = 2, color = "brand", selected = false, onClick, className, ref, ...rest }: CalendarEventBlockProps) {
  const content = (
    <>
      <span className={join("zen-calendar-block__title", typographyStyles["Caption/Bold"])}>{title}</span>
      {showTime && time ? <span className={join("zen-calendar-block__time", typographyStyles["Caption/Regular"])}>{time}</span> : null}
    </>
  );
  const shared = { className: join("zen-calendar-block", className), "data-color": color, "data-selected": selected || undefined, "data-title-lines": titleLines === 1 ? 1 : undefined };
  return onClick
    ? <button {...rest} {...shared} ref={ref as Ref<HTMLButtonElement>} type="button" onClick={onClick}>{content}</button>
    : <div {...(rest as HTMLAttributes<HTMLDivElement>)} {...shared} ref={ref as Ref<HTMLDivElement>}>{content}</div>;
}

/* ── .Primitives/Calendar/Date (16123:146) ───────────────────────────────────────────────────────────────────────── */

const calendarDateSizes = ["medium", "large"] as const;

export interface CalendarDateProps extends HTMLAttributes<HTMLSpanElement> {
  /** Figma Day: the day number. */
  day: ReactNode;
  /** Figma Size: `md` (24, month cells and agenda) or `lg` (36, week / day column headers); short or Figma spelling. */
  size?: "md" | "lg" | "medium" | "large";
  /** Figma State: `default`, `today` (Accent Solid circle) or `muted` (a day of the previous or next month). */
  state?: "default" | "today" | "muted";
  /** Ref to the root `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Figma `.Primitives/Calendar/Date` (16123:146): the day number in a Corner-Radius/Rounded square, Medium 24 in
 * Body/Small/Medium, Large 36 in Heading/4. Default `Color/Content/Neutral/Strongest`, Muted Neutral/Light, Today
 * `Color/Background/Accent/Solid/Default` with `Color/Content/On-Accent/Default` — the only accent on a grid besides the
 * now line. Visual only: the views name the day on the control that holds it.
 */
export function CalendarDate({ day, size: sizeProp = "md", state = "default", className, ref, ...rest }: CalendarDateProps) {
  const size = scaleKey(sizeProp, calendarDateSizes);
  return (
    <span {...rest} ref={ref} className={join("zen-calendar-date", typographyStyles[size === "large" ? "Heading/4" : "Body/Small/Medium"], className)} data-size={size} data-state={state}>
      {day}
    </span>
  );
}

/* ── .Primitives/Calendar/Now-Line (16123:153) ───────────────────────────────────────────────────────────────────── */

export interface CalendarNowLineProps extends HTMLAttributes<HTMLDivElement> {
  /** Figma Orientation: `horizontal` (across today's Time-Grid column) or `vertical` (down a resource or Gantt track). */
  orientation?: "horizontal" | "vertical";
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** Figma `.Primitives/Calendar/Now-Line` (16123:153): an 8px Accent dot and a 2px Accent line
 * (`Color/Background/Accent/Solid/Default`). Decorative: hidden from assistive technology. One per view, and only when now
 * is in the visible range. */
export function CalendarNowLine({ orientation = "horizontal", className, ref, ...rest }: CalendarNowLineProps) {
  return <div {...rest} ref={ref} className={join("zen-calendar-now", className)} data-orientation={orientation} aria-hidden="true"><i /><b /></div>;
}

/* ── .Primitives/Calendar/Day-Cell (16124:105) ───────────────────────────────────────────────────────────────────── */

export interface CalendarDayCellProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Figma Day: the day number. */
  day: ReactNode;
  /** The full date: names the date button in the locale ("Wednesday, September 30, 2026, 3 events"). */
  label?: string;
  /** Figma State: `default`, `today` (Accent date), `selected` (Accent Flat tint: the day the user pressed) or `outside`
   * (a day of the previous or next month: Surface Alt, muted date, no events). */
  state?: "default" | "today" | "selected" | "outside";
  /** With `state="selected"`: draw the date as Today too (today is the selected day). */
  today?: boolean;
  /** Figma Events slot: the day's `CalendarEvent` chips (at most three; with more, two and `more`). */
  children?: ReactNode;
  /** Figma More: how many events do not fit. Above 0 it shows "+N more". */
  more?: number;
  /** Pressing "+N more" (show the whole day). Without it "+N more" is text. */
  onMoreClick?: () => void;
  /** Pressing the date or the cell: select the day. Without it the date is not a button. */
  onSelect?: () => void;
  /** Whether the date button is in the tab order (the month keeps one day there and moves focus with the arrows).
   * Default true. */
  focusable?: boolean;
  /** Props of the date button (`data-*` the month's arrow keys read, `ref`). */
  dateProps?: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> } & Record<`data-${string}`, string | number | undefined>;
  /** Figma instance overrides of the date it draws (`{ "Date": { size: "lg" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `.Primitives/Calendar/Day-Cell` (16124:105): one day of the desktop month — Padding/XSmall, Gap/2XSmall, the
 * date (Medium), the Events slot (Gap/3XSmall) and "+N more" (Caption/Medium, Neutral/Light). It draws the right and
 * bottom 1px `Color/Border/Neutral/Pale/Default` rules (the month turns them off on its last column and row). Selected
 * tints `Color/Background/Accent/Flat/Default`; Outside fills `Color/Background/Surface/Alt`.
 */
export function CalendarDayCell({ day, label, state = "default", today = false, children, more = 0, onMoreClick, onSelect, focusable = true, dateProps, overrides, className, ref, ...rest }: CalendarDayCellProps) {
  const t = useZenLabels();
  const nest = useNested(overrides);
  const dateState = state === "today" || today ? "today" : state === "outside" ? "muted" : "default";
  const date = nest("Date", <CalendarDate day={day} state={dateState} />);
  return (
    <div
      {...rest}
      ref={ref}
      className={join("zen-calendar-cell", className)}
      data-state={state}
      // A press on the cell's empty space selects the day too (pointer only: keyboard users press the date button).
      onClick={onSelect ? (event) => { rest.onClick?.(event); if (event.target === event.currentTarget) onSelect(); } : rest.onClick}
    >
      {onSelect
        ? <button {...dateProps} type="button" className="zen-calendar-cell__date" aria-label={label} aria-pressed={state === "selected"} aria-current={dateState === "today" ? "date" : undefined} tabIndex={focusable ? 0 : -1} onClick={onSelect}>{date}</button>
        : <span className="zen-calendar-cell__date"><span aria-hidden={label ? true : undefined}>{date}</span>{label ? <VisuallyHidden>{label}</VisuallyHidden> : null}</span>}
      {state === "outside" ? null : <div className="zen-calendar-cell__events">{children}</div>}
      {more > 0 && state !== "outside"
        ? onMoreClick
          ? <button type="button" className={join("zen-calendar-cell__more", typographyStyles["Caption/Medium"])} aria-label={t.showMoreEvents(more)} onClick={onMoreClick}>{t.moreEvents(more)}</button>
          : <span className={join("zen-calendar-cell__more", typographyStyles["Caption/Medium"])}>{t.moreEvents(more)}</span>
        : null}
    </div>
  );
}

/* ── .Primitives/Calendar/Agenda-Item (16124:373) ────────────────────────────────────────────────────────────────── */

export interface CalendarAgendaItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "color"> {
  /** Figma Start ("09:00", or "All day"). */
  start: ReactNode;
  /** Figma End ("09:30"); leave it out for an all-day event. */
  end?: ReactNode;
  /** Figma Title (one line, truncated). */
  title: ReactNode;
  /** Figma Meta: place · link (one line, truncated). */
  meta?: ReactNode;
  /** Figma Color: the rule's hue (default brand). */
  color?: CalendarColor;
  /** Figma Attendees (desktop only): AvatarStack items (Size Small, Background Subtle, up to 3). */
  attendees?: Array<{ src?: string; alt?: string }>;
  /** Figma Device: `desktop` (72px time column, attendees) or `mobile` (48px). */
  device?: CalendarDevice;
  /** Pressing the row (open the event). Without it the row is static. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Figma instance overrides of the AvatarStack it draws (`{ "Attendees": { max: 4 } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root element (a `<button>` when pressable, else a `<div>`). */
  ref?: Ref<HTMLElement>;
}

/**
 * Figma `.Primitives/Calendar/Agenda-Item` (16124:373): Padding XSmall · Small (mobile XSmall), Gap/Small,
 * Corner-Radius/Small. Time column (72 / 48, Gap/3XSmall): Start Body/Small/Medium Strongest over End Caption/Regular
 * Light; a 4px Corner-Radius/Rounded rule in `Color/Background/Support/<Hue>/Solid`; Title Body/Base/Medium Strongest
 * over Meta Caption/Regular Light; on desktop the attendees (Avatar/Stack Small Subtle).
 */
export function CalendarAgendaItem({ start, end, title, meta, color = "brand", attendees, device = "desktop", onClick, overrides, className, ref, ...rest }: CalendarAgendaItemProps) {
  const nest = useNested(overrides);
  const content = (
    <>
      <span className="zen-calendar-agenda-item__time">
        <span className={join("zen-calendar-agenda-item__start", typographyStyles["Body/Small/Medium"])}>{start}</span>
        {end ? <span className={join("zen-calendar-agenda-item__end", typographyStyles["Caption/Regular"])}>{end}</span> : null}
      </span>
      <span className="zen-calendar-agenda-item__rule" aria-hidden="true" />
      <span className="zen-calendar-agenda-item__content">
        <span className={join("zen-calendar-agenda-item__title", typographyStyles["Body/Base/Medium"])}>{title}</span>
        {meta ? <span className={join("zen-calendar-agenda-item__meta", typographyStyles["Caption/Regular"])}>{meta}</span> : null}
      </span>
      {device === "desktop" && attendees?.length ? nest("Attendees", <AvatarStack className="zen-calendar-agenda-item__people" size="sm" background="subtle" max={3} showMore items={attendees} />) : null}
    </>
  );
  const shared = { className: join("zen-calendar-agenda-item", className), "data-color": color, "data-device": device };
  return onClick
    ? <button {...rest} {...shared} ref={ref as Ref<HTMLButtonElement>} type="button" onClick={onClick}>{content}</button>
    : <div {...(rest as HTMLAttributes<HTMLDivElement>)} {...shared} ref={ref as Ref<HTMLDivElement>}>{content}</div>;
}

/* ── .Primitives/Calendar/Day-Tile (16142:3915) ──────────────────────────────────────────────────────────────────── */

export interface CalendarDayTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Figma Weekday ("Wed"). */
  weekday: ReactNode;
  /** Figma Day ("30"). */
  day: ReactNode;
  /** Figma State=Selected: a `Color/Background/Active/Neutral/Subtle` tile (`Active/Accent/Subtle` on today). */
  selected?: boolean;
  /** Figma Today=Yes: the weekday in Accent/Strongest, the date in Accent/Base. */
  today?: boolean;
  /** The full date, the tile's accessible name ("Wednesday, September 30, 2026"). */
  label?: string;
  /** Ref to the root `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Figma `.Primitives/Calendar/Day-Tile` (16142:3915): one day of Calendar/Week-Strip Style=Tile — Padding/XSmall,
 * Gap/3XSmall, Corner-Radius/Large; Weekday Caption/Medium Neutral/Light over Day Body/Base/Bold Strongest (Today: the
 * weekday `Color/Content/Accent/Strongest`, the day `Accent/Base`). Selected: `Color/Background/Active/Neutral/Subtle`, or
 * `Active/Accent/Subtle` on today, with no stroke (Figma updated 2026-10-26).
 */
export function CalendarDayTile({ weekday, day, selected = false, today = false, label, className, ref, ...rest }: CalendarDayTileProps) {
  return (
    <button {...rest} ref={ref} type="button" className={join("zen-calendar-tile", className)} data-selected={selected || undefined} data-today={today || undefined}
      aria-pressed={selected} aria-current={today ? "date" : undefined} aria-label={label}>
      <span className={join("zen-calendar-tile__weekday", typographyStyles["Caption/Medium"])}>{weekday}</span>
      <span className={join("zen-calendar-tile__day", typographyStyles["Body/Base/Bold"])}>{day}</span>
    </button>
  );
}
