import { useId, useState } from "react";
import { Chip, Grid, MetricCard, Stack, VisuallyHidden } from "@zen-ds/react";
import { formatCompactMoney, studioMonths, studioTeamHours } from "../../data";

const hoursOf = (month: (typeof studioTeamHours)[number]) => month.design + month.engineering + month.delivery + month.clientServices;
/** A change that rounds to 0% is no trend: the neutral badge with no arrow, never a green "+0%". */
const trendOf = (now: number, before: number, versus: string) => {
  const pct = Math.round(((now - before) / before) * 100);
  // Figma Metric-Trend: the change in the badge (the arrow carries its sign), what it is measured against beside it.
  if (pct === 0) return { direction: "normal" as const, label: "0%", subLabel: `vs ${versus}` };
  return { direction: pct > 0 ? "positive" as const : "negative" as const, label: `${Math.abs(pct)}%`, subLabel: `vs ${versus}` };
};
/** The months with billable hours and a month before them to compare with (Apr – Sep 2026), newest first. */
const glanceMonths = studioTeamHours.slice(1).map((hours, index) => {
  const month = studioMonths.find((item) => item.label === hours.label)!;
  const before = studioMonths.find((item) => item.label === studioTeamHours[index].label)!;
  return { id: month.id, label: `${month.label} 2026`, name: month.month, month, before, hours: hoursOf(hours), hoursBefore: hoursOf(studioTeamHours[index]) };
}).reverse();
/** What was overdue at the end of each month: the amount and how many invoices. */
const overdueAt: Record<string, [number, number]> = { may: [4200, 1], jun: [3150, 1], jul: [6750, 1], aug: [9400, 2], sep: [12880, 1] };

export default function MonthAtAGlance() {
  const headingId = useId();
  const [monthId, setMonthId] = useState(glanceMonths[0].id);
  const at = glanceMonths.find((item) => item.id === monthId)!;
  const [overdue, overdueCount] = overdueAt[at.id];
  const trend = (now: number, before: number) => trendOf(now, before, at.before.label);
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      {/* Sighted people read the cards as one group under the month they picked; a screen-reader user jumping by
          headings lands on the group's name, which follows the month. */}
      <VisuallyHidden as="h4" id={headingId}>{`${at.name} at a glance`}</VisuallyHidden>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" dropdown popoverLabel="Month"
          popoverItems={glanceMonths.map((item) => ({ id: item.id, label: item.label, selected: item.id === monthId }))}
          onPopoverSelect={(item) => setMonthId(item.id)}>
          {at.label}
        </Chip>
      </Stack>
      <Grid minColumnWidth="220px" gap="md">
        <MetricCard iconBackground="solid" theme="default" label="Invoiced" value={formatCompactMoney(at.month.invoiced)} trend={trend(at.month.invoiced, at.before.invoiced)} icon="icon-receipt-line" iconTheme="blue" />
        <MetricCard iconBackground="solid" theme="default" label="Collected" value={formatCompactMoney(at.month.collected)} trend={trend(at.month.collected, at.before.collected)} icon="icon-currency-dollar-circle-line" iconTheme="green" />
        <MetricCard iconBackground="solid" theme="default" label="Billable hours" value={`${at.hours.toLocaleString("en-US")} h`} trend={trend(at.hours, at.hoursBefore)} icon="icon-clock-line" iconTheme="violet" />
        <MetricCard iconBackground="solid" theme="default" label="Overdue" value={formatCompactMoney(overdue)} trend={{ direction: "normal", label: String(overdueCount), subLabel: overdueCount === 1 ? "invoice" : "invoices" }} icon="icon-alarm-clock-line" iconTheme="red" />
      </Grid>
    </Stack>
  );
}
