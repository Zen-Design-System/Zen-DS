import { ChartCard, FunnelChart, plural, type ChartPoint } from "@zen-ds/react";

/** The studio's design hiring round, July – September 2026: six stages, the most a funnel takes. */
const hiringFunnel: ChartPoint[] = [["Applications", 214], ["Screened", 96], ["Portfolio review", 41], ["Interview", 18], ["Offer", 5], ["Hired", 4]]
  .map(([label, value]) => ({ label: String(label), value: Number(value) }));
const people = (value: number) => plural(value, "person", "people");

/** Tab to the funnel, then ↑/↓ move between stages and Home/End jump to the first and last. */
export default function HiringFunnel() {
  return (
    <ChartCard title="Design hiring" metricLabel="Product designer round, Jul – Sep" value={`${people(hiringFunnel[hiringFunnel.length - 1].value)} hired`}>
      <FunnelChart aria-label="Product designer hiring, applications to hires, July – September 2026" data={hiringFunnel} format={people} />
    </ChartCard>
  );
}
