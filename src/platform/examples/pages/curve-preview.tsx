import { useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { Accordion } from "../../../components/Accordion";
import { Card } from "../../../components/Card";
import { CurvePreview, type CurvePreviewType } from "../../../components/CurvePreview";
import { Divider } from "../../../components/Divider";
import { SelectField } from "../../../components/Input";
import { Grid, Stack } from "../../../components/Layout";
import { Segmented } from "../../../components/Segmented";
import { SliderField } from "../../../components/SliderField";
import { Heading, Text } from "../../../components/Text";
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
    <Card theme="flat" spacing="sm" maxWidth={360}>
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

/* ───────────── 6. Mobile: the same settings in a sheet-like screen ───────────── */

function PhoneMotionExample() {
  const [type, setType] = useState<CurvePreviewType>("bounce");
  const [bounce, setBounce] = useState(0.7);
  return (
    <PlatformPhone label="Transition" header={<TopNavigation type="compact-alt" title="Transition" />}>
      <Stack gap="xs" padding="lg">
        {/* The preview takes the phone's width; its height stays 176. */}
        <CurvePreview type={type} bounce={isSpring(type) ? bounce : undefined} />
        <SelectField layout="inline" label="Type" value={type} onValueChange={(value) => setType(value as CurvePreviewType)} options={curveOptions} />
        {isSpring(type) ? <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} /> : null}
      </Stack>
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
    description: "The same rows on a phone: the preview takes the screen's width and keeps its 176 height, so the overshoot stays readable.",
    render: () => <PhoneMotionExample />,
    code: `<CurvePreview type={type} bounce={isSpring ? bounce : undefined} />
<SelectField layout="inline" label="Type" value={type} onValueChange={setType} options={curveOptions} />
<SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} />`,
    screen: true,
  },
]);
