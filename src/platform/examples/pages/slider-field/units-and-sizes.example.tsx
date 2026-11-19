import { SliderField, Stack, Text } from "@zen-ds/react";

const px = (value: number) => `${value} px`;
const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Units, accent and small rows. */
export default function UnitsAndSizes() {
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
