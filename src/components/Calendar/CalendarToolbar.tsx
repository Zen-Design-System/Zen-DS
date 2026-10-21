import { useRef, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Button, IconButton } from "../Button";
import { Segmented } from "../Segmented";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useMergedRefs } from "../_shared/merge-refs";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { useCalendarDevice, type CalendarDevice } from "./Calendar";
import { addDays, calendarTitle, dayKey, startOfDay, startOfWeek, toDateOr, type CalendarDateInput, type CalendarView } from "./calendarDates";
import "./calendar.css";
import "../Icon/core";

export interface CalendarToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Figma Title: the visible period ("September 2026"). Default: the period around `date` for `view` (Week
   * "Sep 28 – Oct 4, 2026", Day "Wednesday, September 30, 2026"); on mobile the short form ("Sep 2026"), which fits
   * beside the buttons in the Mobile typography. */
  title?: ReactNode;
  /** The day the views show ("2026-09-30" or a Date); with no `title` it names the period. */
  date?: CalendarDateInput;
  /** The day treated as today: while the shown period already holds it, Today is disabled (pressing it would change
   * nothing). Default: the device clock. */
  today?: CalendarDateInput;
  /** Heading level of the title: one below the page heading. Default 2. */
  titleLevel?: 2 | 3 | 4;
  /** The selected view of the switch. */
  view?: CalendarView;
  /** The views the switch offers, in order (Figma: Month · Week · Day · Agenda). Hide views the product does not
   * offer; an empty list hides the switch. */
  views?: CalendarView[];
  /** Called with the view the person picks. */
  onViewChange?: (view: CalendarView) => void;
  /** Today (Tertiary button): back to today's period. Without it the button is left out. */
  onToday?: () => void;
  /** Previous period (Tertiary icon button). */
  onPrevious?: () => void;
  /** Next period (Tertiary icon button). */
  onNext?: () => void;
  /** Figma Device: `desktop` (one row: Today, arrows, title; the switch at the end) or `mobile` (title and the 40px
   * buttons, then a full-width switch). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Figma instance overrides of the buttons and switch it draws (`{ "Today": { level: "secondary" } }`). Written by
   * Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_VIEWS: CalendarView[] = ["month", "week", "day", "agenda"];

/**
 * Figma `Calendar/Toolbar` (16125:399): the control row above a calendar view. Desktop: Today (Button/Main Small
 * Tertiary), Previous / Next (Button/Icon-Main Small Tertiary, Gap/XSmall), the period in Heading/3 (Gap/Small after the
 * Today button), and the view switch (Segmented Secondary Small) at the end, Gap/Medium. Mobile: the title with Today and
 * the arrows (Medium, 40px, Gap/XSmall) on one row, the full-width switch (Segmented Medium) Gap/Small under it.
 * Only Tertiary buttons: the page's main action (New event) belongs to the page header. The title is an `aria-live`
 * heading, so moving to another period is announced.
 */
export function CalendarToolbar({ title, date: dateProp, today: todayProp, titleLevel = 2, view = "month", views = DEFAULT_VIEWS, onViewChange, onToday, onPrevious, onNext, device: deviceProp, overrides, className, ref, ...rest }: CalendarToolbarProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const mobile = device === "mobile";
  const date = toDateOr(dateProp);
  const today = toDateOr(todayProp) ?? new Date();
  const period = mobile && view === "week" ? "3-day" : view;
  const showsToday = date ? inPeriod(today, date, period) : false;
  const size = mobile ? "md" : "sm";
  const Heading = `h${titleLevel}` as const;
  const unit = view === "month" ? "month" : view === "week" || view === "agenda" ? "week" : "day";
  const previousLabel = unit === "month" ? t.previousMonth : unit === "week" ? t.previousWeek : t.previousDay;
  const nextLabel = unit === "month" ? t.nextMonth : unit === "week" ? t.nextWeek : t.nextDay;
  const heading = (
    <Heading className={["zen-calendar-toolbar__title", typographyStyles["Heading/3"]].join(" ")} aria-live="polite">
      {title ?? (date ? calendarTitle(date, period, locale, { short: mobile }) : null)}
    </Heading>
  );
  const todayButton = onToday ? nest("Today", <Button appearance="main" level="tertiary" size={size} onClick={onToday} disabled={showsToday}>{t.today}</Button>) : null;
  const arrows = (
    <div className="zen-calendar-toolbar__arrows">
      {nest("Previous", <IconButton appearance="main" level="tertiary" size={size} icon="icon-chevron-left-line-small" aria-label={previousLabel} onClick={onPrevious} disabled={!onPrevious} />)}
      {nest("Next", <IconButton appearance="main" level="tertiary" size={size} icon="icon-chevron-right-line-small" aria-label={nextLabel} onClick={onNext} disabled={!onNext} />)}
    </div>
  );
  const switcher = views.length ? nest("View", (
    <Segmented
      className="zen-calendar-toolbar__views"
      size={size}
      fullWidth={mobile}
      aria-label={t.calendarViews}
      value={view}
      options={views.map((id) => ({ id, label: t.calendarView(id) }))}
      onValueChange={(id) => onViewChange?.(id as CalendarView)}
    />
  )) : null;
  return (
    <div {...rest} ref={mergedRef} className={["zen-calendar-toolbar", className].filter(Boolean).join(" ")} data-device={device}>
      {mobile ? (
        <>
          <div className="zen-calendar-toolbar__navigation">
            {heading}
            <div className="zen-calendar-toolbar__actions">{todayButton}{arrows}</div>
          </div>
          {switcher}
        </>
      ) : (
        <>
          <div className="zen-calendar-toolbar__navigation">{todayButton}{arrows}{heading}</div>
          {switcher}
        </>
      )}
    </div>
  );
}

/** Whether `day` falls in the period `view` shows around `date` (the month, the week, the three days, the day). */
function inPeriod(day: Date, date: Date, view: CalendarView) {
  if (view === "month") return day.getFullYear() === date.getFullYear() && day.getMonth() === date.getMonth();
  if (view === "week" || view === "agenda") return dayKey(startOfWeek(day)) === dayKey(startOfWeek(date));
  if (view === "3-day") return dayKey(day) >= dayKey(addDays(startOfDay(date), -1)) && dayKey(day) <= dayKey(addDays(startOfDay(date), 1));
  return dayKey(day) === dayKey(date);
}
