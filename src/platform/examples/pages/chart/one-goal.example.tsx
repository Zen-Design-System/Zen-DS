import { BulletChart, ChartCard } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

/** What the studio collected in Q3 2026 (Jul – Sep, $275,800) against the plan. */
const collectedQ3 = studioMonths.slice(-3).reduce((sum, m) => sum + m.collected, 0);

/** One goal whose target matters: the tick shows the plan, which a progress bar can't. */
export default function CollectedGoal() {
  return (
    <ChartCard title="Collected in Q3" metricLabel="Against the $290K plan" value={formatMoney(collectedQ3)}>
      <BulletChart aria-label="Collected against plan, Q3 2026" data={[{ label: "Jul – Sep 2026", value: collectedQ3, target: 290000, max: 300000 }]}
        actualLabel="Collected" targetLabel="Plan" format={formatCompactMoney} />
    </ChartCard>
  );
}
