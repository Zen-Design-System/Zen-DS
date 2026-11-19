import { useId, useState } from "react";
import { ChipGroup, Stack, Text } from "@zen-ds/react";

const repeats = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const repeatSummary: Record<string, string> = {
  never: "Sent once, on Friday at 9:00 am",
  daily: "Every day at 9:00 am, starting Friday",
  weekdays: "Monday to Friday at 9:00 am",
  weekly: "Every Friday at 9:00 am",
  monthly: "On the 10th of every month at 9:00 am",
};

/** How often a reminder repeats: exactly one value applies, so the chips are a ChipGroup (a radio group). */
export default function RepeatReminder() {
  const labelId = useId();
  const [repeat, setRepeat] = useState<string | null>("weekly");
  return (
    <Stack gap="sm">
      <Text as="span" id={labelId} textStyle="Body/Base/Bold">Repeat</Text>
      {/* One value at a time: a radio group of Normal chips (not toggles with aria-pressed). */}
      <ChipGroup aria-labelledby={labelId} options={repeats} value={repeat} onValueChange={setRepeat} />
      <Text role="status" textStyle="Body/Small/Regular" tone="base">{repeat ? repeatSummary[repeat] : null}</Text>
    </Stack>
  );
}
