import { ChartCard, GroupedBarChart, type ChartDatum } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

/** Invoiced and collected per month, Apr – Sep 2026 (the shared months; the Finance dashboard reads the same). */
const invoicedCollected: ChartDatum[] = studioMonths.slice(-6).map((m) => ({ label: m.label, values: { invoiced: m.invoiced, collected: m.collected } }));
const cashSeries = [{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }];
const invoicedSixMonths = studioMonths.slice(-6).reduce((sum, m) => sum + m.invoiced, 0);

/** Two measures side by side in each month: what was invoiced next to what came in. */
export default function InvoicedCollected() {
  return (
    <ChartCard title="Invoiced vs. collected" metricLabel="Apr – Sep 2026" value={formatMoney(invoicedSixMonths)}>
      <GroupedBarChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={invoicedCollected} series={cashSeries} format={formatCompactMoney} height={240} />
    </ChartCard>
  );
}
