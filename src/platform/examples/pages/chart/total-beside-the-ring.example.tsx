import { ChartCard, DonutChart, Grid, RadialChart, type ChartSlice } from "@zen-ds/react";
import { clientShares, formatCompactMoney, formatMoney, projectById } from "../../data";

/** Budget used on the client projects under way (spent ÷ budget). */
const budgetRings: ChartSlice[] = ["lumen-banking", "phin-loyalty", "mekong-tracking"].map((id) => {
  const project = projectById(id);
  return { id, label: project.name, value: Math.round((project.spent / project.budget) * 100) };
});

/** A dashboard row of two half-width cards: the quarter with its total beside the ring (the figure leads, the legend lists
 *  down under it), next to the ring gauges. */
export default function ClientShareSplit() {
  return (
    <Grid minColumnWidth="clamp(320px, 45%, 100%)" gap="md">
      <ChartCard title="Revenue by client">
        <DonutChart aria-label="Revenue by client, Q3 2026" data={clientShares} format={formatCompactMoney} totalPosition="start" size="large"
          label="Invoiced in Q3 2026" value={formatMoney(clientShares.reduce((sum, c) => sum + c.value, 0))} />
      </ChartCard>
      <ChartCard title="Budget used" metricLabel="Client projects, spent of budget">
        <RadialChart aria-label="Budget used on client projects, September 30, 2026" data={budgetRings} legendPosition="end" />
      </ChartCard>
    </Grid>
  );
}
