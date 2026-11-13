import { useId, useState } from "react";
import { Card, Grid, Heading, IconButton, Image, SkeletonText, Stack, Text, VisuallyHidden, plural } from "@zen-ds/react";
import { photos } from "../../data";

const moodboard = photos.feed.slice(0, 6).map((photo, index) => ({
  ...photo,
  id: `photo-${index}`,
  addedBy: ["Gia Pham", "Emi Sato", "Linh Vo", "Gia Pham", "Alex Duong", "Emi Sato"][index],
  // Each picture arrives on its own; the grid never waits for the slowest one.
  delay: [500, 1400, 800, 2200, 1100, 1700][index],
}));

export default function Moodboard() {
  const titleId = useId();
  // The pictures that have arrived in the current load. Refresh starts a new round, so a picture still on its way from
  // the round before never lands in this one.
  const [load, setLoad] = useState({ round: 0, loaded: moodboard.map((photo) => photo.id) });
  const refresh = () => {
    const round = load.round + 1;
    setLoad({ round, loaded: [] });
    moodboard.forEach((photo) => setTimeout(() => setLoad((current) => (
      current.round === round ? { round, loaded: [...current.loaded, photo.id] } : current
    )), photo.delay));
  };
  const busy = load.loaded.length < moodboard.length;
  return (
    <Card theme="default" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack direction="row" gap="sm" justify="between" align="start">
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">Moodboard</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Brand refresh · Saola Outdoor</Text>
          </Stack>
          <IconButton appearance="flat" icon="icon-refresh-cw-01-line" aria-label="Refresh moodboard" onClick={refresh} />
        </Stack>
        {/* Photo tiles are cards in a grid (md); each tile keeps its caption close (xs). */}
        <Grid minColumnWidth={104} gap="md" aria-busy={busy}>
          {moodboard.map((photo) => {
            const ready = load.loaded.includes(photo.id);
            return (
              <Stack key={photo.id} gap="xs">
                {/* Without a src, Image keeps its 4:3 frame and shows its own Skeleton. */}
                <Image src={ready ? photo.src : undefined} alt={photo.alt} ratio="4:3" loading="eager" />
                <Text textStyle="Body/Small/Regular" tone="base" truncate>
                  {/* The placeholder stays on the caption's line, as wide as a name (11 characters). */}
                  {ready ? photo.addedBy : <SkeletonText lines={1} style={{ display: "inline-flex", width: "11ch", maxWidth: "100%", verticalAlign: "middle" }} />}
                </Text>
              </Stack>
            );
          })}
        </Grid>
        <VisuallyHidden role="status">{busy ? "Loading pictures…" : `${plural(moodboard.length, "picture")} loaded`}</VisuallyHidden>
      </Stack>
    </Card>
  );
}
