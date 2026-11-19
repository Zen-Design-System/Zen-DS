import { useId } from "react";
import { Card, Divider, Grid, Heading, Metric, Stack, Text } from "@zen-ds/react";
import { studio } from "../../data";

/** Headcount leads at XLarge; the three metrics that explain it share one smaller size below a Divider. */
export default function LeadMetric() {
  const headingId = useId();
  return (
    <Card as="section" theme="default" aria-labelledby={headingId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/Subheading">People</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{studio.name} · Jul 1 – Sep 30, 2026</Text>
        </Stack>
        {/* The one metric that leads: XLarge, and the only Solid Dock-Icon. */}
        <Metric size="xl" label="Headcount" value="48" icon="icon-users-check-line" iconTheme="accent" iconBackground="solid" trend={{ direction: "positive", label: "4", subLabel: "vs. Q2" }} />
        <Divider />
        {/* The metrics that explain it: one smaller size, Subtle icons. */}
        <Grid minColumnWidth="120px" gap="sm">
          <Metric size="sm" label="Joined" value="5" icon="icon-user-plus-line" />
          <Metric size="sm" label="Left" value="1" icon="icon-user-minus-line" />
          <Metric size="sm" label="Open roles" value="3" icon="icon-briefcase-line" />
        </Grid>
      </Stack>
    </Card>
  );
}
