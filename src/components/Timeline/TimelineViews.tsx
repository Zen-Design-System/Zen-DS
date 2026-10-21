import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { CalendarNowLine, useCalendarDevice, type CalendarColor, type CalendarDevice } from "../Calendar";
import { addDays, dayKey, formatShortDate, formatTime, startOfDay, startOfWeek, toDate, toDateOr, type CalendarDateInput } from "../Calendar/calendarDates";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { TimelineGanttBar, TimelineGanttLabel, TimelineItem, TimelineMilestone, type TimelineMarkerData } from "./Timeline";
import "./timeline.css";

const DAY = 86_400_000;

/* ── Timeline/Activity (16131:1311) ──────────────────────────────────────────────────────────────────────────────── */

/** One entry of an activity feed. */
export interface TimelineEntryData {
  id: string;
  /** When it happened ("2026-09-30T10:42" or a Date). */
  at: CalendarDateInput;
  /** Who did it (bold). */
  actor?: string;
  /** What happened, after the actor ("approved your leave request"). */
  title: string;
  /** One line of detail. */
  description?: string;
  /** A comment (text) or your own attachment node. */
  attachment?: ReactNode;
  /** The marker: Avatar when a person acted, Icon when the system did, Dot in compact logs; Tone is status. */
  marker?: TimelineMarkerData;
}

