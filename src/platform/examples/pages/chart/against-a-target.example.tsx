import { BarChart, ChartCard } from "@zen-ds/react";
import { teamCapacity } from "../../data";

/** "1,540 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** Horizontal bars for long category names; each team's capacity is a hatched track behind its bar. */
export default function Capacity() {
  return (
    <ChartCard title="Hours against capacity" metricLabel="Billable hours in September" value={hours(teamCapacity.reduce((total, team) => total + team.value, 0))}>
      <BarChart orientation="horizontal" aria-label="Billable hours per team against capacity, September 2026" data={teamCapacity} format={hours} showAverage />
    </ChartCard>
  );
}
