import type { RefObject } from "react";
import { AppShell, TimelineActivity, TopNavigation } from "@zen-ds/react";
import { activityLog } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026.
const TODAY = "2026-09-30";

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function PhoneActivity({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  return (
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title="Activity" />}>
      <TimelineActivity entries={activityLog} today={TODAY} />
    </AppShell>
  );
}
