import { useRef, useState } from "react";
import { ChartCard, EmptyState, LineChart, plural, useToast, type ChartPoint } from "@zen-ds/react";

/** "14 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** The first two weeks of Brand refresh time, from the imported timesheets. */
const firstWeeks: ChartPoint[] = [{ label: "Sep 21", value: 6 }, { label: "Sep 28", value: 14 }];

/** Before any time is logged the card keeps its title and shows the action that brings data in. */
export default function NoData() {
  const { toast } = useToast();
  // The pressed button goes away (Import timesheets, or Undo with its toast): focus moves to the card's title.
  const titleRef = useRef<HTMLSpanElement>(null);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const importTimesheets = () => {
    setPoints(firstWeeks);
    setTimeout(() => titleRef.current?.focus());
    // Undo closes its toast after it runs.
    toast({ title: "Timesheets imported", children: `${plural(5, "entry", "entries")} from Gia Pham and Emi Sato`,
      action: { label: "Undo", onClick: () => { setPoints([]); setTimeout(() => titleRef.current?.focus()); } } });
  };
  return (
    <ChartCard title={<span ref={titleRef} tabIndex={-1}>Hours logged</span>}>
      {points.length ? (
        <LineChart aria-label="Hours logged on Brand refresh per week, since Sep 21, 2026" data={points} format={hours} height={220} />
      ) : (
        <EmptyState icon="icon-clock-line" title="No hours logged yet" primaryAction={{ label: "Import timesheets", onClick: importTimesheets }}>
          Time the team logs on Brand refresh shows here week by week.
        </EmptyState>
      )}
    </ChartCard>
  );
}
