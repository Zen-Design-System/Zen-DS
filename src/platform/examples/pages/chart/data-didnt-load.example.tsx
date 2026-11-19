import { useRef, useState } from "react";
import { Box, ChartCard, InlineMessage, LineChart, SkeletonShape, VisuallyHidden, type ChartPoint } from "@zen-ds/react";

/** Studio utilisation (billable ÷ available hours) per month, Apr – Sep 2026: 78% in September, 2 points below August. */
const utilisation: ChartPoint[] = [["Apr", 77], ["May", 81], ["Jun", 80], ["Jul", 82], ["Aug", 80], ["Sep", 78]]
  .map(([label, value]) => ({ label: String(label), value: Number(value) }));
const percent = (value: number) => `${value}%`;

/** When the data fails, the card keeps its title and offers Try again; a Skeleton holds the chart's place meanwhile. */
export default function LoadFailed() {
  const regionRef = useRef<HTMLElement>(null);
  const [load, setLoad] = useState<"failed" | "loading" | "ready">("failed");
  const retry = () => {
    setLoad("loading");
    // Try again leaves with the message: focus moves to the chart's place, not to <body>.
    regionRef.current?.focus();
    // A demo request: the retry takes about a second, then the months arrive.
    setTimeout(() => setLoad("ready"), 1200);
  };
  return (
    <ChartCard title="Utilisation">
      <Box ref={regionRef} tabIndex={-1} aria-busy={load === "loading"}>
        {load === "failed" ? (
          <InlineMessage theme="negative" title="Couldn't load utilisation" action={{ label: "Try again", onClick: retry }}>
            The timesheet service didn't answer in time.
          </InlineMessage>
        ) : load === "loading" ? (
          // The chart's own size (LineChart height={220}, full width), so nothing jumps when the months arrive.
          <SkeletonShape style={{ width: "100%", height: 220 }} />
        ) : (
          <LineChart aria-label="Studio utilisation per month, Apr – Sep 2026" data={utilisation} format={percent} height={220} />
        )}
      </Box>
      <VisuallyHidden role="status">{load === "loading" ? "Loading utilisation" : load === "ready" ? "Utilisation loaded" : ""}</VisuallyHidden>
    </ChartCard>
  );
}
