import { useState } from "react";
import { CurvePreview, SliderField, Stack, Text } from "@zen-ds/react";

/** The preview follows the Bounce slider and is named after its value, so a screen reader hears the change too. */
export default function BounceSetting() {
  const [bounce, setBounce] = useState(0.3);
  return (
    <Stack gap="xs" maxWidth={320}>
      <CurvePreview type="spring" bounce={bounce} aria-label={`Motion curve: Spring, bounce ${bounce.toFixed(2)}`} />
      <SliderField label="Bounce" value={bounce} onValueChange={setBounce} min={0} max={0.9} step={0.01} theme="accent" />
      <Text tone="base" textStyle="Body/Small/Regular">0 settles without overshooting; higher values overshoot the target and swing back before they settle.</Text>
    </Stack>
  );
}
