import { useId, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone } from "../../PlatformPhone";
import { platformMedia } from "../../PlatformMedia";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell } from "../../../components/AppShell";
import { Accordion } from "../../../components/Accordion";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Divider } from "../../../components/Divider";
import { Image } from "../../../components/Image";
import { ColorField, InputField } from "../../../components/Input";
import { Stack } from "../../../components/Layout";
import { Segmented } from "../../../components/Segmented";
import { SliderField } from "../../../components/SliderField";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
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
    <Card theme="flat" maxWidth={360}>
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
    <Card theme="flat" maxWidth={360}>
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

type Adjustments = { brightness: number; contrast: number; warmth: number; saturation: number };
/** The photo as it was shot, and Gia's edit in progress, where the screen opens. */
const noAdjustments: Adjustments = { brightness: 0, contrast: 0, warmth: 0, saturation: 0 };
const giasEdit: Adjustments = { brightness: 0.1, contrast: 0.2, warmth: -0.1, saturation: 0.15 };
const signed = (value: number) => `${value > 0 ? "+" : ""}${Math.round(value * 100)}`;
/** The edit as CSS filters on the preview: warmer leans sepia, cooler turns the hue towards blue. */
const filterOf = ({ brightness, contrast, warmth, saturation }: Adjustments) => [
  `brightness(${1 + brightness * 0.6})`,
  `contrast(${1 + contrast * 0.6})`,
  `saturate(${1 + saturation})`,
  warmth > 0 ? `sepia(${warmth * 0.5})` : `hue-rotate(${warmth * 24}deg)`,
].join(" ");
const photo = platformMedia.feed[1];

function PhoneAdjustExample() {
  const { toast } = useToast();
  const lightId = useId();
  const colourId = useId();
  const [edit, setEdit] = useState<Adjustments>(giasEdit);
  const [saved, setSaved] = useState<Adjustments>(noAdjustments);
  const set = (key: keyof Adjustments) => (value: number) => setEdit((current) => ({ ...current, [key]: value }));
  const changed = (Object.keys(edit) as (keyof Adjustments)[]).some((key) => edit[key] !== saved[key]);
  const close = () => {
    const before = edit;
    setEdit(saved);
    toast(changed
      ? { title: "Changes discarded", children: photo.alt, action: { label: "Undo", onClick: () => setEdit(before) } }
      : { title: "No changes to discard", children: "The photo is as it was saved." });
  };
  return (
    // Media + Actions: the photo being edited is the backdrop and follows every slider; a Surface sheet rises over it
    // with the rows, and Save waits in the Action bar. A task screen, so Close instead of Back and no bottom bar.
    <PlatformPhone label="Adjust" canvas="surface" statusBar="light">
      <AppShell mobileTop="media"
        backdrop={<Image src={photo.src} alt={photo.alt} radius="none" loading="eager" style={{ filter: filterOf(edit) }} />}
        topNavigation={<TopNavigation title="Adjust"
          leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }}
          trailing={[{ icon: "icon-refresh-ccw-01-line", label: "Reset adjustments", onClick: () => {
            const before = edit;
            setEdit(noAdjustments);
            toast({ title: "Adjustments reset", children: "The photo shows as it was shot.", action: { label: "Undo", onClick: () => setEdit(before) } });
          } }]} />}
        actionBar={<ActionBar
          summary={<Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{changed ? "Unsaved changes" : "No changes to save"}</Text>}
          primaryAction={{ label: "Save photo", disabled: !changed, onClick: () => { setSaved(edit); toast({ type: "positive", title: "Photo saved", children: "Brand refresh moodboard · Saola Outdoor" }); } }} />}
      >
        <Stack gap="lg">
          <Stack gap="2xs">
            <Heading level={2} textStyle="Heading/4">Creek in the forest</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Brand refresh moodboard · Shot by Gia Pham</Text>
          </Stack>
          {/* Touch: drag along a row to scrub, tap it to type. Medium rows stay 40px tall on a phone. */}
          <Stack as="section" gap="xs" aria-labelledby={lightId}>
            <Heading level={3} id={lightId} textStyle="Body/Small/Bold" tone="light">Light</Heading>
            <SliderField label="Brightness" value={edit.brightness} onValueChange={set("brightness")} min={-1} max={1} step={0.01} formatValue={signed} />
            <SliderField label="Contrast" value={edit.contrast} onValueChange={set("contrast")} min={-1} max={1} step={0.01} formatValue={signed} />
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={colourId}>
            <Heading level={3} id={colourId} textStyle="Body/Small/Bold" tone="light">Colour</Heading>
            <SliderField label="Warmth" value={edit.warmth} onValueChange={set("warmth")} min={-1} max={1} step={0.01} formatValue={signed} theme="accent" />
            <SliderField label="Saturation" value={edit.saturation} onValueChange={set("saturation")} min={-1} max={1} step={0.01} formatValue={signed} />
          </Stack>
        </Stack>
      </AppShell>
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
    description: "Gia retouches a moodboard photo for Saola Outdoor in the studio's phone app. The photo is the screen's backdrop and follows every row; drag along a row to scrub, tap it to type. Signed values show their sign, and the rows stay Medium (40px) on a phone. Save photo in the Action bar works once something changed; Close and Reset offer Undo.",
    render: () => <PhoneAdjustExample />,
    code: `<PlatformPhone canvas="surface" statusBar="light">
  <AppShell mobileTop="media"
    backdrop={<Image src={photo.src} alt={photo.alt} radius="none" style={{ filter: filterOf(edit) }} />}
    topNavigation={<TopNavigation title="Adjust"
      leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }}
      trailing={[{ icon: "icon-refresh-ccw-01-line", label: "Reset adjustments", onClick: reset }]} />}
    actionBar={<ActionBar summary={changed ? "Unsaved changes" : "No changes to save"}
      primaryAction={{ label: "Save photo", disabled: !changed, onClick: save }} />}
  >
    <Stack as="section" gap="xs" aria-labelledby="light">
      <Heading level={3} id="light" textStyle="Body/Small/Bold" tone="light">Light</Heading>
      <SliderField label="Brightness" value={edit.brightness} onValueChange={set("brightness")} min={-1} max={1} step={0.01}
        formatValue={(v) => \`\${v > 0 ? "+" : ""}\${Math.round(v * 100)}\`} />
      <SliderField label="Contrast" value={edit.contrast} onValueChange={set("contrast")} min={-1} max={1} step={0.01} formatValue={signed} />
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
]);
