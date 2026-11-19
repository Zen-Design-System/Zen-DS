import { useId } from "react";
import { Card, Grid, Heading, Metric, Stack, Text } from "@zen-ds/react";

/** A survey widget: people-centred scores with an emoji Dock-Icon instead of an icon. */
export default function TeamPulse() {
  const headingId = useId();
  return (
    <Card as="section" theme="default" aria-labelledby={headingId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/Subheading">Pulse survey</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">September · 39 of 48 people answered</Text>
        </Stack>
        {/* People-centred scores: an emoji Dock-Icon instead of an icon */}
        <Grid minColumnWidth="160px" gap="sm">
          <Metric size="md" label="Team mood" value="4.3 / 5" iconEmoji="😊" trend={{ direction: "positive", label: "0.2", subLabel: "vs. August" }} />
          <Metric size="md" label="Energy" value="3.8 / 5" iconEmoji="⚡" trend={{ direction: "normal", label: "0", subLabel: "vs. August" }} />
        </Grid>
      </Stack>
    </Card>
  );
}
