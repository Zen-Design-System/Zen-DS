import { Grid, MetricCard, VisuallyHidden } from "@zen-ds/react";
import { formatMoney } from "../../data";

const usd = (value: number) => formatMoney(value);
/** "—" for a metric without data; screen readers hear "No data" instead of a dash. */
const noData = <><span aria-hidden="true">—</span><VisuallyHidden>No data</VisuallyHidden></>;
const hoursLabel = (value: number) => `${value.toLocaleString("en-US")} h`;

/** A new client's first weeks: no revenue yet, one week of hours, a goal already passed. */
export default function FirstWeeksMetrics() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">
      <MetricCard theme="default" type="sparkline" label="Revenue" value={noData} series={[]} trend={{ direction: "normal", label: "Oct 31", subLabel: "first invoice" }} />
      <MetricCard theme="default" type="spark-bars" label="Hours logged" value={hoursLabel(38)} series={[38]} trend={{ direction: "normal", label: "Week 1", subLabel: "of the project" }} />
      <MetricCard theme="default" type="goal-progress" label="Deposit collected" value={usd(5600)} format={usd} goal={{ value: 5600, target: 5000 }}
        trend={{ direction: "positive", label: "$600", subLabel: "over the deposit" }} />
    </Grid>
  );
}
