import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { CalendarEventBlock, CalendarNowLine, useCalendarDevice, type CalendarDevice } from "../Calendar";
import { dayKey, formatTimeRange, MINUTE, toDate, toDateOr, type CalendarDateInput } from "../Calendar/calendarDates";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { ScheduleResource } from "./Schedule";
import { columnsAt, scaleColumns, type ScheduleBookingData, type ScheduleResourceData } from "./scheduleData";
import "./schedule.css";

export interface ScheduleResourceGridProps extends HTMLAttributes<HTMLDivElement> {
  /** The rows: people and rooms, in order. */
  resources: readonly ScheduleResourceData[];
  /** The bookings, shifts and leave on them (by `resourceId`). */
  bookings?: readonly ScheduleBookingData[];
  /** Figma Scale: `hours` (one day, a column per hour) or `days` (one week, Monday first). Default hours. */
  scale?: "hours" | "days";
  /** The day shown (Hours) or any day of the week shown (Days). Default: today. */
  date?: CalendarDateInput;
  /** First hour of the Hours scale (default 9). */
  startHour?: number;
  /** Hour the Hours scale ends at (default 17: eight working hours). */
  endHour?: number;
  /** The current time: the vertical now line while it is inside the range. Default: the device clock. */
  now?: CalendarDateInput;
  /** The day treated as today (the Days scale writes it in Accent). Default: `now`'s day. */
  today?: CalendarDateInput;
  /** The header of the resource column (default the locale's "Team & rooms"; "Team" on a phone). */
  resourcesLabel?: ReactNode;
  /** Pressing a bar: open the booking, anchored to `target`. Without it the bars are static. */
  onBookingClick?: (booking: ScheduleBookingData, target: HTMLElement) => void;
  /** The booking whose details are open: its bar shows State=Selected. */
  selectedBookingId?: string | null;
  /** Figma Device: `desktop` (200px resource column, the whole scale visible) or `mobile` (64px column, four hours
   * visible: the track scrolls sideways and opens at the current hour). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Names the grid (default: "Team & rooms" and the period). */
  "aria-label"?: string;
  /** Figma instance overrides of the rows' Resource and the bars (`{ "Row[alex]/Resource": { device: "mobile" } }`).
   * Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const RESOURCE_WIDTH = { desktop: 200, mobile: 64 } as const;
const VISIBLE_HOURS = { desktop: 8, mobile: 4 } as const;
/** Below this width a bar hides its time (Figma: Show-Time off under 80px). */
const SHOW_TIME_MIN = 80;

/**
 * Figma `Schedule/Resource-Grid` (16135:145822): a resource timeline. A Border box (`Color/Background/Surface/Default`, 1px
 * `Color/Border/Neutral/Pale/Default`, Corner-Radius/Base, clipped): a 40px header (the resource column's label and the
 * scale, Caption/Medium Neutral/Base; today in Accent on the Days scale) over rows of `.Primitives/Schedule/Resource`
 * beside their track, one fixed height (56 desktop, 64 mobile), split by Pale rules that sit outside the layout. Bookings
 * are `.Primitives/Calendar/Event-Block` bars: x = start on the scale × column + 2, width = length × column − 4, 4px from
 * the row's top and bottom; a bar that runs past the range scrolls with the track and is never squeezed to its edge; under
 * 80px it hides its time. A vertical `.Primitives/Calendar/Now-Line` crosses the tracks at now.
 *
 * Semantics: a `role="table"` — the header row's column headers, then per resource a row header and one cell with the
 * bars (buttons with `onBookingClick`, named by title and time). On a phone the resource column stays while the scale
 * scrolls.
 */
export function ScheduleResourceGrid({ resources, bookings = [], scale = "hours", date, startHour = 9, endHour = 17, now: nowProp, today: todayProp, resourcesLabel, onBookingClick, selectedBookingId = null, device: deviceProp, "aria-label": ariaLabel, overrides, className, style, ref, ...rest }: ScheduleResourceGridProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const mobile = device === "mobile";
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => { if (nowProp) return undefined; const timer = window.setInterval(() => setClock(new Date()), MINUTE); return () => window.clearInterval(timer); }, [nowProp]);
  const now = toDateOr(nowProp) ?? clock;
  const today = toDateOr(todayProp) ?? now;
  const columns = useMemo(() => scaleColumns(date ?? today, scale, startHour, endHour), [date, today.getTime(), scale, startHour, endHour]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = columns[0].end.getTime() - columns[0].start.getTime();
  const from = columns[0].start;
  // Column width: the box split over the visible columns (all of a week, eight hours on desktop, four on a phone).
  const visible = scale === "days" ? columns.length : Math.min(columns.length, VISIBLE_HOURS[device]);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const resourceWidth = RESOURCE_WIDTH[device];
  const column = Math.max(48, ((width || resourceWidth + visible * 115) - resourceWidth) / visible);
  const nowAt = columnsAt(now, from, step);
  const nowInside = nowAt >= 0 && nowAt <= columns.length;
  // A phone opens at the current hour (Figma Mobile shows 13:00 first at 13:15).
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || !mobile || scale !== "hours" || !nowInside) return;
    node.scrollLeft = Math.max(0, Math.floor(nowAt) * column);
  }, [mobile, scale, column > 0 && width > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const read = useMemo(() => bookings.map((booking) => ({ booking, start: toDate(booking.start), end: toDate(booking.end) })), [bookings]);
  const dayLabel = (day: Date) => `${new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)} ${day.getDate()}`;
  const label = ariaLabel ?? `${mobile ? t.team : t.teamAndRooms}, ${scale === "days" ? `${dayLabel(columns[0].start)} – ${dayLabel(columns[columns.length - 1].start)}` : new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(from)}`;
  const vars = { "--zen-schedule-resource-width": `${resourceWidth}px`, "--zen-schedule-column": `${column}px`, "--zen-schedule-columns": columns.length } as CSSProperties;
  return (
    <div {...rest} ref={mergedRef} className={["zen-schedule-grid", className].filter(Boolean).join(" ")} data-device={device} data-scale={scale} style={{ ...vars, ...style }}>
      <span className="zen-schedule-grid__sizer" aria-hidden="true" />
      <div ref={scrollRef} className="zen-schedule-grid__scroll">
        <div className="zen-schedule-grid__table" role="table" aria-label={label} aria-colcount={columns.length + 1}>
          <div className="zen-schedule-grid__header" role="row">
            <span className={["zen-schedule-grid__corner", typographyStyles["Caption/Medium"]].join(" ")} role="columnheader">{resourcesLabel ?? (mobile ? t.team : t.teamAndRooms)}</span>
            {columns.map((col) => (
              <span key={col.start.toISOString()} role="columnheader" className={["zen-schedule-grid__scale", typographyStyles["Caption/Medium"]].join(" ")} data-today={scale === "days" && dayKey(col.start) === dayKey(today) ? true : undefined}>
                {scale === "days" ? dayLabel(col.start) : new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(col.start)}
              </span>
            ))}
          </div>
          <div className="zen-schedule-grid__body" role="rowgroup">
            {resources.map((resource) => (
              <div key={resource.id} className="zen-schedule-grid__row" role="row">
                <div className="zen-schedule-grid__resource" role="rowheader">
                  {nest("Resource", <ScheduleResource device={device} type={resource.type} name={mobile ? resource.shortName ?? resource.name.split(/\s+/)[0] : resource.name} meta={resource.meta} avatarSrc={resource.avatarSrc} aria-label={mobile ? resource.name : undefined} />, resource.id)}
                </div>
                <div className="zen-schedule-grid__track" role="cell" aria-colspan={columns.length}>
                  {columns.map((col) => <span key={col.start.toISOString()} className="zen-schedule-grid__cell" aria-hidden="true" />)}
                  {read.filter((item) => item.booking.resourceId === resource.id).map(({ booking, start, end }) => {
                    const left = columnsAt(start, from, step);
                    const right = columnsAt(end, from, step);
                    if (right <= 0 || left >= columns.length) return null;
                    const barWidth = (right - left) * column - 4;
                    const time = booking.time ?? (scale === "days"
                      ? [dayLabel(start).split(" ")[0], dayKey(new Date(end.getTime() - 1)) === dayKey(start) ? null : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(end.getTime() - 1))].filter(Boolean).join(" – ")
                      : formatTimeRange(start, end, locale));
                    return nest("Booking", (
                      <CalendarEventBlock
                        key={booking.id}
                        className="zen-schedule-grid__bar"
                        style={{ "--zen-schedule-from": left, "--zen-schedule-span": right - left } as CSSProperties}
                        title={booking.title}
                        time={time}
                        showTime={barWidth >= SHOW_TIME_MIN}
                        titleLines={1}
                        color={booking.color}
                        selected={booking.id === selectedBookingId}
                        aria-expanded={onBookingClick ? booking.id === selectedBookingId : undefined}
                        onClick={onBookingClick ? (click) => onBookingClick(booking, click.currentTarget) : undefined}
                      />
                    ), booking.id);
                  })}
                </div>
              </div>
            ))}
            {nowInside ? <CalendarNowLine orientation="vertical" className="zen-schedule-grid__now" style={{ "--zen-schedule-at": nowAt } as CSSProperties} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
