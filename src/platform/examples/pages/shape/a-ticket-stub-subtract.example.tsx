import { Box, Shape, Stack, Text } from "@zen-ds/react";

/** A boolean group: a rounded rectangle minus two circles at its edges; d is their combined outline. */
export default function TicketStub() {
  return (
    <Box width={240} height={96}>
      <Shape type="boolean" operation="subtract" position="absolute" insetLeft={0} insetTop={0} width={240} height={96} d="M 228 0 L 12 0 C 5.373 0 0 5.373 0 12 L 0 36 C 6.627 36 12 41.373 12 48 C 12 54.627 6.627 60 0 60 L 0 84 C 0 90.627 5.373 96 12 96 L 228 96 C 234.627 96 240 90.627 240 84 L 240 60 C 233.373 60 228 54.627 228 48 C 228 41.373 233.373 36 240 36 L 240 12 C 240 5.373 234.627 0 228 0 Z" viewBox="0 0 240 96" fillRule="evenodd" fill="support-orange-subtle">
        <Shape type="rectangle" position="absolute" insetLeft={0} insetTop={0} width={240} height={96} radius="md" />
        <Shape type="ellipse" position="absolute" insetLeft={-12} insetTop={36} width={24} height={24} />
        <Shape type="ellipse" position="absolute" insetLeft={228} insetTop={36} width={24} height={24} />
      </Shape>
      <Box position="absolute" insetLeft={24} insetTop={20}><Stack gap="2xs"><Text textStyle="Body/Small/Bold">Phin & Co tasting</Text><Text tone="base">Sat, Nov 2 · 10:00</Text></Stack></Box>
    </Box>
  );
}
