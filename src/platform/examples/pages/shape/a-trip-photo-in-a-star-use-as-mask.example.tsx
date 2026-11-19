import { Box, Shape, Stack, Text } from "@zen-ds/react";
import { photos } from "../../data";

const santorini = photos.site[3];

/** A mask group: the Star is the mask, the photo above it shows only inside the star. */
export default function TripPhotoInStar() {
  return (
    <Stack direction="row" gap="md" align="center">
      <Box group mask width={120} height={120} role="img" aria-label="Santorini">
        <Shape type="star" position="absolute" insetLeft={0} insetTop={0} width={120} height={120} pointCount={8} starRatio={78} />
        <Box image={santorini.src} position="absolute" insetLeft={0} insetTop={0} width={120} height={120} />
      </Box>
      <Stack gap="2xs">
        <Text textStyle="Body/Base/Bold">Santorini, 4 nights</Text>
        <Text tone="base">From $1,280</Text>
        <Text tone="base">Oct 12–16</Text>
      </Stack>
    </Stack>
  );
}
