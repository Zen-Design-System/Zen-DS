import { Card, Grid, Image, Stack, Text } from "@zen-ds/react";
import { photos } from "../../data";

/** A client's mascot with its backdrop removed, as it goes into the brand kit: on the default frame a faint Neutral/Pale
    square shows around the cut-out; frame={false} puts the picture on the card itself. */
export default function CutOutMascot() {
  const mascot = photos.food.mascot;
  return (
    <Grid columns={{ mobile: 1, desktop: "repeat(2, minmax(0, 1fr))" }} gap="md" maxWidth={640}>
      {[{ frame: true, caption: "Default frame: a pale square around the cut-out" }, { frame: false, caption: "frame={false}: the mascot on the card itself" }].map((item) => (
        <Card key={String(item.frame)} theme="default" as="section" aria-label={item.caption}>
          <Stack gap="sm" align="center">
            <Stack width={160}>
              <Image src={mascot.src} alt={mascot.alt} ratio="1:1" fit="contain" frame={item.frame} radius="none" />
            </Stack>
            <Text textStyle="Body/Small/Regular" tone="base" align="center">{item.caption}</Text>
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}
