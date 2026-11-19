import { useId, useState, type RefObject } from "react";
import { AppShell, Chip, Heading, List, ListItem, Metric, Stack, Text, TopNavigation } from "@zen-ds/react";
import { daysFromToday, formatDay, formatRange, projectById } from "../../data";

// Alex's logged days, newest first: September so far and all of August (Sep 2 is National Day, no work).
type DayLog = { date: Date; hours: number; projects: string[] };
const day = (offset: number, hours: number, ...projects: string[]): DayLog => ({ date: daysFromToday(offset), hours, projects });
const dayLogs: DayLog[] = [
  day(0, 2, "lumen-banking"), day(-1, 8.5, "lumen-banking", "zen-ds"), day(-2, 8, "lumen-banking", "saola-brand"),
  day(-5, 7.5, "zen-ds", "lumen-banking"), day(-6, 8, "lumen-banking"), day(-7, 9, "lumen-banking", "phin-loyalty"), day(-8, 8, "zen-ds"), day(-9, 7, "lumen-banking", "zen-ds"),
  day(-12, 8, "lumen-banking"), day(-13, 8.5, "lumen-banking", "saola-brand"), day(-14, 6, "zen-ds"), day(-15, 8, "lumen-banking", "zen-ds"), day(-16, 8, "lumen-banking"),
  day(-19, 7.5, "phin-loyalty", "zen-ds"), day(-20, 8, "lumen-banking"), day(-21, 8.5, "lumen-banking", "zen-ds"), day(-22, 8, "lumen-banking"), day(-23, 7, "zen-ds", "bookfair-site"),
  day(-26, 8, "bookfair-site", "lumen-banking"), day(-27, 6.5, "bookfair-site"), day(-29, 8, "bookfair-site", "zen-ds"),
  day(-30, 8, "lumen-banking", "zen-ds"),
  day(-33, 7.5, "lumen-banking"), day(-34, 8, "lumen-banking", "phin-loyalty"), day(-35, 8.5, "lumen-banking"), day(-36, 8, "zen-ds"), day(-37, 8, "lumen-banking", "zen-ds"),
  day(-40, 7, "lumen-banking"), day(-41, 8, "lumen-banking", "phin-loyalty"), day(-42, 8.5, "lumen-banking"), day(-43, 8, "lumen-banking", "zen-ds"), day(-44, 6, "lumen-banking"),
  day(-47, 8, "phin-loyalty", "zen-ds"), day(-48, 7.5, "phin-loyalty"), day(-49, 8, "zen-ds"), day(-50, 8, "phin-loyalty", "bookfair-site"), day(-51, 8.5, "bookfair-site", "zen-ds"),
  day(-54, 7, "zen-ds"), day(-55, 8, "phin-loyalty"), day(-56, 8, "phin-loyalty", "zen-ds"), day(-57, 8.5, "bookfair-site"), day(-58, 8, "zen-ds", "phin-loyalty"),
];
type HoursPeriod = "this-week" | "last-week" | "this-month" | "last-month";
const hourPeriods: { id: HoursPeriod; label: string; from: Date; to: Date }[] = [
  { id: "this-week", label: "This week", from: daysFromToday(-2, 0, 0), to: daysFromToday(4, 23, 59) },
  { id: "last-week", label: "Last week", from: daysFromToday(-9, 0, 0), to: daysFromToday(-3, 23, 59) },
  { id: "this-month", label: "This month", from: daysFromToday(-29, 0, 0), to: daysFromToday(0, 23, 59) },
  { id: "last-month", label: "Last month", from: daysFromToday(-60, 0, 0), to: daysFromToday(-30, 23, 59) },
];
const hoursLabel = (hours: number) => `${hours.toFixed(1)} h`;
const dayTitle = (date: Date) => `${date.toLocaleDateString("en-US", { weekday: "long" })}, ${formatDay(date)}`;

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PeriodsOnAPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [periodId, setPeriodId] = useState<HoursPeriod>("this-month");
  const headingId = useId();
  const period = hourPeriods.find((item) => item.id === periodId)!;
  const days = dayLogs.filter((log) => log.date >= period.from && log.date <= period.to);
  const total = days.reduce((sum, log) => sum + log.hours, 0);
  return (
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Hours" largeTitle="Hours" />}>
      <Stack gap="lg">
        {/* Four periods don't fit a phone as equal segments: one row of single-choice chips that scrolls sideways.
            It runs to the screen's edges, past the page margin, so a chip cut at the edge shows there is more. */}
        <Stack direction="row" gap="xs" scroll="x" paddingY="2xs" role="group" aria-label="Period"
          style={{ marginInline: "calc(-1 * var(--zen-margin-comfortable, 20px))", paddingInline: "var(--zen-margin-comfortable, 20px)" }}>
          {hourPeriods.map((item) => (
            <Chip key={item.id} variant="normal" level="primary" selected={item.id === periodId} onClick={() => setPeriodId(item.id)}>
              {item.label}
            </Chip>
          ))}
        </Stack>
        <Stack gap="xs">
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{formatRange(period.from, period.to)}</Text>
          <Metric size="md" label="Logged hours" value={hoursLabel(total)} icon="icon-clock-line" iconTheme="blue" />
        </Stack>
        {/* Rows pad 0 at the sides: the screen margin lines them up with the section's kicker. */}
        <Stack as="section" gap="xs" aria-labelledby={headingId}>
          <Heading level={2} id={headingId} textStyle="Body/Small/Bold" tone="light">By day</Heading>
          <List aria-labelledby={headingId}>
            {days.map((log) => (
              <ListItem key={log.date.toISOString()} title={dayTitle(log.date)} caption={log.projects.map((id) => projectById(id).name).join(" · ")}
                trailing={<Text as="span" textStyle="Body/Base/Medium" wrap={false} tabularNumbers>{hoursLabel(log.hours)}</Text>} />
            ))}
          </List>
        </Stack>
      </Stack>
    </AppShell>
  );
}
