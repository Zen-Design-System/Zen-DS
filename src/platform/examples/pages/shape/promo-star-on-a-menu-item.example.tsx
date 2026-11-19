import { Card, Shape, Stack, Text } from "@zen-ds/react";

/** A Star behind the discount: decoration on a Subtle fill under Strongest text. */
export default function PromoStar() {
  return (
    <Card theme="default">
      <Stack direction="row" gap="md" align="center">
        <Stack width={64} height={64} align="center" justify="center">
          <Shape type="star" position="absolute" pointCount={12} starRatio={80} width="fill" height="fill" fill="support-yellow-subtle" />
          <Text textStyle="Body/Small/Bold">−20%</Text>
        </Stack>
        <Stack gap="2xs">
          <Text textStyle="Body/Base/Bold">Cà phê muối</Text>
          <Text tone="base">$3.00 · $2.40 today</Text>
        </Stack>
      </Stack>
    </Card>
  );
}
