import { Box, Shape, Stack, Text } from "@zen-ds/react";

/** Phin & Co's splash mark: two ring segments (an ellipse arc each) turned around a full circle. */
export default function SplashMark() {
  return (
    <Stack direction="row" gap="lg" align="center">
      <Box width={120} height={120}>
        <Shape type="ellipse" position="absolute" insetLeft={0} insetTop={0} width={120} height={120} arcStart={135} arcSweep={75} arcRatio={82} fill="support-orange-solid" />
        <Shape type="ellipse" position="absolute" insetLeft={18} insetTop={18} width={84} height={84} arcStart={315} arcSweep={50} arcRatio={70} fill="support-orange-rich" />
        <Shape type="ellipse" position="absolute" insetLeft={40} insetTop={40} width={40} height={40} fill="support-brown-solid" />
      </Box>
      <Stack gap="2xs">
        <Text textStyle="Body/Base/Bold">Phin & Co</Text>
        <Text tone="base">Loyalty app splash</Text>
      </Stack>
    </Stack>
  );
}
