import { useId, useRef, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { Accordion } from "../../../components/Accordion";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell } from "../../../components/AppShell";
import { Card } from "../../../components/Card";
import { CurvePreview, type CurvePreviewType } from "../../../components/CurvePreview";
import { Divider } from "../../../components/Divider";
import { DockIcon } from "../../../components/DockIcon";
import { SelectField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem, ToggleListItem } from "../../../components/ListItem";
import { Segmented } from "../../../components/Segmented";
import { SliderField } from "../../../components/SliderField";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "curve-preview";

const curveOptions: Array<{ value: CurvePreviewType; label: string }> = [
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in and out" },
];
const seconds = (value: number) => `${value.toFixed(2)} s`;
const isSpring = (type: CurvePreviewType) => type === "spring" || type === "bounce";

/* ───────────── 1. Transition settings in a property panel ───────────── */

function TransitionPanelExample() {
  const [type, setType] = useState<CurvePreviewType>("spring");
  const [duration, setDuration] = useState(0.5);
  const [bounce, setBounce] = useState(0.3);
  return (
    <Card theme="default" maxWidth={360}>
      <Stack gap="none">
        <Stack gap="xs" paddingY="md">
          <Heading level={3} textStyle="Heading/4">Photo Stack</Heading>
          <Text tone="base" textStyle="Body/Small/Regular">How the back photo slides in.</Text>
        </Stack>
        <Divider />
        <Accordion title="Transition" defaultExpanded contentWidth="full">
          <Stack gap="xs">
            <CurvePreview type={type} bounce={isSpring(type) ? bounce : undefined} />
            <SelectField layout="inline" label="Type" value={type} onValueChange={(value) => setType(value as CurvePreviewType)} options={curveOptions} />
            <SliderField label="Duration" value={duration} onValueChange={setDuration} min={0.1} max={2} step={0.01} formatValue={seconds} />
            {isSpring(type) ? <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} /> : null}
          </Stack>
        </Accordion>
      </Stack>
    </Card>
  );
}

/* ───────────── 2. The four types side by side ───────────── */

function TypesExample() {
  return (
    <Grid columns={2} gap="md" maxWidth={560} stackBelow={400}>
      {curveOptions.map((option) => (
        <Stack key={option.value} gap="xs">
          <CurvePreview type={option.value} />
          <Text as="span" textStyle="Body/Small/Medium" tone="base">{option.label}</Text>
        </Stack>
      ))}
    </Grid>
  );
}

/* ───────────── 3. Bounce follows the setting ───────────── */

function BounceExample() {
  const [bounce, setBounce] = useState(0.3);
  return (
    <Stack gap="xs" maxWidth={320}>
      <CurvePreview type="spring" bounce={bounce} aria-label={`Motion curve: Spring, bounce ${bounce.toFixed(2)}`} />
      <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} theme="accent" />
      <Text tone="base" textStyle="Body/Small/Regular">0 settles without overshooting; higher values overshoot the target and swing back before they settle.</Text>
    </Stack>
  );
}

/* ───────────── 4. Choosing between two curves ───────────── */

function CompareExample() {
  const [choice, setChoice] = useState("ease-out");
  return (
    <Stack gap="xs" maxWidth={320}>
      <Segmented aria-label="Easing" size="sm" fullWidth value={choice} onValueChange={setChoice} options={[{ id: "ease-out", label: "Ease out" }, { id: "ease-in-out", label: "Ease in and out" }]} />
      <CurvePreview type={choice as CurvePreviewType} />
      <Text tone="base" textStyle="Body/Small/Regular">{choice === "ease-out" ? "Starts fast and slows into place: for surfaces entering the screen." : "Starts and ends slowly: for something moving across the screen."}</Text>
    </Stack>
  );
}

/* ───────────── 5. Transition off: no curve to show ───────────── */

function TransitionOffExample() {
  const [type, setType] = useState("none");
  const on = type !== "none";
  return (
    <Stack gap="xs" maxWidth={320}>
      <SelectField layout="inline" label="Transition" value={type} onValueChange={setType} options={[{ value: "none", label: "None" }, ...curveOptions]} />
      {on ? <CurvePreview type={type as CurvePreviewType} /> : <Text tone="base" textStyle="Body/Small/Regular">No transition: the back photo appears at once.</Text>}
      <SliderField label="Duration" defaultValue={0.5} min={0.1} max={2} step={0.01} formatValue={seconds} disabled={!on} />
    </Stack>
  );
}

/* ───────────── 6. Mobile: the same settings on a prototype's phone screen ───────────── */

