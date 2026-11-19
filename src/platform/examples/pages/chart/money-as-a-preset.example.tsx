import { BarList, ChartCard, Grid, LineChart, type ChartPoint } from "@zen-ds/react";
import { clientShares, studioMonths } from "../../data";

/** Invoiced per month, Apr – Sep 2026, against what was collected (the dashed comparison). */
const cashMonths: ChartPoint[] = studioMonths.slice(-6).map((m) => ({ label: m.label, value: m.invoiced }));
const collected = { label: "Collected", values: studioMonths.slice(-6).map((m) => m.collected) };

/** Money written as text (format="currency"), as a Zen Studio page writes it: a page holds text, never a function. */
export default function CurrencyPreset() {
  return (
    <Grid minColumnWidth="clamp(300px, 45%, 100%)" gap="md">
      <ChartCard title="Invoiced and collected" metricLabel="Apr – Sep 2026">
        <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={cashMonths} label="Invoiced" compare={collected} legendPosition="top" format="currency" height={240} />
      </ChartCard>
      <ChartCard title="Top clients" metricLabel="Revenue in Q3 2026">
        <BarList aria-label="Revenue by client, Q3 2026" headers={{ label: "Client", value: "Revenue" }} data={clientShares} format="currency" />
      </ChartCard>
    </Grid>
  );
}
