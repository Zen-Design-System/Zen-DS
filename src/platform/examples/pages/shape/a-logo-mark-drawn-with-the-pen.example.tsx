import { Box, Shape, Stack, Text } from "@zen-ds/react";
import { studio } from "../../data";

/** A closed Pen path with a hole (fillRule evenodd), beside the studio's name. */
export default function PenLogoMark() {
  return (
    <Stack direction="row" gap="sm" align="center">
      <Box width={40} height={40}>
        <Shape type="vector" position="absolute" insetLeft={0} insetTop={0} width={40} height={40} d="M 20 0 C 31 0 40 9 40 20 C 40 31 31 40 20 40 C 9 40 0 31 0 20 C 0 9 9 0 20 0 Z M 20 10 L 30 20 L 20 30 L 10 20 Z" viewBox="0 0 40 40" fillRule="evenodd" fill="accent-solid" stroke="none" />
      </Box>
      <Text textStyle="Body/Base/Bold">{studio.name}</Text>
    </Stack>
  );
}
