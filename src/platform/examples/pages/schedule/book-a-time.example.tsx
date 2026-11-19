import { useState } from "react";
import { Card, Heading, ScheduleSlotPicker, Stack, Text } from "@zen-ds/react";
import { bookingSlots } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026, 13:15.
const TODAY = "2026-09-30";

export default function BookATime() {
  const [slot, setSlot] = useState<string | null>(null);
  const time = slot ? new Date(slot).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <Card theme="default">
      <Stack gap="md">
        <Heading level={3} textStyle="Heading/Subheading">Book a design review</Heading>
        <ScheduleSlotPicker slots={bookingSlots} today={TODAY} value={slot} onValueChange={setSlot} aria-label="Review times" />
        <Text tone="light" aria-live="polite">{time ? `Booked: ${time}` : "Taken times are struck through and stay in place."}</Text>
      </Stack>
    </Card>
  );
}
