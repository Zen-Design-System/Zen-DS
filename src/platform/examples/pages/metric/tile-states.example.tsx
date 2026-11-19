import { useId, useRef, useState } from "react";
import {
  Card, Grid, Heading, InlineMessage, Metric, MetricCard, SkeletonHeading, SkeletonShape, SkeletonText, Stack, Text, VisuallyHidden,
} from "@zen-ds/react";

/** "—" for a metric without data; screen readers hear "No data" instead of a dash. */
const noData = <><span aria-hidden="true">—</span><VisuallyHidden>No data</VisuallyHidden></>;

type Load = "error" | "loading" | "ready";

/** Three tiles of one project dashboard: loaded, no data yet, and couldn't load (Try again → Skeleton → the number). */
export default function TileStates() {
  const headingId = useId();
  const tileRef = useRef<HTMLElement>(null);
  const [tasks, setTasks] = useState<Load>("error");
  const [status, setStatus] = useState("");
  const retry = () => {
    setTasks("loading");
    setStatus("Loading open tasks");
    tileRef.current?.focus();
    // A demo request: the retry takes about a second, then the number arrives.
    setTimeout(() => { setTasks("ready"); setStatus("Open tasks loaded"); }, 1200);
  };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Brand refresh</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Kickoff on Oct 12, 2026</Text>
      </Stack>
      {/* At most three tiles a row, one on a phone */}
      <Grid minColumnWidth="clamp(240px, 30%, 100%)" gap="md">
        {/* Loaded */}
        <MetricCard theme="default" size="md" label="Budget" value="$36,000" icon="icon-coins-line" iconTheme="green" />
        {/* No data yet: a dash, and a caption that says why */}
        <Card theme="default">
          <Stack gap="xs">
            <Metric size="md" label="Hours logged" value={noData} icon="icon-clock-line" iconTheme="blue" />
            <Text textStyle="Body/Small/Regular" tone="base">No time logged yet. Tracking starts at the kickoff.</Text>
          </Stack>
        </Card>
        {/* Couldn't load → Skeleton in the metric's shape → the number */}
        <Card theme="default" ref={tileRef} tabIndex={-1} aria-busy={tasks === "loading"}>
          {tasks === "loading" ? (
            <Stack direction="row" gap="sm" align="center" aria-hidden="true">
              <SkeletonShape shape="round" size="md" />
              <Stack gap="2xs">
                {/* The label placeholder stands for about 11 characters of the label it replaces. */}
                <SkeletonText lines={1} style={{ width: "11ch" }} />
                <SkeletonHeading size="md" />
              </Stack>
            </Stack>
          ) : tasks === "error" ? (
            <Stack gap="md">
              <Metric size="md" label="Open tasks" value={noData} icon="icon-check-done-line" iconTheme="orange" />
              <InlineMessage theme="negative" title="Couldn't load tasks" action={{ label: "Try again", onClick: retry }} />
            </Stack>
          ) : (
            <Metric size="md" label="Open tasks" value="6" icon="icon-check-done-line" iconTheme="orange" />
          )}
        </Card>
      </Grid>
      <VisuallyHidden role="status">{status}</VisuallyHidden>
    </Stack>
  );
}
