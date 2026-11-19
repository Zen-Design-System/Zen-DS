import { useState, type RefObject } from "react";
import { ActionBar, AppShell, ScheduleSlotPicker, TopNavigation } from "@zen-ds/react";
import { bookingSlots } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026, 13:15.
const TODAY = "2026-09-30";

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function PhoneBooking({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [slot, setSlot] = useState<string | null>(null);
  const time = slot ? slot.slice(11) : null;
  return (
    // The footer books the chosen time.
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title="Book a review" />}
      actionBar={<ActionBar primaryAction={{ label: time ? `Book ${time}` : "Pick a time", disabled: !slot, onClick: () => setSlot(null) }} />}>
      <ScheduleSlotPicker device="mobile" slots={bookingSlots} today={TODAY} value={slot} onValueChange={setSlot} />
    </AppShell>
  );
}
