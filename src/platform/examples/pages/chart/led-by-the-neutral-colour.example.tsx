import { BarChart, ChartCard, DonutChart, GaugeChart, Grid, type ChartPoint } from "@zen-ds/react";
import { clientShares, formatCompactMoney, formatMoney, studioMonths, studioTeamHours } from "../../data";

/** "7,564 h" — hours read in full. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** Invoiced per month in 2026: Jan – Sep from the shared months, Oct – Dec the finance team's forecast (hatched). */
const forecast = [["Oct", 108000], ["Nov", 112500], ["Dec", 104000]] as const;
const revenue2026: ChartPoint[] = [
  ...studioMonths.slice(-9).map((m) => ({ label: m.label, value: m.invoiced })),
  ...forecast.map(([label, value]) => ({ label, value, projected: true })),
];
const invoicedSoFar = studioMonths.slice(-9).reduce((total, m) => total + m.invoiced, 0);

/** September: the teams' 5,900 billable hours of 7,564 logged, against the 85% target. */
const septemberTeams = studioTeamHours[studioTeamHours.length - 1];
const billableSeptember = septemberTeams.design + septemberTeams.engineering + septemberTeams.delivery + septemberTeams.clientServices;
const loggedSeptember = 7564;

/** Three cards led by Chart/Sector/Secondary (Neutral Deep in Zen's theme), the brand colour kept for what stands out:
 *  the active bar, the gauge's target, the second client's share (Figma Color=Secondary ↔ palette="secondary"). */
export default function NeutralLed() {
  return (
    <Grid minColumnWidth="clamp(300px, 30%, 100%)" gap="md">
      <ChartCard title="Revenue" metricLabel="Invoiced so far in 2026" value={formatMoney(invoicedSoFar)}>
        <BarChart palette="secondary" aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" data={revenue2026} format={formatCompactMoney} height={240} />
      </ChartCard>
      <ChartCard title="Utilisation" metricLabel="Billable share of logged hours, September"
        value={`${billableSeptember.toLocaleString("en-US")} of ${hours(loggedSeptember)}`}>
        <GaugeChart palette="secondary" aria-label="Billable share of logged hours against the 85% target, September 2026" value={billableSeptember} max={loggedSeptember}
          target={loggedSeptember * 0.85} actualLabel="Billable" />
      </ChartCard>
      <ChartCard title="Revenue by client" metricLabel="Q3 2026" value={formatMoney(clientShares.reduce((sum, c) => sum + c.value, 0))}>
        <DonutChart palette="secondary" aria-label="Revenue by client, Q3 2026" data={clientShares} format={formatCompactMoney} />
      </ChartCard>
    </Grid>
  );
}
