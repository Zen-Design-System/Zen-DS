import { useState } from "react";
import { BarList, ChartCard } from "@zen-ds/react";
import { clientShares, clientSharesYtd, formatMoney } from "../../data";

const clientRanking = { q3: clientShares, ytd: clientSharesYtd };
const quarters = [{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }];

/** A bar list ranks a few items with their values; the range switch redraws it. */
export default function TopClients() {
  const [quarter, setQuarter] = useState<"q3" | "ytd">("q3");
  const rows = clientRanking[quarter];
  return (
    <ChartCard title="Top clients" metricLabel={quarter === "q3" ? "Revenue in Q3 2026" : "Revenue, Jan – Sep 2026"}
      value={formatMoney(rows.reduce((sum, c) => sum + c.value, 0))} ranges={quarters} range={quarter} onRangeChange={(id) => setQuarter(id as "q3" | "ytd")}>
      {/* Ranked largest first by you: the list keeps your order. */}
      <BarList key={quarter} aria-label={`Revenue by client, ${quarter === "q3" ? "Q3 2026" : "Jan – Sep 2026"}`} headers={{ label: "Client", value: "Revenue" }}
        data={rows.map((c) => ({ label: c.label, value: c.value }))} format={(v) => formatMoney(v)} />
    </ChartCard>
  );
}
