import { Card, Heading, Stack, TimelineActivity, type TimelineEntryData } from "@zen-ds/react";
import { activityLog } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026.
const TODAY = "2026-09-30";

// A dense audit log: Size Small, a Dot marker in each entry's tone, no attachments.
const log = activityLog.map((entry): TimelineEntryData => ({ ...entry, attachment: undefined, marker: { kind: "dot", tone: entry.marker?.tone ?? "neutral" } }));

export default function CompactLog() {
  return (
    <Card theme="default">
      <Stack gap="md">
        <Heading level={3} textStyle="Heading/Subheading">Audit log</Heading>
        <TimelineActivity size="sm" entries={log} today={TODAY} />
      </Stack>
    </Card>
  );
}
