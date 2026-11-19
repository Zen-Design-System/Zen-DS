import { BarChart, ChartCard, type ChartPoint } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

/** Invoiced per month in 2026: Jan – Sep from the shared months, Oct – Dec the finance team's forecast (hatched). */
const forecast = [["Oct", 108000], ["Nov", 112500], ["Dec", 104000]] as const;
const revenue2026: ChartPoint[] = [
  ...studioMonths.slice(-9).map((m) => ({ label: m.label, value: m.invoiced })),
  ...forecast.map(([label, value]) => ({ label, value, projected: true })),
];
const invoicedSoFar = studioMonths.slice(-9).reduce((total, m) => total + m.invoiced, 0);

/** The year's revenue: closed months as bars, the projected ones hatched, and the closed months' average (showAverage). */
export default function RevenueForecast() {
  return (
    <ChartCard title="Revenue" metricLabel="Invoiced so far in 2026" value={formatMoney(invoicedSoFar)}>
      <BarChart aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" data={revenue2026} format={formatCompactMoney} height={240} showAverage />
    </ChartCard>
  );
}
