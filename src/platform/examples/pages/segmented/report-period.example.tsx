import { useId, useState } from "react";
import { Grid, Heading, MetricCard, Segmented, Stack, Text, type MetricTrendDirection } from "@zen-ds/react";
import { formatMoney, studioMonths, studioTeamHours } from "../../data";

type PeriodId = "month" | "quarter" | "year";
type Kpi = { value: string; trend: { direction: MetricTrendDirection; label: string; subLabel?: string } };
// The studio's shared months (the Metric and Chart pages show the same figures): invoiced Oct 2025 – Sep 2026 and
// billable hours per team, Apr – Sep 2026.
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const invoicedIn = (...ids: string[]) => sum(studioMonths.filter((month) => ids.includes(month.id)).map((month) => month.invoiced));
const hoursIn = (...labels: string[]) => sum(studioTeamHours.filter((month) => labels.includes(month.label)).map((month) => month.design + month.engineering + month.delivery + month.clientServices));
/** "9%" + "vs. August": the change rounded to whole percent in the badge (its arrow carries the sign), what it is
 *  measured against beside it (Figma Metric-Trend). */
const change = (now: number, before: number, against: string): Kpi["trend"] => {
  const percent = Math.round((now / before - 1) * 100);
  return { direction: percent >= 0 ? "positive" : "negative", label: `${Math.abs(percent)}%`, subLabel: `vs. ${against}` };
};
const hoursValue = (hours: number) => `${hours.toLocaleString("en-US")} h`;
const ytdInvoiced = invoicedIn("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep");
const overview: Record<PeriodId, { range: string; hours: Kpi; utilisation: Kpi; invoiced: Kpi }> = {
  month: {
    range: "Sep 1 – Sep 30, 2026",
    hours: { value: hoursValue(hoursIn("Sep")), trend: change(hoursIn("Sep"), hoursIn("Aug"), "August") },
    utilisation: { value: "78%", trend: { direction: "negative", label: "2 pts", subLabel: "vs. August" } },
    invoiced: { value: formatMoney(invoicedIn("sep")), trend: change(invoicedIn("sep"), invoicedIn("aug"), "August") },
  },
  quarter: {
    range: "Jul 1 – Sep 30, 2026",
    hours: { value: hoursValue(hoursIn("Jul", "Aug", "Sep")), trend: change(hoursIn("Jul", "Aug", "Sep"), hoursIn("Apr", "May", "Jun"), "Q2") },
    utilisation: { value: "80%", trend: { direction: "positive", label: "1 pt", subLabel: "vs. Q2" } },
    invoiced: { value: formatMoney(invoicedIn("jul", "aug", "sep")), trend: change(invoicedIn("jul", "aug", "sep"), invoicedIn("apr", "may", "jun"), "Q2") },
  },
  // The months before April are not in the shared hours series; the year matches the Metric page.
  year: {
    range: "Jan 1 – Sep 30, 2026",
    hours: { value: "50,040 h", trend: { direction: "positive", label: "5%", subLabel: "vs. 2025" } },
    utilisation: { value: "77%", trend: { direction: "positive", label: "3 pts", subLabel: "vs. 2025" } },
    invoiced: { value: formatMoney(ytdInvoiced), trend: { direction: "positive", label: "12%", subLabel: "vs. 2025" } },
  },
};

export default function ReportPeriod() {
  const [period, setPeriod] = useState<PeriodId>("month");
  const headingId = useId();
  const data = overview[period];
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">Studio overview</Heading>
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{`All projects · ${data.range}`}</Text>
        </Stack>
        {/* One switch drives the whole strip; on a wide page it hugs its labels. */}
        <Segmented aria-label="Report period" value={period} onValueChange={(id) => setPeriod(id as PeriodId)} options={[
          { id: "month", label: "Month" },
          { id: "quarter", label: "Quarter" },
          { id: "year", label: "Year" },
        ]} />
      </Stack>
      <Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
        {/* Flat Surfaces on the stage's Canvas/Default: no border, no shadow (usage rules §16). */}
        <MetricCard theme="default" label="Billable hours" value={data.hours.value} trend={data.hours.trend} icon="icon-clock-line" iconTheme="blue" />
        <MetricCard theme="default" label="Utilisation" value={data.utilisation.value} trend={data.utilisation.trend} icon="icon-pie-chart-01-line" iconTheme="violet" />
        <MetricCard theme="default" label="Invoiced" value={data.invoiced.value} trend={data.invoiced.trend} icon="icon-currency-dollar-circle-line" iconTheme="green" />
      </Grid>
    </Stack>
  );
}
