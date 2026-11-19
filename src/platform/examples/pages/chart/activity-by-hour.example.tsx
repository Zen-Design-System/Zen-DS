import { ChartCard, HeatmapChart } from "@zen-ds/react";

/** "1,540 h" — hours read in full. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** Hours logged per hour of the day in September, by weekday (the studio's timesheets). */
const loggedHours = ["9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const loggedByHour = [
  [38, 41, 40, 39, 35, 4, 0], [62, 66, 64, 63, 55, 6, 2], [71, 74, 72, 70, 61, 7, 2], [34, 36, 35, 33, 30, 5, 1], [52, 55, 53, 51, 44, 6, 1],
  [68, 72, 70, 69, 52, 5, 2], [70, 75, 73, 71, 48, 4, 1], [61, 64, 63, 60, 39, 3, 0], [42, 44, 43, 41, 22, 2, 0], [12, 14, 13, 12, 5, 0, 0],
];

/** A value per weekday and hour on five Brand steps; the arrow keys move through the cells. */
export default function Activity() {
  return (
    <ChartCard title="When the studio logs time" metricLabel="Hours logged per hour, September">
      <HeatmapChart aria-label="Hours logged by weekday and hour of the day, September 2026" rows={loggedHours} columns={weekdays} values={loggedByHour} format={hours} />
    </ChartCard>
  );
}
