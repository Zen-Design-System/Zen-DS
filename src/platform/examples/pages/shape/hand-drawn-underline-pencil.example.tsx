import { Heading, Shape, Stack } from "@zen-ds/react";

/** A Pencil stroke under a headline: a vector drawn in its own box (viewBox), stretched to its width. */
export default function HandDrawnUnderline() {
  return (
    <Stack gap="2xs">
      <Heading level={3} textStyle="Heading/4">Brew the perfect phin</Heading>
      <Shape type="vector" width={220} height={12} d="M 0 8 C 40 2 80 2 120 6 C 150 9 185 10 220 4" viewBox="0 0 220 12" strokeWeight={3} stroke="accent-solid" />
    </Stack>
  );
}
