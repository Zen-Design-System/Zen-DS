import { ChartCard, RadialChart, type ChartSlice } from "@zen-ds/react";
import { projectById } from "../../data";

/** Budget used on the client projects under way (spent ÷ budget). */
const budgetRings: ChartSlice[] = ["lumen-banking", "phin-loyalty", "mekong-tracking"].map((id) => {
  const project = projectById(id);
  return { id, label: project.name, value: Math.round((project.spent / project.budget) * 100) };
});

/** Up to four measures against the same maximum, as concentric rings. */
export default function BudgetRings() {
  return (
    <ChartCard title="Budget used" metricLabel="Client projects, spent of budget">
      <RadialChart aria-label="Budget used on client projects, September 30, 2026" data={budgetRings} legendPosition="end" />
    </ChartCard>
  );
}
