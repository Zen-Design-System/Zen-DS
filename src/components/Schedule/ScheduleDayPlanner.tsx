import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { IconButton } from "../Button";
import { CalendarWeekStrip, useCalendarDevice, type CalendarDevice } from "../Calendar";
import { calendarTitle, dayKey, formatTimeRange, MINUTE, startOfDay, toDate, toDateOr, type CalendarDateInput } from "../Calendar/calendarDates";
import { Divider } from "../Divider";
import "../Icon/core";
import { useControllableState } from "../_shared/use-controllable-state";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { ScheduleEventCard, ScheduleHourLabel } from "./Schedule";
import type { ScheduleCardData } from "./scheduleData";
import "./schedule.css";

export interface ScheduleDayPlannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "defaultValue" | "onChange"> {
  /** The cards (any days); the planner shows the selected day's. */
  events?: ScheduleCardData[];
  /** The selected day (controlled). */
  value?: CalendarDateInput | null;
  /** The selected day at first (uncontrolled). Default: today. */
  defaultValue?: CalendarDateInput | null;
  /** Called with the day picked on the week strip. */
  onValueChange?: (day: Date) => void;
  /** Figma Title: the month ("September 2026"). Default: the selected day's month. */
  title?: ReactNode;
  /** Heading level of the title (default 2). */
  titleLevel?: 2 | 3 | 4;
  /** The month selector beside the title (Button/Icon-Main Small Tertiary): open your month picker. Without it the
   * button is left out. */
  onMonthClick?: () => void;
  /** A card's ⋮: open its actions, anchored to `target`. Without it the cards have no menu. */
  onCardMenu?: (card: ScheduleCardData, target: HTMLElement) => void;
  /** First hour on the rail (default 9). */
  startHour?: number;
  /** Last hour on the rail (default 18). */
  endHour?: number;
  /** The current time: the current hour's label is Now (on today). Default: the device clock. */
  now?: CalendarDateInput;
  /** The day treated as today. Default: `now`'s day. */
  today?: CalendarDateInput;
  /** Figma Device: `desktop` (420, a side panel) or `mobile` (a phone screen). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Figma instance overrides of the cards, week strip and month button (`{ "Card[explore]": { color: "teal" } }`).
   * Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const HOUR = 64;
const CARD_GAP = 8;

/**
 * Figma `Schedule/Day-Planner` (16143:1439): a person's day — the month as a Heading/3 title with a selector
 * (Button/Icon-Main Small Tertiary, Gap/XSmall), a Calendar/Week-Strip Style=Tile, a Divider, then an hour rail of
 * `.Primitives/Schedule/Hour-Label` (the current hour Now) beside `.Primitives/Schedule/Event-Card` cards at their start
 * time, Gap/Medium between the parts and Gap/Small between rail and cards. A card's top is (start − first hour) × the hour
 * height and its height the longer of length × hour height − 8 and its content; the hour height (64) grows so cards
 * never overlap. Cards and the selected day are Border boxes, so the planner reads on any canvas.
 */
export function ScheduleDayPlanner({ events = [], value, defaultValue, onValueChange, title, titleLevel = 2, onMonthClick, onCardMenu, startHour = 9, endHour = 18, now: nowProp, today: todayProp, device: deviceProp, overrides, className, style, ref, ...rest }: ScheduleDayPlannerProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => { if (nowProp) return undefined; const timer = window.setInterval(() => setClock(new Date()), MINUTE); return () => window.clearInterval(timer); }, [nowProp]);
  const now = toDateOr(nowProp) ?? clock;
  const today = toDateOr(todayProp) ?? now;
  const [selected, setSelected] = useControllableState<Date | null>({ value: toDateOr(value), defaultValue: defaultValue === undefined ? startOfDay(today) : toDateOr(defaultValue), name: "ScheduleDayPlanner value" });
  const day = startOfDay(selected ?? today);
  const hours = Array.from({ length: Math.max(1, endHour - startHour + 1) }, (_, index) => startHour + index);
  const cards = useMemo(() => events.map((card) => ({ card, start: toDate(card.start), end: toDate(card.end) }))
    .filter((item) => dayKey(item.start) === dayKey(day)).sort((a, b) => a.start.getTime() - b.start.getTime()), [events, day.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const hoursFrom = (date: Date) => (date.getTime() - day.getTime()) / 3_600_000 - startHour;
  // The hour height that keeps every card clear of the next one (measured without its minimum height).
  const [hour, setHour] = useState(HOUR);
  useLayoutEffect(() => {
    const node = cardsRef.current;
    if (!node) return undefined;
    const measure = () => {
      const elements = [...node.querySelectorAll<HTMLElement>(".zen-schedule-planner__card")];
      const heights = elements.map((element) => { const min = element.style.minHeight; element.style.minHeight = "0"; const height = element.offsetHeight; element.style.minHeight = min; return height; });
      let next = HOUR;
      for (let index = 0; index + 1 < cards.length; index++) {
        const gap = hoursFrom(cards[index + 1].start) - hoursFrom(cards[index].start);
        if (gap > 0) next = Math.max(next, Math.ceil((heights[index] + CARD_GAP) / gap));
      }
      setHour((previous) => (previous === next ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps
  const Heading = `h${titleLevel}` as const;
  const nowHour = dayKey(day) === dayKey(today) ? now.getHours() : -1;
  return (
    <div {...rest} ref={mergedRef} className={["zen-schedule-planner", className].filter(Boolean).join(" ")} data-device={device} style={{ "--zen-schedule-hour": `${hour}px`, ...style } as CSSProperties}>
      <div className="zen-schedule-planner__header">
        <Heading className={["zen-schedule-planner__title", typographyStyles["Heading/3"]].join(" ")} aria-live="polite">{title ?? calendarTitle(day, "month", locale)}</Heading>
        {onMonthClick ? nest("Month", <IconButton appearance="main" level="tertiary" size="sm" icon="icon-chevron-selector-vertical-line" aria-label={t.chooseMonth} onClick={onMonthClick} />) : null}
      </div>
      {nest("Week", <CalendarWeekStrip variant="tile" device={device} value={day} today={today} onValueChange={(next) => { setSelected(next); onValueChange?.(next); }} aria-label={t.chooseDate} />)}
      <Divider />
      <div className="zen-schedule-planner__day">
        <div className="zen-schedule-planner__rail" aria-hidden="true">
          {hours.map((value) => <span key={value} className="zen-schedule-planner__hour"><ScheduleHourLabel hour={`${String(value).padStart(2, "0")}:00`} now={value === nowHour} /></span>)}
        </div>
        <div ref={cardsRef} className="zen-schedule-planner__cards" role="list" aria-label={new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(day)}>
          {cards.map(({ card, start, end }) => (
            <div key={card.id} role="listitem" className="zen-schedule-planner__card" style={{ "--zen-schedule-top": hoursFrom(start), "--zen-schedule-length": (end.getTime() - start.getTime()) / 3_600_000 } as CSSProperties}>
              {nest("Card", <ScheduleEventCard
                title={card.title}
                status={card.status}
                time={formatTimeRange(start, end, locale)}
                color={card.color}
                attendees={card.attendees}
                note={card.note}
                onMenuClick={onCardMenu ? (click) => onCardMenu(card, click.currentTarget) : undefined}
              />, card.id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
