import { useId, useState } from "react";
import { ActionBar, AppShell, Heading, Image, SliderField, Stack, Text, TopNavigation, useToast } from "@zen-ds/react";
import { photos } from "../../data";

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
const photo = photos.feed[1];

/** Photo adjustments by touch, in the studio's phone app. */
export default function AdjustmentsOnAPhone() {
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
  );
}
