import { useId, useState } from "react";
import { Accordion, Card, ColorField, Divider, Heading, InputField, SliderField, Stack, Text } from "@zen-ds/react";

const px = (value: number) => `${value} px`;
const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Small sections in a panel: the layer settings of a social banner. */
export default function LayerSettings() {
  const titleId = useId();
  const [width, setWidth] = useState("1200 px");
  const [height, setHeight] = useState("630 px");
  const [fill, setFill] = useState("#1F6FEB");
  const [opacity, setOpacity] = useState(0.9);
  const [radius, setRadius] = useState(16);
  const [blur, setBlur] = useState(0);
  return (
    <Card theme="default" maxWidth={320} as="section" aria-labelledby={titleId}>
      <Stack gap="none">
        <Stack gap="xs" paddingY="md">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Social banner</Heading>
          <Text tone="base" textStyle="Body/Small/Regular">Loyalty app launch · 1200 × 630</Text>
        </Stack>
        <Divider />
        {/* Small: Body/Base/Bold titles under the panel heading; Title → rows stays 12, one step above the rows' 8. */}
        <Accordion size="sm" headingLevel={5} title="Size" defaultExpanded contentWidth="full">
          <Stack gap="xs">
            <InputField layout="inline" size="sm" label="Width" value={width} onValueChange={setWidth} />
            <InputField layout="inline" size="sm" label="Height" value={height} onValueChange={setHeight} />
          </Stack>
        </Accordion>
        <Accordion size="sm" headingLevel={5} title="Fill" defaultExpanded contentWidth="full">
          <Stack gap="xs">
            <ColorField layout="inline" size="sm" label="Colour" value={fill} onValueChange={setFill} savedColors={["#1F6FEB", "#111111", "#FFFFFF"]} />
            <SliderField size="sm" label="Opacity" value={opacity} onValueChange={setOpacity} min={0} max={1} step={0.01} formatValue={percent} />
          </Stack>
        </Accordion>
        <Accordion size="sm" headingLevel={5} title="Corners and blur" contentWidth="full">
          <Stack gap="xs">
            <SliderField size="sm" label="Corner Radius" value={radius} onValueChange={setRadius} min={0} max={48} formatValue={px} />
            <SliderField size="sm" label="Background Blur" value={blur} onValueChange={setBlur} min={0} max={40} formatValue={px} />
          </Stack>
        </Accordion>
      </Stack>
    </Card>
  );
}
