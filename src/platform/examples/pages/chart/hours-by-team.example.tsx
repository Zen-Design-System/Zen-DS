import { useState } from "react";
import { ChartCard, StackBarChart, type ChartStack } from "@zen-ds/react";
import { studioTeamHours } from "../../data";

/** "1,540 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

const teams = [
  { id: "design", label: "Design" },
  { id: "engineering", label: "Engineering" },
  { id: "delivery", label: "Delivery" },
  { id: "client-services", label: "Client Services" },
];

/** Billable hours per month and team, Apr – Sep 2026, from the shared series: each column adds up to the studio's month
 *  on the Metric page (Jul 6,490 · Aug 5,670 · Sep 5,900 h, Q3 18,060 h). */
const teamHours: ChartStack[] = studioTeamHours.map((month) => ({
  label: month.label,
  values: { design: month.design, engineering: month.engineering, delivery: month.delivery, "client-services": month.clientServices },
}));

const hourRanges = [{ id: "3m", label: "3 months" }, { id: "6m", label: "6 months" }];

/** How each month's billable hours split across the four teams; the range switch fills the card. */
export default function HoursByTeam() {
  const [rangeId, setRangeId] = useState("3m");
  const data = rangeId === "3m" ? teamHours.slice(-3) : teamHours;
  return (
    <ChartCard title="Billable hours" ranges={hourRanges} range={rangeId} onRangeChange={setRangeId}>
      <StackBarChart key={rangeId} aria-label={`Billable hours per month by team, ${rangeId === "3m" ? "Jul – Sep 2026" : "Apr – Sep 2026"}`}
        data={data} series={teams} format={hours} />
    </ChartCard>
  );
}
