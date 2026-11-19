import { useState } from "react";
import { Stack, Text, TimelineGantt, type TimelineTaskData } from "@zen-ds/react";
import { roadmapGroups } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026.
const TODAY = "2026-09-30";

export default function Roadmap() {
  const [open, setOpen] = useState<TimelineTaskData | null>(null);
  return (
    <Stack gap="md">
      <TimelineGantt groups={roadmapGroups} start="2026-08-31" today={TODAY} aria-label="Lotus banking redesign" onTaskClick={(task) => setOpen(task)} />
      <Text tone="light" aria-live="polite">{open ? `${open.name}${open.kind === "milestone" ? " (milestone)" : ""}` : "Select a bar to open its task."}</Text>
    </Stack>
  );
}
