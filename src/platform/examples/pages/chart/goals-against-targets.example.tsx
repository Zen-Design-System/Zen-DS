import { BulletChart, ChartCard, type ChartBullet } from "@zen-ds/react";
import { formatCompactMoney, studioMonths } from "../../data";

const percent = (value: number) => `${value}%`;

/** Q3 2026 goals, each in its own unit: revenue (Jul – Sep invoiced, $296,800), new clients, utilisation (September). */
const q3Goals: ChartBullet[] = [
  { label: "Revenue", value: studioMonths.slice(-3).reduce((sum, m) => sum + m.invoiced, 0), target: 320000 },
  { label: "New clients", value: 5, target: 4 },
  { label: "Utilisation", value: 78, target: 80, max: 100 },
];
const goalFormat = (value: number, row: ChartBullet) => (row.label === "Revenue" ? formatCompactMoney(value) : row.label === "Utilisation" ? percent(value) : String(value));

/** Goals against their targets, each on its own scale: a bar past its tick is a goal met. */
export default function QuarterGoals() {
  const met = q3Goals.filter((goal) => goal.value >= goal.target).length;
  return (
    <ChartCard title="Quarter goals" metricLabel="Q3 2026 against target" value={`${met} of ${q3Goals.length} met`}>
      <BulletChart aria-label="Quarter goals, Q3 2026" data={q3Goals} format={goalFormat} />
    </ChartCard>
  );
}
