import { ChartCard, LineChart, type ChartPoint } from "@zen-ds/react";
import { formatCompactMoney, studioMonths } from "../../data";

/** Invoiced per month, Apr – Sep 2026, against what was collected (the dashed comparison). */
const cashMonths: ChartPoint[] = studioMonths.slice(-6).map((m) => ({ label: m.label, value: m.invoiced }));
const collected = { label: "Collected", values: studioMonths.slice(-6).map((m) => m.collected) };

/** What was invoiced keeps the Accent line and area; what was collected runs as a dashed reference line. */
export default function CashFlow() {
  return (
    <ChartCard title="Invoiced and collected" metricLabel="Apr – Sep 2026">
      <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={cashMonths} label="Invoiced" compare={collected} legendPosition="top" format={formatCompactMoney} height={240} />
    </ChartCard>
  );
}
