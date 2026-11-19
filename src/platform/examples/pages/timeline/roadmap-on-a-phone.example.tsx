import { TimelineGantt } from "@zen-ds/react";
import { roadmapGroups } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026.
const TODAY = "2026-09-30";

// device="mobile": three weeks in view, the task column stays while the track scrolls.
export default function RoadmapOnAPhone() {
  return <TimelineGantt device="mobile" groups={roadmapGroups} start="2026-08-31" today={TODAY} aria-label="Lotus banking redesign" />;
}
