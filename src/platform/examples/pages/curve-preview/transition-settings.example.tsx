import { useState } from "react";
import { Accordion, Card, CurvePreview, Divider, Heading, SelectField, SliderField, Stack, Text, type CurvePreviewType } from "@zen-ds/react";

const curveOptions: Array<{ value: CurvePreviewType; label: string }> = [
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in and out" },
];
const seconds = (value: number) => `${value.toFixed(2)} s`;
const isSpring = (type: CurvePreviewType) => type === "spring" || type === "bounce";

/** Transition settings in a property panel: the preview above the settings it shows, taking the same values. */
export default function TransitionSettings() {
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
            {/* Ease curves have no bounce, so the row goes away for them. */}
            {isSpring(type) ? <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} /> : null}
          </Stack>
        </Accordion>
      </Stack>
    </Card>
  );
}
