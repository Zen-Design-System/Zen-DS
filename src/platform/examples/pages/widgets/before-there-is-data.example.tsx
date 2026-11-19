import { useRef, useState } from "react";
import { AreaChart, Box, ChartCard, EmptyState, SkeletonShape, VisuallyHidden, useToast } from "@zen-ds/react";

/** The Hours by team widget before its first data: the step that brings data, a Skeleton while it loads, then the chart. */
export default function HoursBeforeData() {
  const { toast } = useToast();
  const regionRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState<"empty" | "loading" | "ready">("empty");
  const connect = () => {
    setLoad("loading");
    // The pressed button goes away: focus moves to the widget's place, not to <body>.
    regionRef.current?.focus();
    // A demo request: the first months arrive after about a second.
    setTimeout(() => {
      setLoad("ready");
      toast({ title: "Timesheets connected", children: "Six months of billable hours came in.", action: { label: "Undo", onClick: () => { setLoad("empty"); regionRef.current?.focus(); } } });
    }, 1200);
  };
  return (
    <Box ref={regionRef} tabIndex={-1} aria-busy={load === "loading"}>
      {load === "ready" ? (
        <ChartCard title="Billable hours by team" metricLabel="Logged per month, Apr – Sep 2026" value="35,240 h">
          <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" height={200} format={(value) => `${value.toLocaleString("en-US")} h`}
            series={[{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }, { id: "delivery", label: "Delivery" }, { id: "client-services", label: "Client Services" }]}
            data={[
              { label: "Apr", values: { design: 2500, engineering: 1880, delivery: 700, "client-services": 480 } },
              { label: "May", values: { design: 2510, engineering: 1880, delivery: 700, "client-services": 480 } },
              { label: "Jun", values: { design: 2720, engineering: 2040, delivery: 770, "client-services": 520 } },
              { label: "Jul", values: { design: 2920, engineering: 2190, delivery: 820, "client-services": 560 } },
              { label: "Aug", values: { design: 2550, engineering: 1910, delivery: 720, "client-services": 490 } },
              { label: "Sep", values: { design: 2650, engineering: 1990, delivery: 750, "client-services": 510 } },
            ]} />
        </ChartCard>
      ) : (
        // The card keeps its title and description while there is nothing to draw.
        <ChartCard title="Billable hours by team" metricLabel="Logged per month, Apr – Sep 2026">
          {load === "loading" ? (
            // The Skeleton takes the chart's own height (height={200} plus its axis lane and legend), so nothing jumps
            // when the months arrive.
            <SkeletonShape style={{ display: "block", width: "100%", height: 236 }} />
          ) : (
            <EmptyState icon="icon-clock-line" title="No timesheets yet" primaryAction={{ label: "Connect timesheets", onClick: connect }}>
              Hours your teams log show here month by month.
            </EmptyState>
          )}
        </ChartCard>
      )}
      <VisuallyHidden role="status">{load === "loading" ? "Loading billable hours" : load === "ready" ? "Billable hours loaded" : ""}</VisuallyHidden>
    </Box>
  );
}
