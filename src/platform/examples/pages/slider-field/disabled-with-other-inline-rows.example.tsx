import { useState } from "react";
import { Button, ColorField, InputField, SliderField, Stack, Text } from "@zen-ds/react";

/** Disabled and mixed rows. */
export default function DisabledInlineRows() {
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
