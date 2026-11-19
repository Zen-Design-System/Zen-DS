import { AreaChart, ChartCard, type ChartDatum } from "@zen-ds/react";
import { studioTeamHours } from "../../data";

/** "5,900 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** The studio's billable hours per month, Apr – Sep 2026: the four teams added up (Jul 6,490 · Aug 5,670 · Sep 5,900 h). */
const studioHours: ChartDatum[] = studioTeamHours.map((month) => ({ label: month.label, values: { hours: month.design + month.engineering + month.delivery + month.clientServices } }));
const studioHoursTotal = studioHours.reduce((sum, month) => sum + month.values.hours, 0);

/** One measure over time as a straight line over its fading area; with one series the card title names it (no legend). */
export default function HoursArea() {
  return (
    <ChartCard title="Billable hours" metricLabel="Logged per month, Apr – Sep 2026" value={hours(studioHoursTotal)}>
      <AreaChart aria-label="Billable hours per month, Apr – Sep 2026" data={studioHours} series={[{ id: "hours", label: "Billable hours" }]} format={hours} height={240} />
    </ChartCard>
  );
}
