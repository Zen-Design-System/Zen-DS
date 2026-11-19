import { CurvePreview, Grid, Stack, Text, type CurvePreviewType } from "@zen-ds/react";

const curveOptions: Array<{ value: CurvePreviewType; label: string }> = [
  { value: "spring", label: "Spring" },
  { value: "bounce", label: "Bounce" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in and out" },
];

/** The four curve types side by side, two per row (one under 400 px). */
export default function CurveTypes() {
  return (
    <Grid columns={2} gap="md" maxWidth={560} stackBelow={400}>
      {curveOptions.map((option) => (
        <Stack key={option.value} gap="xs">
          <CurvePreview type={option.value} />
          <Text as="span" textStyle="Body/Small/Medium" tone="base">{option.label}</Text>
        </Stack>
      ))}
    </Grid>
  );
}
