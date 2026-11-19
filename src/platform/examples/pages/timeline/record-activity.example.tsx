import { TimelineActivity } from "@zen-ds/react";
import { activityLog } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026.
const TODAY = "2026-09-30";

export default function RecordActivity() {
  return <TimelineActivity entries={activityLog} today={TODAY} />;
}
