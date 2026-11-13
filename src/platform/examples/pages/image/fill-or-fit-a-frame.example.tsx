import { useId, useState } from "react";
import { Box, Grid, Heading, Image, Segmented, Stack, Text, type ImageRatio } from "@zen-ds/react";
import { daysFromToday, formatDate, photos } from "../../data";

type Channel = { id: string; name: string; ratio: ImageRatio; label: string };
const channels: Channel[] = [
  { id: "web", name: "Website hero", ratio: "16:9", label: "16:9" },
  { id: "post", name: "Instagram post", ratio: "1:1", label: "1:1" },
  { id: "story", name: "Story", ratio: 9 / 16, label: "9:16" },
];
const ratioOf = (ratio: ImageRatio) => (typeof ratio === "number" ? ratio : Number(ratio.split(":")[0]) / Number(ratio.split(":")[1]));
/** Columns as wide as their ratios, so every frame in the row is the same height. On a phone the wide hero takes its own
    row and the square and the story share the next one, their columns again as wide as their ratios (1 : 0.5625). */
const channelColumns = {
  mobile: "minmax(0, 1fr) minmax(0, 0.5625fr)",
  desktop: channels.map((channel) => `minmax(0, ${ratioOf(channel.ratio).toFixed(3)}fr)`).join(" "),
};
const launchPhoto = photos.mountainRoad;

/** Cover or contain: one photo in each channel's ratio. */
export default function ChannelPreviews() {
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const headingId = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" gap="md" align="end" justify="between" wrap>
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">Launch post</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Saola Outdoor · Scheduled for ${formatDate(daysFromToday(12, 9, 0))} at 9:00 am`}</Text>
        </Stack>
        <Segmented aria-label="Photo fit" value={fit} onValueChange={(value) => setFit(value === "contain" ? "contain" : "cover")}
          options={[{ id: "cover", label: "Fill frame" }, { id: "contain", label: "Show whole photo" }]} />
      </Stack>
      <Grid columns={channelColumns} gap="md" align="start">
        {channels.map((channel, index) => (
          <Box key={channel.id} span={index === 0 ? { desktop: 1, mobile: "full" } : 1}>
            <Image src={launchPhoto.src} alt={launchPhoto.alt} ratio={channel.ratio} fit={fit} loading="eager"
              caption={`${channel.name} · ${channel.label}`} />
          </Box>
        ))}
      </Grid>
    </Stack>
  );
}
