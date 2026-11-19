import { useState } from "react";
import { Accordion, Card, Divider, Heading, SliderField, Stack, Text } from "@zen-ds/react";

const px = (value: number) => `${value} px`;
const percent = (value: number) => `${Math.round(value * 100)}%`;

/** A property panel's numbers. */
export default function PhotoLayout() {
  const [offsetX, setOffsetX] = useState(239);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(0.7);
  const [opacity, setOpacity] = useState(0.6);
  return (
    <Card theme="default" maxWidth={360}>
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
