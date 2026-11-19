import { useId, type RefObject } from "react";
import { AppShell, DockIcon, Grid, Heading, List, ListItem, MetricCard, Stack, TopNavigation, useToast, type DockIconTheme, type IconName } from "@zen-ds/react";
import { formatRange, leaveRequests, me } from "../../data";

type Row = { id: string; title: string; caption: string; icon: IconName; theme: DockIconTheme };

/** Alex's approved leave in October, from the studio's shared leave requests. */
const myLeave = leaveRequests.find((request) => request.person === me.id && request.status === "Approved")!;
/** The phone app's week, pushed from Numbers: two Medium tiles (the dark one stands out), three Small tiles, then what
 *  comes up next (the shared tasks, review requests and leave). */
const comingUp: Row[] = [
  { id: "audit", title: "Audit the account overview for WCAG 2.2", caption: "LUM-091 · Due today", icon: "icon-check-square-line", theme: "blue" },
  { id: "review", title: "Connect the rewards API to checkout", caption: "Bao Nguyen asked you to review", icon: "icon-annotation-check-line", theme: "purple" },
  { id: "leave", title: "Annual leave", caption: formatRange(myLeave.from, myLeave.to), icon: "icon-plane-line", theme: "cyan" },
];

// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function PhoneTiles({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const daysId = useId();
  // Back on a pushed screen whose parent this example does not draw: the toast names where it goes.
  const back = { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => toast({ title: "Back to Numbers", children: "This example shows the one screen." }) };
  return (
    <AppShell topNavigation={<TopNavigation type="compact-alt" title="This week" scrollRef={scrollRef} leading={back} />}>
      <Stack gap="md">
        <Grid columns="repeat(2, minmax(0, 1fr))" gap="sm">
          <MetricCard type="tile" theme="solid" color="neutral" label="Billable" value="82%" icon="icon-pie-chart-01-line"
            trend={{ direction: "positive", label: "4%" }} />
          <MetricCard type="tile" theme="default" label="Hours logged" value="164 h" icon="icon-clock-line"
            trend={{ direction: "positive", label: "12 h" }} />
        </Grid>
        <Grid columns="repeat(3, minmax(0, 1fr))" gap="sm">
          <MetricCard type="tile" size="sm" theme="default" label="Tasks done" value="12" icon="icon-check-done-line" trend={{ direction: "negative", label: "2" }} />
          <MetricCard type="tile" size="sm" theme="default" label="Reviews" value="9" icon="icon-annotation-check-line" trend={{ direction: "positive", label: "3" }} />
          <MetricCard type="tile" size="sm" theme="default" label="Days off left" value="9" icon="icon-plane-line" />
        </Grid>
      </Stack>
      {/* What comes up next: the rows under the tiles, in the Body's margin. */}
      <Stack as="section" gap="xs" aria-labelledby={daysId}>
        <Heading level={2} id={daysId} textStyle="Body/Small/Bold" tone="light">Coming up</Heading>
        <List aria-labelledby={daysId}>
          {comingUp.map((row) => (
            <ListItem key={row.id} title={row.title} titleLines={2} caption={row.caption} leading={<DockIcon size="md" icon={row.icon} theme={row.theme} background="subtle" />} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}
