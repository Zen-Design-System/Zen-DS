import { useId, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Box, Card, CurvePreview, DockIcon, Heading, List, ListBox, ListItem, SelectField, SliderField, Stack, ToggleListItem, TopNavigation,
  useToast, type CurvePreviewType,
} from "@zen-ds/react";

const curveOptions: Array<{ value: CurvePreviewType; label: string }> = [
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in and out" },
];
const seconds = (value: number) => `${value.toFixed(2)} s`;
const isSpring = (type: CurvePreviewType) => type === "spring" || type === "bounce";

// scrollRef: what scrolls the screen, so the bar follows it. "window" in your app.
/** A pushed screen of the Loyalty app prototype: the compact bar with Back, the interaction it belongs to, the curve
 *  over its settings in one flat block on the grey Canvas, what Reduce Motion gets instead, and Preview / Apply pinned
 *  in the Action bar (Figma Bottom=Actions). */
export default function MotionSettingsPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const interactionId = useId();
  const animationId = useId();
  const accessId = useId();
  const [type, setType] = useState<CurvePreviewType>("bounce");
  const [duration, setDuration] = useState(0.45);
  const [bounce, setBounce] = useState(0.7);
  const [fade, setFade] = useState(true);
  const label = curveOptions.find((option) => option.value === type)?.label ?? "Spring";
  const summary = `${label} · ${seconds(duration)}${isSpring(type) ? ` · bounce ${bounce.toFixed(2)}` : ""}`;
  return (
    <AppShell
      topNavigation={<TopNavigation type="compact-alt" title="Transition" scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to the interaction", children: "On tap · Rewards card" }) }} />}
      actionBar={<ActionBar direction="horizontal"
        secondaryAction={{ label: "Preview", onClick: () => toast({ title: "Playing on the prototype", children: summary }) }}
        primaryAction={{ label: "Apply transition", onClick: () => toast({ type: "positive", title: "Transition applied", children: summary }) }} />}
    >
      <Stack as="section" gap="xs" aria-labelledby={interactionId}>
        <Box paddingX="lg"><Heading level={2} id={interactionId} textStyle="Body/Small/Bold" tone="light">Interaction</Heading></Box>
        <ListBox theme="default">
          <List aria-labelledby={interactionId}>
            <ListItem leading={<DockIcon icon="icon-cursor-click-line" theme="orange" background="subtle" size="medium" />} title="On tap · Rewards card"
              caption="Opens Reward detail · Loyalty app" />
          </List>
        </ListBox>
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={animationId}>
        <Box paddingX="lg"><Heading level={2} id={animationId} textStyle="Body/Small/Bold" tone="light">Animation</Heading></Box>
        <Card theme="default">
          <Stack gap="xs">
            {/* The preview takes the block's width; its height stays 176, so the overshoot stays readable. */}
            <CurvePreview type={type} bounce={isSpring(type) ? bounce : undefined} />
            <SelectField layout="inline" label="Type" value={type} onValueChange={(value) => setType(value as CurvePreviewType)} options={curveOptions} />
            <SliderField label="Duration" value={duration} onValueChange={setDuration} min={0.1} max={2} step={0.01} formatValue={seconds} />
            {isSpring(type) ? <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} /> : null}
          </Stack>
        </Card>
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={accessId}>
        <Box paddingX="lg"><Heading level={2} id={accessId} textStyle="Body/Small/Bold" tone="light">Reduce Motion</Heading></Box>
        <ListBox theme="default">
          <List aria-labelledby={accessId}>
            <ToggleListItem title="Fade instead" caption={fade ? "A 0.20 s fade when motion is off" : "No transition when motion is off"}
              checked={fade} onCheckedChange={setFade} />
          </List>
        </ListBox>
      </Stack>
    </AppShell>
  );
}
