import { ChartCard, ComboChart, type ChartComboDatum } from "@zen-ds/react";
import { studioTeamHours } from "../../data";

/** "5,900 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;
const percent = (value: number) => `${value}%`;

/** Studio utilisation (billable ÷ available hours) per month, Apr – Sep 2026: 78% in September. */
const utilisation = [77, 81, 80, 82, 80, 78];
/** Billable hours (the four teams added up) and utilisation per month, Apr – Sep 2026. */
const hoursUtilisation: ChartComboDatum[] = studioTeamHours.map((month, i) => ({
  label: month.label, bar: month.design + month.engineering + month.delivery + month.clientServices, line: utilisation[i],
}));

/** lineMax={100} fixes the end axis at 0 – 100%, so 78% sits at 78% of the plot. */
export default function HoursUtilisation() {
  return (
    <ChartCard title="Hours and utilisation" metricLabel="Billable hours and the share of available hours" value={`${percent(utilisation[utilisation.length - 1])} in September`}>
      <ComboChart aria-label="Billable hours and utilisation per month, Apr – Sep 2026" data={hoursUtilisation} barLabel="Billable hours" lineLabel="Utilisation"
        format={hours} lineFormat={percent} lineMax={100} height={240} />
    </ChartCard>
  );
}
