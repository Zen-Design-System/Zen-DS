import { useState } from "react";
import { Box, IconButton, Image, Stack, Text, useToast } from "@zen-ds/react";
import { photos } from "../../data";

const moodboard = [
  { ...photos.feed[3], name: "Mountain road.jpg" },
  { ...photos.feed[1], name: "Forest creek.jpg" },
  { ...photos.feed[4], name: "Snow peaks.jpg" },
  { ...photos.feed[0], name: "Sunset field.jpg" },
];

export default function PhotoViewer() {
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const photo = moodboard[index];
  const show = (next: number) => { setIndex(next); setZoom(100); };
  return (
    <Stack gap="xs">
      {/* The frame clips the zoomed photo to its radius; the buttons are absolute layers pinned to its edges. */}
      <Box radius="lg" clip>
        {/* The photo zooms inside the frame. */}
        <Box style={{ transform: `scale(${zoom / 100})` }}>
          <Image src={photo.src} alt={photo.alt} ratio="4:3" radius="none" />
        </Box>
        {/* Overlay buttons sit on the photo: icon-only, named, with the name as a tooltip after 1s. */}
        <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-download-01-line" aria-label="Download photo" onClick={() => toast({ title: "Photo downloaded" })} />
        </Box>
        <Box position="absolute" constraintX="left" constraintY="center" insetLeft="sm">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-chevron-left-line-medium" aria-label="Previous photo" disabled={index === 0} onClick={() => show(index - 1)} />
        </Box>
        <Box position="absolute" constraintX="right" constraintY="center" insetRight="sm">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-chevron-right-line-medium" aria-label="Next photo" disabled={index === moodboard.length - 1} onClick={() => show(index + 1)} />
        </Box>
        <Stack direction="row" gap="xs" position="absolute" constraintX="center" constraintY="bottom" insetBottom="sm" role="group" aria-label="Zoom">
          <IconButton appearance="overlay" level="black-overlay" icon="icon-zoom-out-line" aria-label="Zoom out" disabled={zoom <= 100} onClick={() => setZoom(zoom - 50)} />
          <IconButton appearance="overlay" level="black-overlay" icon="icon-zoom-in-line" aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(zoom + 50)} />
        </Stack>
      </Box>
      <Text role="status" textStyle="Body/Small/Regular" tone="base">{`${photo.name} · ${index + 1} of ${moodboard.length} · ${zoom}%`}</Text>
    </Stack>
  );
}
