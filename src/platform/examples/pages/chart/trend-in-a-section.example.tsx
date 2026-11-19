import { useId } from "react";
import { Heading, LineChart, Metric, Stack, Text, type ChartPoint } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, projectById } from "../../data";

const lumen = projectById("lumen-banking");
/** Budget spent on Online banking redesign, week by week since the kickoff (cumulative). */
const budgetSpent: ChartPoint[] = [
  ["Aug 24", 13900], ["Aug 31", 21800], ["Sep 7", 30200], ["Sep 14", 38900], ["Sep 21", 48600], ["Sep 28", lumen.spent],
].map(([label, value]) => ({ label: String(label), value: Number(value) }));

/** Inside a page section the chart goes without a card, under the section heading and the metric it explains. */
export default function TrendInSection() {
  const headingId = useId();
  const share = Math.round((lumen.spent / lumen.budget) * 100);
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Budget spent</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{lumen.name} · {lumen.client}</Text>
      </Stack>
      <Metric size="xl" icon={false} label="Spent so far" value={formatMoney(lumen.spent)} trend={{ direction: "normal", label: `${share}%`, subLabel: `of ${formatMoney(lumen.budget)}` }} />
      <LineChart aria-label={`${lumen.name}, budget spent by week, Aug 24 – Sep 28, 2026`} data={budgetSpent} format={formatCompactMoney} height={200} />
    </Stack>
  );
}