function PhoneMotionExample() {
  const { toast } = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
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
    // A pushed screen of the Loyalty app prototype: the compact bar with Back, the interaction it belongs to, the curve
    // over its settings in one flat block on the grey Canvas, what Reduce Motion gets instead, and Preview / Apply
    // pinned in the Action bar (Figma Bottom=Actions).
    <PlatformPhone label="Transition" canvas="default" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title="Transition" scrollRef={screenRef}
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
              <ToggleListItem title="Fade instead" caption={fade ? "A 0.20\u00a0s fade when motion is off" : "No transition when motion is off"}
                checked={fade} onCheckedChange={setFade} />
            </List>
          </ListBox>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Transition settings",
    description: "The preview sits above the settings it shows and takes the same values: change Type or Bounce and the curve follows at once. Ease curves have no bounce, so that row goes away for them.",
    render: () => <TransitionPanelExample />,
    code: `<Accordion title="Transition" defaultExpanded contentWidth="full">
  <Stack gap="xs">
    <CurvePreview type={type} bounce={isSpring ? bounce : undefined} />
    <SelectField layout="inline" label="Type" value={type} onValueChange={setType} options={curveOptions} />
    <SliderField label="Duration" value={duration} onValueChange={setDuration} min={0.1} max={2} step={0.01} formatValue={(v) => \`\${v.toFixed(2)} s\`} />
    {isSpring && <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} />}
  </Stack>
</Accordion>`,
  },
  {
    title: "The four types",
    description: "Spring overshoots a little and settles, Bounce swings visibly, Ease out (Motion/Ease/Emphasized) starts fast and slows into place, Ease in and out is slow at both ends.",
    render: () => <TypesExample />,
    code: `<Grid columns={2} gap="md">
  <CurvePreview type="spring" />
  <CurvePreview type="bounce" />
  <CurvePreview type="ease-out" />
  <CurvePreview type="ease-in-out" />
</Grid>`,
  },
  {
    title: "Bounce follows the setting",
    description: "bounce is the same 0–1 number as the Bounce row: the damping ratio is 1 − bounce. Name the preview after the value when it changes, so a screen reader hears it too.",
    render: () => <BounceExample />,
    code: `<CurvePreview type="spring" bounce={bounce} aria-label={\`Motion curve: Spring, bounce \${bounce.toFixed(2)}\`} />
<SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} theme="accent" />`,
  },
  {
    title: "Choosing an easing",
    description: "A Segmented picks the curve and the preview shows it, with one line on when each one fits. The preview is a picture: the choice lives in the control above it.",
    render: () => <CompareExample />,
    code: `<Segmented aria-label="Easing" size="sm" fullWidth value={choice} onValueChange={setChoice}
  options={[{ id: "ease-out", label: "Ease out" }, { id: "ease-in-out", label: "Ease in and out" }]} />
<CurvePreview type={choice} />`,
  },
  {
    title: "Transition off",
    description: "With no transition there is no curve: instead of an empty plot, one line says what happens, and Duration is disabled until a curve is picked again.",
    render: () => <TransitionOffExample />,
    code: `<SelectField layout="inline" label="Transition" value={type} onValueChange={setType} options={[{ value: "none", label: "None" }, ...curveOptions]} />
{type === "none"
  ? <Text tone="base" textStyle="Body/Small/Regular">No transition: the back photo appears at once.</Text>
  : <CurvePreview type={type} />}
<SliderField label="Duration" defaultValue={0.5} min={0.1} max={2} step={0.01} disabled={type === "none"} />`,
  },
  {
    title: "Motion settings on a phone",
    description: "The same rows on a phone screen of a prototype, in the AppShell's mobile Bar with Preview and Apply transition in the Action bar. The preview takes the block's width and keeps its 176 height, so the overshoot stays readable; Type, Duration and Bounce change the curve at once, and Reduce Motion says what people who turn motion off get instead.",
    render: () => <PhoneMotionExample />,
    code: `<PlatformPhone canvas="default" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title="Transition" scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
    actionBar={<ActionBar direction="horizontal"
      secondaryAction={{ label: "Preview", onClick: preview }}
      primaryAction={{ label: "Apply transition", onClick: apply }} />}
  >
    {/* The Body pads the screen and spaces its sections */}
    <Card theme="default">
      <Stack gap="xs">
        <CurvePreview type={type} bounce={isSpring ? bounce : undefined} />
        <SelectField layout="inline" label="Type" value={type} onValueChange={setType} options={curveOptions} />
        <SliderField label="Duration" value={duration} onValueChange={setDuration} min={0.1} max={2} step={0.01} formatValue={seconds} />
        {isSpring && <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} />}
      </Stack>
    </Card>
    <ListBox theme="default">
      <List aria-label="Reduce Motion">
        <ToggleListItem title="Fade instead" caption="A 0.20 s fade when motion is off" checked={fade} onCheckedChange={setFade} />
      </List>
    </ListBox>
  </AppShell>
</PlatformPhone>`,
  },
]);
