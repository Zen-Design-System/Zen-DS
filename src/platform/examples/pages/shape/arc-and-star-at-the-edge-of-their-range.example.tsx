import type { ReactNode } from "react";
import { Box, Shape, Stack, Text } from "@zen-ds/react";

/** One cell of the limits row: the layer's 72 × 72 box outlined, the shape in it, its setting below. */
function Limit({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <Stack gap="xs" align="center">
      <Box width={72} height={72}>
        <Shape position="absolute" insetLeft={0} insetTop={0} width={72} height={72} fill="none" stroke="neutral-subtle" />
        {children}
      </Box>
      <Text textStyle="Caption/Medium" tone="light">{caption}</Text>
    </Stack>
  );
}

/** What the arc and star handles draw at their limits. */
export default function ShapeLimits() {
  return (
    <Stack direction="row" gap="lg" wrap>
      <Limit caption="Sweep 0 %">
        <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} arcSweep={0} fill="accent-solid" />
      </Limit>
      <Limit caption="Ratio 96 %">
        <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} arcRatio={96} fill="accent-solid" />
      </Limit>
      <Limit caption="Star, ratio 10 %">
        <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} pointCount={16} starRatio={10} fill="support-yellow-solid" />
      </Limit>
      <Limit caption="Star, ratio 0 %">
        <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={72} height={72} pointCount={16} starRatio={0} fill="none" stroke="support-yellow-solid" strokeWeight={2} strokeAlign="center" />
      </Limit>
    </Stack>
  );
}
