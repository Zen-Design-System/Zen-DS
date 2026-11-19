import { useId, type RefObject } from "react";
import { AppShell, GroupedBarChart, Heading, List, ListItem, Stack, Text, TopNavigation, useToast, type ChartDatum } from "@zen-ds/react";

/** "34 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

/** Alex's last six full weeks, split into billable and internal time. */
const weekly = [["Aug 17", 38], ["Aug 24", 41], ["Aug 31", 36], ["Sep 7", 40], ["Sep 14", 42], ["Sep 21", 39]] as const;
const billable = [32, 35, 29, 33, 36, 34];
const myWeekSplit: ChartDatum[] = weekly.map(([label, value], i) => ({ label, values: { billable: billable[i], internal: value - billable[i] } }));
const myBillable = myWeekSplit.reduce((sum, week) => sum + week.values.billable, 0);
const myInternal = myWeekSplit.reduce((sum, week) => sum + week.values.internal, 0);

/**
 * A screen pushed from Hours: one main chart straight on the screen; the totals close it, open on the grey Canvas
 * (usage rules §19).
 */
// scrollRef: what scrolls the screen (the bar's divider shows once content runs under it). "window" in your app.
export default function PhoneTimeSplit({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const chartId = useId();
  const totalsId = useId();
  // Back leads to Hours, which this example does not draw: the toast names where it goes.
  const back = { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => toast({ title: "Back to Hours", children: "This example shows the one screen." }) };
  return (
    <AppShell topNavigation={<TopNavigation type="compact-alt" title="Billable time" scrollRef={scrollRef} leading={back} />}>
      <Stack as="section" gap="md" aria-labelledby={chartId}>
        <Stack gap="xs">
          <Heading level={2} id={chartId} textStyle="Heading/Subheading">Billable and internal</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Last six weeks, Aug 17 – Sep 27</Text>
        </Stack>
        <GroupedBarChart aria-label="Your billable and internal hours per week, Aug 17 – Sep 27, 2026" data={myWeekSplit}
          series={[{ id: "billable", label: "Billable" }, { id: "internal", label: "Internal" }]} format={hours} height={220} />
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={totalsId}>
        <Heading level={2} id={totalsId} textStyle="Body/Small/Bold" tone="light">Six-week totals</Heading>
        <List aria-labelledby={totalsId}>
          <ListItem title="Billable" caption={`${Math.round((myBillable / (myBillable + myInternal)) * 100)}% of logged time`} trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(myBillable)}</Text>} />
          <ListItem title="Internal" caption="Reviews, critiques and office hours" trailing={<Text as="span" textStyle="Body/Base/Medium">{hours(myInternal)}</Text>} />
        </List>
      </Stack>
    </AppShell>
  );
}
