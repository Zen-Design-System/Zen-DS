import { useState } from "react";
import { Button, MetricCard, Segmented, Stack, useToast } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

const usd = (value: number) => formatMoney(value);
const monthOf = (id: string) => studioMonths.find((m) => m.id === id)!;
/** What the studio invoiced each month this year (the Hero's line) and in total (its number). */
const thisYear = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep"].map((id) => monthOf(id).invoiced);
const thisYearTotal = thisYear.reduce((total, value) => total + value, 0);

/** The one Hero of a dashboard: Brand Pale, or the dark Solid Neutral widget (Button level inverse on it). */
export default function HeroMetric() {
  const { toast } = useToast();
  const [look, setLook] = useState<"brand" | "dark">("brand");
  const dark = look === "dark";
  return (
    <Stack gap="md">
      <Segmented aria-label="Hero style" value={look} onValueChange={(id) => setLook(id as "brand" | "dark")} options={[{ id: "brand", label: "Brand" }, { id: "dark", label: "Dark" }]} />
      <MetricCard type="hero" theme={dark ? "solid" : "pale"} color={dark ? "neutral" : "brand"} label="Invoiced this year" value={usd(thisYearTotal)}
        trend={{ direction: "positive", label: "12%", subLabel: "vs. 2025" }} series={thisYear} format={formatCompactMoney}
        footer={<Button size="sm" appearance={dark ? "overlay" : "main"} level={dark ? "inverse" : "primary"} onClick={() => toast({ title: "Report for 2026 opened in a new tab" })}>View report</Button>} />
    </Stack>
  );
}
