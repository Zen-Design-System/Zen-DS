import { Grid, MetricCard } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

const usd = (value: number) => formatMoney(value);
const monthOf = (id: string) => studioMonths.find((m) => m.id === id)!;
/** "9%": the change from one total to the next, in whole percent; the trend's arrow carries its sign (Figma Metric-Trend). */
const changeOf = (now: number, before: number) => `${Math.abs(Math.round((now / before - 1) * 100))}%`;
const hoursLabel = (value: number) => `${value.toLocaleString("en-US")} h`;
/** The last twelve months the studio invoiced, oldest first (the sparkline's series). */
const invoicedSeries = studioMonths.map((m) => m.invoiced);
/** Billable hours logged per week, the last twelve weeks (Jul 13 – Sep 28, the current week last): the studio's offsite
 *  week (Aug 3) and the National Day holiday week (Aug 31) run low, so the bars vary as real weeks do. */
const weeklyHours = [1012, 1086, 1048, 760, 1131, 1176, 1104, 640, 1153, 1067, 1132, 1284];
const collectedIn = (...ids: string[]) => ids.reduce((total, id) => total + monthOf(id).collected, 0);
const q3Collected = collectedIn("jul", "aug", "sep");
const q2Collected = collectedIn("apr", "may", "jun");

/** Three typed MetricCards in one row: a sparkline, spark bars and a goal. */
export default function MetricTypesRow() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 260px), 1fr))" gap="md">
      <MetricCard theme="default" type="sparkline" label="Revenue" value={usd(monthOf("sep").invoiced)} series={invoicedSeries} format={formatCompactMoney}
        trend={{ direction: "positive", label: changeOf(monthOf("sep").invoiced, monthOf("aug").invoiced), subLabel: "vs. August" }} />
      <MetricCard theme="default" type="spark-bars" label="Hours logged" value={hoursLabel(weeklyHours[weeklyHours.length - 1])} series={weeklyHours} format={hoursLabel}
        trend={{ direction: "positive", label: changeOf(weeklyHours[11], weeklyHours[10]), subLabel: "vs. last week" }} />
      <MetricCard theme="default" type="goal-progress" label="Collected in Q3" value={usd(q3Collected)} format={usd}
        goal={{ value: q3Collected, target: 290000 }} trend={{ direction: "positive", label: changeOf(q3Collected, q2Collected), subLabel: "vs. Q2" }} />
    </Grid>
  );
}
