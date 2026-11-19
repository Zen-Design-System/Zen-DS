import { useState } from "react";
import { Card, Heading, Segmented, SliderField, Stack } from "@zen-ds/react";

const seconds = (value: number) => `${value.toFixed(2)} s`;

/** A curve's settings with other inline rows. */
export default function MotionSettings() {
  const [type, setType] = useState("time");
  const [duration, setDuration] = useState(0.5);
  const [bounce, setBounce] = useState(0.04);
  const [stiffness, setStiffness] = useState(320);
  return (
    <Card theme="default" maxWidth={360}>
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
