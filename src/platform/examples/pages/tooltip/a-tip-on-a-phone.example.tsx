import { useRef, useState, type RefObject } from "react";
import { AppShell, Button, Heading, Stack, Text, Tooltip, TopNavigation, useToast } from "@zen-ds/react";
import { formatMoney } from "../../data";

/** An expenses app: the new Scan receipt action carries a tip open from the start; its X closes it, Show tip brings it back. */
// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function ScanTip({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  // A tooltip never opens on touch, so on a phone the tip is open from the start and closable.
  const [tip, setTip] = useState(true);
  const scanRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  // Show tip goes away once pressed, so the focus moves to the button the tip is about.
  const showTip = () => {
    setTip(true);
    setTimeout(() => scanRef.current?.focus());
  };
  return (
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Expenses" />}>
      <Stack gap="lg">
        <Stack gap="2xs">
          <Text textStyle="Body/Small/Regular" tone="base">This month</Text>
          <Heading level={2} textStyle="Heading/2">{formatMoney(1284.5)}</Heading>
        </Stack>
        <Stack direction="row" gap="sm" align="center" wrap>
          <Tooltip content="New: snap a receipt and the amount fills itself in" placement="bottom" closable open={tip} onOpenChange={setTip}>
            <Button ref={scanRef} level="primary" startIcon="icon-camera-line" onClick={() => toast({ title: "Camera opened" })}>Scan receipt</Button>
          </Tooltip>
          {tip ? null : <Button level="tertiary" onClick={showTip}>Show tip</Button>}
        </Stack>
      </Stack>
    </AppShell>
  );
}
