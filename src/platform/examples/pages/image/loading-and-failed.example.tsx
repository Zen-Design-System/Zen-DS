import { useId, useRef, useState } from "react";
import { Card, Grid, Heading, Image, InlineMessage, Stack, Text } from "@zen-ds/react";
import { people, photos } from "../../data";

/** Bytes that are not a picture: the browser fails to decode them without a network request, so a demo can fail on cue. */
const unreadable = "data:image/png;base64,AAAA";
const venue = photos.site[0];
const oldQuarter = photos.site[2];

/** The frame holds its place while loading, and a failed file keeps it. */
export default function RecapPhotos() {
  // The Old Quarter file can't be read the first time; Try again fetches it again.
  const [second, setSecond] = useState<string | undefined>(unreadable);
  const [failed, setFailed] = useState(false);
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const retry = () => {
    setFailed(false);
    // No src while the file is on its way: the Skeleton shows in the 4:3 frame.
    setSecond(undefined);
    // The message (and its button) goes away, so focus moves to the card title.
    titleRef.current?.focus();
    setTimeout(() => setSecond(oldQuarter.src), 1200);
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading ref={titleRef} level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Book Fair recap</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Hanoi Book Fair · Draft post by ${people.linh.name}`}</Text>
        </Stack>
        {/* A ratio keeps each frame's size while its Skeleton shows, so nothing jumps when the picture arrives. */}
        <Grid columns={2} gap="md">
          <Image src={venue.src} alt={venue.alt} ratio="4:3" caption="Venue courtyard · Emi Sato" />
          <Image src={second} alt={oldQuarter.alt} ratio="4:3" caption="Old Quarter from the hill · Emi Sato" onError={() => setFailed(true)} />
        </Grid>
        {failed ? (
          <InlineMessage theme="negative" title="A photo didn’t load" action={{ label: "Try again", onClick: retry }}>
            “Old Quarter from the hill” stays in the post; its file couldn’t be read.
          </InlineMessage>
        ) : null}
      </Stack>
    </Card>
  );
}
