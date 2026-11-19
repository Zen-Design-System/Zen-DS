import { ChartCard, GaugeChart } from "@zen-ds/react";
import { studioTeamHours } from "../../data";

/** "7,564 h" — hours read in full. */
// A no-break space keeps the unit with its number when a figure wraps ("5,900 of 7,564 h" on a phone).
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** September: the teams' 5,900 billable hours of 7,564 logged (78%, the utilisation line's September) against 85%. */
const septemberTeams = studioTeamHours[studioTeamHours.length - 1];
const billableSeptember = septemberTeams.design + septemberTeams.engineering + septemberTeams.delivery + septemberTeams.clientServices;
const loggedSeptember = 7564;

/** One measure against its maximum as a half ring, the target as a tick across it. */
export default function UtilisationGauge() {
  return (
    <ChartCard title="Utilisation" metricLabel="Billable share of logged hours, September"
      value={`${billableSeptember.toLocaleString("en-US")} of ${hours(loggedSeptember)}`}>
      <GaugeChart aria-label="Billable share of logged hours against the 85% target, September 2026" value={billableSeptember} max={loggedSeptember}
        target={loggedSeptember * 0.85} actualLabel="Billable" />
    </ChartCard>
  );
}
