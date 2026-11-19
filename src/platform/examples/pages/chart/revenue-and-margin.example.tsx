import { ChartCard, ComboChart, type ChartComboDatum } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

const percent = (value: number) => `${value}%`;

/** Revenue and margin per month, Apr – Sep 2026: invoiced (the shared months) and the share kept after costs. */
const revenueMargin: ChartComboDatum[] = studioMonths.slice(-6).map((m, i) => ({ label: m.label, bar: m.invoiced, line: [31, 34, 29, 36, 38, 41][i] }));
const invoicedSixMonths = studioMonths.slice(-6).reduce((sum, m) => sum + m.invoiced, 0);

/** Two measures with different units over the same months: bars on the start axis, a line on the end axis. */
export default function RevenueMargin() {
  return (
    <ChartCard title="Revenue and margin" metricLabel="Apr – Sep 2026" value={formatMoney(invoicedSixMonths)}>
      <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" data={revenueMargin} barLabel="Revenue" lineLabel="Margin"
        format={formatCompactMoney} lineFormat={percent} height={240} />
    </ChartCard>
  );
}
