import { AreaChart, ChartCard, type ChartStack } from "@zen-ds/react";
import { studioTeamHours } from "../../data";

/** "5,900 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

const teams = [
  { id: "design", label: "Design" },
  { id: "engineering", label: "Engineering" },
  { id: "delivery", label: "Delivery" },
  { id: "client-services", label: "Client Services" },
];

/** Billable hours per month and team, Apr – Sep 2026 (Jul 6,490 · Aug 5,670 · Sep 5,900 h). */
const teamHours: ChartStack[] = studioTeamHours.map((month) => ({
  label: month.label,
  values: { design: month.design, engineering: month.engineering, delivery: month.delivery, "client-services": month.clientServices },
}));
const studioHoursTotal = studioTeamHours.reduce((sum, month) => sum + month.design + month.engineering + month.delivery + month.clientServices, 0);

/** type="stacked" piles the teams as bands, so the top line is the month's total. */
export default function HoursByTeamArea() {
  return (
    <ChartCard title="Billable hours by team" metricLabel="Logged per month, Apr – Sep 2026" value={hours(studioHoursTotal)}>
      <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" data={teamHours} series={teams} format={hours} height={240} />
    </ChartCard>
  );
}
