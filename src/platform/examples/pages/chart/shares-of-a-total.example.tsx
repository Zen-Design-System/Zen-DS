import { useState } from "react";
import { ChartCard, DonutChart } from "@zen-ds/react";
import { clientShares, clientSharesYtd, formatCompactMoney } from "../../data";

const quarters = [{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }];

/** One quarter's revenue split across clients, the legend beside the ring. */
export default function ClientShare() {
  const [quarter, setQuarter] = useState("q3");
  return (
    <ChartCard title="Revenue by client" ranges={quarters} range={quarter} onRangeChange={setQuarter}>
      <DonutChart key={quarter} aria-label={`Revenue by client, ${quarter === "q3" ? "Q3 2026" : "Jan – Sep 2026"}`} data={quarter === "q3" ? clientShares : clientSharesYtd}
        format={formatCompactMoney} legendPosition="start" />
    </ChartCard>
  );
}
