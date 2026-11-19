import { useRef, useState } from "react";
import { Box, InlineMessage, MetricCard, Stack, useToast } from "@zen-ds/react";

/** A worrying trend with an Inline Message that says what to do next; Send reminder turns it into the result. */
export default function TrendGuidance() {
  const { toast } = useToast();
  const messageRef = useRef<HTMLElement>(null);
  const [sent, setSent] = useState(false);
  const send = () => {
    setSent(true);
    // The Send button goes away with the warning, so focus moves to the result instead of <body>.
    setTimeout(() => messageRef.current?.focus());
    toast({ title: "Reminder sent", action: { label: "Undo", onClick: () => setSent(false) } });
  };
  return (
    <Stack gap="md">
      <MetricCard theme="default" label="Timesheets submitted" value="41 of 48" icon="icon-clock-line" iconTheme="blue" iconBackground="solid"
        trend={{ direction: "negative", label: "4", subLabel: "vs. last week" }} />
      <Box ref={messageRef} tabIndex={-1}>
        {sent ? (
          <InlineMessage theme="positive" title="Reminder sent to 7 people">If hours are still missing on Friday morning, they get one more.</InlineMessage>
        ) : (
          <InlineMessage theme="warning" title="7 people haven't logged last week" action={{ label: "Send reminder", onClick: send }}>
            Lumen Bank is invoiced on Friday, Oct 2, 2026. Hours logged later move to the next invoice.
          </InlineMessage>
        )}
      </Box>
    </Stack>
  );
}
