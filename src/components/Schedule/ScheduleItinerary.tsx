import { useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { useCalendarDevice, type CalendarDevice } from "../Calendar";
import { formatTime, MINUTE, toDate, toDateOr, type CalendarDateInput } from "../Calendar/calendarDates";
import { useMergedRefs } from "../_shared/merge-refs";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { ScheduleItineraryItem } from "./Schedule";
import { minutesBetween, stopStatus, type ScheduleStopData } from "./scheduleData";
import "./schedule.css";

export interface ScheduleItineraryProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** The stops, in order. */
  stops: readonly ScheduleStopData[];
  /** Figma Kicker: the day and the plan's name ("Wed, Sep 30 · Design Day"). */
  title?: ReactNode;
  /** The current time: stops that ended are Past, the running one Now, the rest Upcoming. Default: the device clock. */
  now?: CalendarDateInput;
  /** Figma Device: `desktop` (640) or `mobile` (358); the stops are the same. Default: from the breakpoint. */
  device?: CalendarDevice;
  /** Figma instance overrides of the stops (`{ "Stop[keynote]": { connector: false } }`). Written by Zen Studio. */
  overrides?: NestedOverrides;
  /** Ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma `Schedule/Itinerary` (16135:13820): a day's programme — a Body/Small/Bold kicker (Neutral/Light) over
 * `.Primitives/Schedule/Itinerary-Item` stops, Gap/XSmall; stops that ended are Past (Accent rail) up to the one happening
 * Now; the last stop has no connector. An ordered list: the running stop carries `aria-current="step"`.
 * Not a calendar of unrelated events (CalendarAgenda) or a history of actions.
 */
export function ScheduleItinerary({ stops, title, now: nowProp, device: deviceProp, overrides, className, ref, ...rest }: ScheduleItineraryProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const nest = useNested(overrides);
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(rootRef, ref);
  const device = useCalendarDevice(deviceProp, rootRef);
  const titleId = useId();
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => { if (nowProp) return undefined; const timer = window.setInterval(() => setClock(new Date()), MINUTE); return () => window.clearInterval(timer); }, [nowProp]);
  const now = toDateOr(nowProp) ?? clock;
  const read = useMemo(() => stops.map((stop) => ({ stop, start: toDate(stop.start), end: toDate(stop.end) })), [stops]);
  return (
    <div {...rest} ref={mergedRef} className={["zen-schedule-itinerary", className].filter(Boolean).join(" ")} data-device={device}>
      {title ? <span id={titleId} className={["zen-schedule-itinerary__kicker", typographyStyles["Body/Small/Bold"]].join(" ")}>{title}</span> : null}
      <ol className="zen-schedule-itinerary__stops" aria-labelledby={title ? titleId : undefined}>
        {read.map(({ stop, start, end }, index) => (
          <li key={stop.id}>
            {nest("Stop", <ScheduleItineraryItem
              start={formatTime(start, locale)}
              duration={t.minutes(minutesBetween(start, end))}
              title={stop.title}
              meta={stop.meta}
              status={stopStatus(start, end, now)}
              connector={index < read.length - 1}
            />, stop.id)}
          </li>
        ))}
      </ol>
    </div>
  );
}
