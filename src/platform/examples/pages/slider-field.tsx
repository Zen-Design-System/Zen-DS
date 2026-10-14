import { useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { Accordion } from "../../../components/Accordion";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Divider } from "../../../components/Divider";
import { ColorField, InputField } from "../../../components/Input";
import { Stack } from "../../../components/Layout";
import { Segmented } from "../../../components/Segmented";
import { SliderField } from "../../../components/SliderField";
import { Heading, Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "slider-field";

const px = (value: number) => `${value} px`;
const seconds = (value: number) => `${value.toFixed(2)} s`;
const percent = (value: number) => `${Math.round(value * 100)}%`;

/* ───────────── 1. Photo layout: a property panel's numbers ───────────── */

function PhotoLayoutExample() {
  const [offsetX, setOffsetX] = useState(239);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(0.7);
  const [opacity, setOpacity] = useState(0.6);
  return (
    <Card theme="flat" spacing="sm" maxWidth={360}>
      <Stack gap="none">
        <Stack gap="xs" paddingY="md">
          <Heading level={3} textStyle="Heading/4">Photo Stack</Heading>
          <Text tone="base" textStyle="Body/Small/Regular">The back photo sits behind the front one.</Text>
        </Stack>
        <Divider />
        <Accordion title="Back Photo" defaultExpanded contentWidth="full">
          <Stack gap="xs">
            <SliderField label="Offset X" value={offsetX} onValueChange={setOffsetX} min={0} max={400} formatValue={px} />
            <SliderField label="Offset Y" value={offsetY} onValueChange={setOffsetY} min={0} max={400} formatValue={px} />
            <SliderField label="Scale" value={scale} onValueChange={setScale} min={0.2} max={1.5} step={0.01} />
            <SliderField label="Overlay Opacity" value={opacity} onValueChange={setOpacity} min={0} max={1} step={0.01} formatValue={percent} />
          </Stack>
        </Accordion>
      </Stack>
    </Card>
  );
}

/* ───────────── 2. Motion: a curve's settings with other inline rows ───────────── */

function MotionExample() {
  const [type, setType] = useState("time");
  const [duration, setDuration] = useState(0.5);
  const [bounce, setBounce] = useState(0.04);
  const [stiffness, setStiffness] = useState(320);
  return (
    <Card theme="flat" spacing="sm" maxWidth={360}>
      <Stack gap="xs">
        <Heading level={3} textStyle="Heading/4">Transition Spring</Heading>
        <Segmented aria-label="Spring type" size="sm" fullWidth value={type} onValueChange={setType} options={[{ id: "time", label: "Time" }, { id: "physics", label: "Physics" }]} />
        {type === "time" ? (
          <>
            <SliderField label="Duration" value={duration} onValueChange={setDuration} min={0.1} max={2} step={0.01} formatValue={seconds} />
            <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={1} step={0.01} />
          </>
        ) : (
          <SliderField label="Stiffness" value={stiffness} onValueChange={setStiffness} min={50} max={1000} step={10} theme="accent" />
        )}
      </Stack>
    </Card>
  );
}

/* ───────────── 3. Units, accent and small rows ───────────── */

function UnitsExample() {
  return (
    <Stack gap="lg" maxWidth={320}>
      <Stack gap="xs">
        <Text as="span" textStyle="Body/Small/Medium" tone="base">Shadow · Medium</Text>
        <SliderField label="Blur" defaultValue={24} min={0} max={80} formatValue={px} />
        <SliderField label="Spread" defaultValue={-4} min={-20} max={20} formatValue={px} />
        <SliderField label="Opacity" defaultValue={0.3} min={0} max={1} step={0.01} formatValue={percent} theme="accent" />
      </Stack>
      <Stack gap="xs">
        <Text as="span" textStyle="Body/Small/Medium" tone="base">Grid · Small</Text>
        <SliderField size="sm" label="Columns" defaultValue={12} min={1} max={24} />
        <SliderField size="sm" label="Rotation" defaultValue={45} min={0} max={360} formatValue={(value) => `${value}°`} />
      </Stack>
    </Stack>
  );
}

/* ───────────── 4. Disabled and mixed rows ───────────── */

function StatesExample() {
  const [locked, setLocked] = useState(true);
  return (
    <Stack gap="xs" maxWidth={320}>
      <InputField layout="inline" label="Layer" defaultValue="Back Photo" />
      <ColorField layout="inline" label="Tint" defaultValue="#000000" />
      <SliderField label="Opacity" defaultValue={0.6} min={0} max={1} step={0.01} disabled={locked} />
      <Text tone="base" textStyle="Body/Small/Regular">{locked ? "Unlock the layer to change its opacity." : "The layer is unlocked."}</Text>
      <Button level="tertiary" size="sm" onClick={() => setLocked(!locked)}>{locked ? "Unlock layer" : "Lock layer"}</Button>
    </Stack>
  );
}

/* ───────────── 5. Mobile: photo adjustments by touch ───────────── */

function PhoneAdjustExample() {
  const [brightness, setBrightness] = useState(0.1);
  const [contrast, setContrast] = useState(0.2);
  const [warmth, setWarmth] = useState(-0.1);
  const signed = (value: number) => `${value > 0 ? "+" : ""}${Math.round(value * 100)}`;
  return (
    <PlatformPhone label="Adjust" header={<TopNavigation type="compact-alt" title="Adjust" />}>
      <Stack gap="xs" padding="lg">
        {/* Touch: drag along the row to scrub, tap to type. Medium rows stay 40px tall on a phone. */}
        <SliderField label="Brightness" value={brightness} onValueChange={setBrightness} min={-1} max={1} step={0.01} formatValue={signed} />
        <SliderField label="Contrast" value={contrast} onValueChange={setContrast} min={-1} max={1} step={0.01} formatValue={signed} />
        <SliderField label="Warmth" value={warmth} onValueChange={setWarmth} min={-1} max={1} step={0.01} formatValue={signed} theme="accent" />
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Photo layout",
    description: "The numbers of a property panel: offsets in px, a scale and an opacity. Drag a row to scrub, click it (or press Enter) to type an exact number; the fill shows where the value sits between min and max.",
    render: () => <PhotoLayoutExample />,
    code: `<Accordion title="Back Photo" defaultExpanded contentWidth="full">
  <Stack gap="xs">
    <SliderField label="Offset X" value={offsetX} onValueChange={setOffsetX} min={0} max={400} formatValue={(v) => \`\${v} px\`} />
    <SliderField label="Scale" value={scale} onValueChange={setScale} min={0.2} max={1.5} step={0.01} />
    <SliderField label="Overlay Opacity" value={opacity} onValueChange={setOpacity} min={0} max={1} step={0.01}
      formatValue={(v) => \`\${Math.round(v * 100)}%\`} />
  </Stack>
</Accordion>`,
  },
  {
    title: "Motion settings",
    description: "A Segmented switches the spring's model and the rows follow: Duration and Bounce for Time, Stiffness for Physics. Seconds keep two decimals through formatValue.",
    render: () => <MotionExample />,
    code: `<Segmented aria-label="Spring type" size="sm" fullWidth value={type} onValueChange={setType}
  options={[{ id: "time", label: "Time" }, { id: "physics", label: "Physics" }]} />
{type === "time"
  ? <SliderField label="Duration" value={duration} onValueChange={setDuration} min={0.1} max={2} step={0.01} formatValue={(v) => \`\${v.toFixed(2)} s\`} />
  : <SliderField label="Stiffness" value={stiffness} onValueChange={setStiffness} min={50} max={1000} step={10} theme="accent" />}`,
  },
  {
    title: "Units and sizes",
    description: "px, %, degrees and a negative range (Spread −20 to 20 starts its fill at −20). Small rows (32px) for a dense grid panel; accent for the value that matters most.",
    render: () => <UnitsExample />,
    code: `<SliderField label="Spread" defaultValue={-4} min={-20} max={20} formatValue={(v) => \`\${v} px\`} />
<SliderField label="Opacity" defaultValue={0.3} min={0} max={1} step={0.01} theme="accent" formatValue={(v) => \`\${Math.round(v * 100)}%\`} />
<SliderField size="sm" label="Rotation" defaultValue={45} min={0} max={360} formatValue={(v) => \`\${v}°\`} />`,
  },
  {
    title: "Disabled, with other inline rows",
    description: "A SliderField sits with inline fields at the same height and label position. Disabled says why next to it, and the action that unlocks it is right there.",
    render: () => <StatesExample />,
    code: `<InputField layout="inline" label="Layer" defaultValue="Back Photo" />
<ColorField layout="inline" label="Tint" defaultValue="#000000" />
<SliderField label="Opacity" defaultValue={0.6} min={0} max={1} step={0.01} disabled={locked} />
<Text tone="base" textStyle="Body/Small/Regular">Unlock the layer to change its opacity.</Text>`,
  },
  {
    title: "Adjustments on a phone",
    description: "Photo adjustments by touch: drag along a row to scrub, tap to type. Signed values show their sign; the rows stay Medium (40px) on a phone.",
    render: () => <PhoneAdjustExample />,
    code: `<SliderField label="Brightness" value={brightness} onValueChange={setBrightness} min={-1} max={1} step={0.01}
  formatValue={(v) => \`\${v > 0 ? "+" : ""}\${Math.round(v * 100)}\`} />`,
    screen: true,
  },
]);
