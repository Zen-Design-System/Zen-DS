import { useState } from "react";
import { ChartCard, DescriptionList, Dialog, LineChart } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

/** Jul–Sep 2026 of the studio's months. */
const q3 = studioMonths.slice(9, 12);
const total = (months: typeof q3, key: "invoiced" | "collected") => months.reduce((sum, month) => sum + month[key], 0);
const revenueRanges = [{ id: "q3", label: "Q3", months: q3 }, { id: "ytd", label: "This year", months: studioMonths.slice(3) }];

/** A Solid Neutral chart card: ChartCard passes theme and color to its Card. */
export default function DarkRevenueCard() {
  const [rangeId, setRangeId] = useState("q3");
  const [reportOpen, setReportOpen] = useState(false);
  const range = revenueRanges.find((option) => option.id === rangeId)!;
  return (
    <>
      <ChartCard title="Revenue" headingLevel={4} theme="solid" color="neutral" value={formatMoney(total(range.months, "invoiced"))}
        metricLabel={`Invoiced, ${range.months[0].month} to ${range.months[range.months.length - 1].month}`}
        ranges={revenueRanges.map(({ id, label }) => ({ id, label }))} range={rangeId} onRangeChange={setRangeId}
        onOpen={() => setReportOpen(true)} openLabel="Open revenue report">
        <LineChart key={rangeId} aria-label={`Revenue invoiced per month, ${range.label}`} data={range.months.map((month) => ({ label: month.label, value: month.invoiced }))}
          format={formatCompactMoney} height={200} />
      </ChartCard>
      <Dialog open={reportOpen} onOpenChange={setReportOpen} title="Revenue" description={range.label}>
        <DescriptionList items={range.months.map((month) => ({ id: month.id, term: month.month, description: formatMoney(month.invoiced) }))} />
      </Dialog>
    </>
  );
}
