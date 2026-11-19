import { useState } from "react";
import { CurvePreview, SelectField, SliderField, Stack, Text, type CurvePreviewType } from "@zen-ds/react";

const curveOptions: Array<{ value: CurvePreviewType; label: string }> = [
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in and out" },
];
const seconds = (value: number) => `${value.toFixed(2)} s`;

/** With no transition there is no curve: one line says what happens, and Duration waits for a curve. */
export default function TransitionOff() {
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
