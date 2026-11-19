import { useId, useState } from "react";
import { Card, Grid, Heading, Image, Pagination, Stack, Text, plural } from "@zen-ds/react";
import { people, photos } from "../../data";

const pageOf = <T,>(items: T[], pageNo: number, size: number) => items.slice((pageNo - 1) * size, pageNo * size);
/** Saola Outdoor's moodboard for the brand refresh. */
const moodboard = [...photos.feed, photos.mountainRoad, photos.site[4], photos.site[1], photos.site[2]];
const PHOTOS_PER_PAGE = 4;

/** Secondary theme with Small items: a quiet selected page beside the photos. */
export default function Moodboard() {
  const titleId = useId();
  const [pageNo, setPageNo] = useState(1);
  const pageCount = Math.ceil(moodboard.length / PHOTOS_PER_PAGE);
  return (
    <Card theme="default" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Brand refresh moodboard</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · ${plural(moodboard.length, "photo")} from ${people.gia.name}`}</Text>
        </Stack>
        <Grid columns={2} gap="md">
          {pageOf(moodboard, pageNo, PHOTOS_PER_PAGE).map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="4:3" radius="md" />)}
        </Grid>
        <Stack direction="row" justify="center">
          <Pagination theme="secondary" size="sm" aria-label="Moodboard pages" page={pageNo} onPageChange={setPageNo} pageCount={pageCount} />
        </Stack>
      </Stack>
    </Card>
  );
}
