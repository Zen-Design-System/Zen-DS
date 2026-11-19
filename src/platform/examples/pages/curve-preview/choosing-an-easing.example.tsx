import { useState } from "react";
import { CurvePreview, Segmented, Stack, Text, type CurvePreviewType } from "@zen-ds/react";

/** A Segmented picks the curve and the preview shows it: the choice lives in the control, not the picture. */
export default function ChooseEasing() {
  const [choice, setChoice] = useState("ease-out");
  return (
    <Stack gap="xs" maxWidth={320}>
      <Segmented aria-label="Easing" size="sm" fullWidth value={choice} onValueChange={setChoice} options={[{ id: "ease-out", label: "Ease out" }, { id: "ease-in-out", label: "Ease in and out" }]} />
      <CurvePreview type={choice as CurvePreviewType} />
      <Text tone="base" textStyle="Body/Small/Regular">{choice === "ease-out" ? "Starts fast and slows into place: for surfaces entering the screen." : "Starts and ends slowly: for something moving across the screen."}</Text>
    </Stack>
  );
}