export interface TimelineActivityProps extends HTMLAttributes<HTMLDivElement> {
  /** The entries (any order): shown newest first, grouped by day. */
  entries: TimelineEntryData[];
  /** The day treated as today ("Today", "Yesterday" kickers). Default: the device clock. */
  today?: CalendarDateInput;
  /** Item size: `md` (default) or `sm` (a compact log). */
  size?: "md" | "sm" | "medium" | "small";
  /** Figma Device: `desktop` (640) or `mobile` (358); the items are the same. Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Figma instance overrides of the items (`{ "Item[approve]/Marker": { tone: "positive" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `Timeline/Activity` (16131:1311): an activity feed — day kickers (Body/Small/Bold, Neutral/Light: "Today",
 * "Yesterday", then the date) over `Timeline/Item` rows, kicker → items Gap/XSmall, day → day Gap/Large; each day's last
 * item has no connector. Newest first. A list per day, named by its kicker.
 */
export function TimelineActivity({ entries, today: todayProp, size = "md", device: deviceProp, overrides, className, ref, ...rest }: TimelineActivityProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const today = toDateOr(todayProp) ?? new Date();
  const groups = useMemo(() => {
    const read = entries.map((entry) => ({ entry, at: toDate(entry.at) })).sort((a, b) => b.at.getTime() - a.at.getTime());
    const byDay = new Map<number, typeof read>();
    for (const item of read) { const key = dayKey(item.at); byDay.set(key, [...(byDay.get(key) ?? []), item]); }
    return [...byDay.entries()].map(([key, items]) => ({ day: new Date(key), items }));
  }, [entries]);
  const kicker = (day: Date) => dayKey(day) === dayKey(today) ? t.today : dayKey(day) === dayKey(addDays(today, -1)) ? t.yesterday : formatShortDate(day, locale);
  return (
    <div {...rest} ref={mergedRef} className={["zen-timeline-activity", className].filter(Boolean).join(" ")} data-device={device}>
      {groups.map(({ day, items }) => {
        const label = kicker(day);
        return (
          <section key={day.toISOString()} className="zen-timeline-activity__day" aria-label={label}>
            <span className={["zen-timeline-activity__kicker", typographyStyles["Body/Small/Bold"]].join(" ")} aria-hidden="true">{label}</span>
            <ul className="zen-timeline-activity__items" role="list">
              {items.map(({ entry, at }, index) => (
                <li key={entry.id}>
                  {nest("Item", <TimelineItem size={size} actor={entry.actor} title={entry.title} time={formatTime(at, locale)} description={entry.description} attachment={entry.attachment} marker={entry.marker} connector={index < items.length - 1} />, entry.id)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ── Timeline/Milestones (16132:777) ─────────────────────────────────────────────────────────────────────────────── */

export interface TimelineMilestoneData {
  id: string;
  date: CalendarDateInput;
  title: string;
  /** Shown on the Current milestone. */
  description?: string;
}

export interface TimelineMilestonesProps extends HTMLAttributes<HTMLOListElement> {
  /** The milestones, in date order. */
  milestones: TimelineMilestoneData[];
  /** The day treated as today: milestones before it are Done, the first on or after it is Current, the rest Upcoming.
   * Default: the device clock. */
  today?: CalendarDateInput;
  /** The Current milestone by id, when it is not the date's (a late phase). */
  currentId?: string;
  /** Figma Device: `desktop` (a row; items share the width) or `mobile` (a column). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Ref to the root `<ol>`. */
  ref?: Ref<HTMLOListElement>;
}

/**
 * Figma `Timeline/Milestones` (16132:777): a row (desktop, Horizontal) or a column (phone, Vertical) of
 * `.Primitives/Timeline/Milestone` — Done ones in Accent, exactly one Current (with its description), the rest Upcoming;
 * the last one has no connector. An ordered list; the Current milestone carries `aria-current="step"`.
 */
export function TimelineMilestones({ milestones, today: todayProp, currentId, device: deviceProp, className, ref, ...rest }: TimelineMilestonesProps) {
  const locale = useZenLocale();
  const rootRef = useRef<HTMLOListElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef as never);
  const today = startOfDay(toDateOr(todayProp) ?? new Date());
  const read = milestones.map((milestone) => ({ milestone, date: toDate(milestone.date) }));
  const current = currentId ?? read.find((item) => dayKey(item.date) >= dayKey(today))?.milestone.id;
  const currentIndex = read.findIndex((item) => item.milestone.id === current);
  return (
    <ol {...rest} ref={mergedRef} className={["zen-timeline-milestones", className].filter(Boolean).join(" ")} data-device={device}>
      {read.map(({ milestone, date }, index) => {
        const status = index === currentIndex ? "current" : currentIndex < 0 || index < currentIndex ? "done" : "upcoming";
        return (
          <li key={milestone.id}>
            <TimelineMilestone orientation={device === "mobile" ? "vertical" : "horizontal"} status={status} date={new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date)}
              title={milestone.title} description={status === "current" ? milestone.description : undefined} connector={index < read.length - 1} />
          </li>
        );
      })}
    </ol>
  );
}

/* ── Timeline/Gantt (16136:859) ──────────────────────────────────────────────────────────────────────────────────── */

export interface TimelineTaskData {
  id: string;
  name: string;
  start: CalendarDateInput;
  /** End (exclusive). A milestone needs none: it sits on its start day. */
  end?: CalendarDateInput;
  /** `task` (default) or `milestone` (a diamond on its date). */
  kind?: "task" | "milestone";
  /** The workstream's colour (default brand). */
  color?: CalendarColor;
  /** The assignee (an Avatar XSmall in the task column). */
  assignee?: { src?: string; alt?: string };
}

export interface TimelineGroupData {
  id: string;
  name: string;
  tasks: TimelineTaskData[];
}

export interface TimelineGanttProps extends HTMLAttributes<HTMLDivElement> {
  /** The plan: groups of tasks. A group's summary bar spans its tasks. */
  groups: TimelineGroupData[];
  /** First day of the scale (rounded to its Monday). Default: the Monday of the earliest task. */
  start?: CalendarDateInput;
  /** How many weeks the scale shows (default 9). */
  weeks?: number;
  /** The day treated as today: the vertical now line. Default: the device clock. */
  today?: CalendarDateInput;
  /** Pressing a task or milestone bar: open it, anchored to `target`. Without it the bars are static. */
  onTaskClick?: (task: TimelineTaskData, target: HTMLElement) => void;
  /** Groups collapsed at first (by id). */
  defaultCollapsed?: string[];
  /** Figma Device: `desktop` (240px task column, the whole scale) or `mobile` (128px column, three weeks visible; the
   * track scrolls and opens at today, else the plan's start). Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Names the plan (default the locale's "Tasks"). */
  "aria-label"?: string;
  /** Figma instance overrides of the labels and bars (`{ "Bar[ui]": { color: "teal" } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const TASK_COLUMN = { desktop: 240, mobile: 128 } as const;
const VISIBLE_WEEKS = { desktop: 9, mobile: 3 } as const;

/**
 * Figma `Timeline/Gantt` (16136:859): a Border box (`Color/Background/Surface/Default`, 1px Pale, Corner-Radius/Base,
 * clipped) — a 40px header ("Tasks" and the week starts, Caption/Medium Neutral/Base) over a task column of
 * `.Primitives/Timeline/Gantt-Label` rows (240, 128 on a phone) beside a track of 44px rows with week columns, Pale rules
 * outside the layout. `.Primitives/Timeline/Gantt-Bar` bars sit by date — x = days from the first column × day width + 2,
 * width = days × day width − 4, centred in the row — and keep their real dates past the edge (the track scrolls; never
 * squeezed). A group's Summary spans its tasks; the vertical `.Primitives/Calendar/Now-Line` marks today. On a phone,
 * milestone titles live in the task column only.
 *
 * Semantics: a `role="table"` — the week headers, then per row a row header (the label; a group's is a disclosure that
 * hides its tasks) and one cell with its bar (a button with `onTaskClick`).
 */
export function TimelineGantt({ groups, start: startProp, weeks = 9, today: todayProp, onTaskClick, defaultCollapsed = [], device: deviceProp, "aria-label": ariaLabel, overrides, className, style, ref, ...rest }: TimelineGanttProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const mobile = device === "mobile";
  const today = startOfDay(toDateOr(todayProp) ?? new Date());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(defaultCollapsed));
  const read = useMemo(() => groups.map((group) => {
    const tasks = group.tasks.map((task) => {
      const from = startOfDay(toDate(task.start));
      const to = task.kind === "milestone" ? addDays(from, 1) : task.end ? toDate(task.end) : addDays(from, 1);
      return { task, from, to };
    });
    const from = tasks.length ? new Date(Math.min(...tasks.map((item) => item.from.getTime()))) : today;
    const to = tasks.length ? new Date(Math.max(...tasks.map((item) => item.to.getTime()))) : today;
    return { group, tasks, from, to };
  }), [groups, today.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const earliest = read.length ? new Date(Math.min(...read.map((item) => item.from.getTime()))) : today;
  const scaleStart = startOfWeek(toDateOr(startProp) ?? earliest);
  const weekStarts = Array.from({ length: Math.max(1, weeks) }, (_, index) => addDays(scaleStart, index * 7));
  const visible = Math.min(weekStarts.length, VISIBLE_WEEKS[device]);
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
  const taskColumn = TASK_COLUMN[device];
  const week = Math.max(56, ((width || taskColumn + visible * 98) - taskColumn) / visible);
  const days = (date: Date) => (startOfDay(date).getTime() - scaleStart.getTime()) / DAY;
  const todayAt = days(today);
  const todayInside = todayAt >= 0 && todayAt <= weekStarts.length * 7;
  // A phone opens at today's week (else the plan's start, the scale's first column).
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || !mobile || !todayInside || !width) return;
    node.scrollLeft = Math.max(0, Math.floor(todayAt / 7) * week);
  }, [mobile, week]); // eslint-disable-line react-hooks/exhaustive-deps
  const bar = (key: string, from: Date, to: Date, element: (style: CSSProperties) => ReactNode) => {
    const left = days(from);
    const span = Math.max(0, (to.getTime() - from.getTime()) / DAY);
    return element({ "--zen-timeline-from": left, "--zen-timeline-span": span } as CSSProperties);
  };
  const rows: ReactNode[] = [];
  for (const { group, tasks, from, to } of read) {
    const open = !collapsed.has(group.id);
    rows.push(
      <div key={group.id} className="zen-timeline-gantt__row" role="row">
        <div className="zen-timeline-gantt__label" role="rowheader">
          {nest("Label", <TimelineGanttLabel level="group" name={group.name} expanded={open} onToggle={() => setCollapsed((previous) => { const next = new Set(previous); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })} />, group.id)}
        </div>
        <div className="zen-timeline-gantt__track" role="cell">
          {weekStarts.map((weekStart) => <span key={weekStart.toISOString()} className="zen-timeline-gantt__cell" aria-hidden="true" />)}
          {bar(group.id, from, to, (style) => nest("Bar", <TimelineGanttBar className="zen-timeline-gantt__bar" style={style} kind="summary" title={group.name} aria-hidden="true" />, group.id))}
        </div>
      </div>,
    );
    if (!open) continue;
    for (const { task, from: taskFrom, to: taskTo } of tasks) {
      const milestone = task.kind === "milestone";
      const name = `${task.name}, ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(taskFrom)}${milestone ? "" : ` – ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(addDays(taskTo, -1))}`}`;
      rows.push(
        <div key={task.id} className="zen-timeline-gantt__row" role="row">
          <div className="zen-timeline-gantt__label" role="rowheader">{nest("Label", <TimelineGanttLabel level="task" name={task.name} assignee={task.assignee} />, task.id)}</div>
          <div className="zen-timeline-gantt__track" role="cell">
            {weekStarts.map((weekStart) => <span key={weekStart.toISOString()} className="zen-timeline-gantt__cell" aria-hidden="true" />)}
            {bar(task.id, taskFrom, taskTo, (barStyle) => nest("Bar", (
              <TimelineGanttBar className="zen-timeline-gantt__bar" style={barStyle} kind={milestone ? "milestone" : "task"} color={task.color} title={task.name} hideTitle={milestone && mobile}
                aria-label={name} onClick={onTaskClick ? (click) => onTaskClick(task, click.currentTarget) : undefined} />
            ), task.id))}
          </div>
        </div>,
      );
    }
  }
  const vars = { "--zen-timeline-task-column": `${taskColumn}px`, "--zen-timeline-week": `${week}px`, "--zen-timeline-weeks": weekStarts.length } as CSSProperties;
  return (
    <div {...rest} ref={mergedRef} className={["zen-timeline-gantt", className].filter(Boolean).join(" ")} data-device={device} style={{ ...vars, ...style }}>
      <span className="zen-timeline-gantt__sizer" aria-hidden="true" />
      <div ref={scrollRef} className="zen-timeline-gantt__scroll">
        <div className="zen-timeline-gantt__table" role="table" aria-label={ariaLabel ?? t.tasks}>
          <div className="zen-timeline-gantt__header" role="row">
            <span className={["zen-timeline-gantt__corner", typographyStyles["Caption/Medium"]].join(" ")} role="columnheader">{t.tasks}</span>
            {weekStarts.map((weekStart) => <span key={weekStart.toISOString()} role="columnheader" className={["zen-timeline-gantt__scale", typographyStyles["Caption/Medium"]].join(" ")}>{new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(weekStart)}</span>)}
          </div>
          <div className="zen-timeline-gantt__body" role="rowgroup">
            {rows}
            {todayInside ? <CalendarNowLine orientation="vertical" className="zen-timeline-gantt__now" style={{ "--zen-timeline-at": todayAt } as CSSProperties} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
