import { useState, type KeyboardEvent } from "react";
import { Box, Card, Heading, IconButton, Image, Stack, Text, Tooltip, useToast } from "@zen-ds/react";
import { photos } from "../../data";

const zoomSteps = [25, 50, 75, 100, 150, 200, 300, 400];
const storePhoto = { name: "Phin & Co – Thao Dien store.jpg", ...photos.site[5] };

/** A photo review toolbar: each zoom button's tooltip adds its keyboard shortcut to the button's name. */
export default function PhotoReview() {
  const [zoom, setZoom] = useState(150);
  const { toast } = useToast();
  const step = (by: 1 | -1) => setZoom((current) => zoomSteps[Math.min(zoomSteps.length - 1, Math.max(0, zoomSteps.indexOf(current) + by))]);
  // The shortcuts the tooltips name work while focus is in the viewer.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") step(1);
    else if (event.key === "-") step(-1);
    else if (event.shiftKey && event.code === "Digit1") setZoom(100);
    else return;
    event.preventDefault();
  };
  return (
    <Card theme="default" width="fill" onKeyDown={onKeyDown}>
      <Stack gap="md">
        <Stack direction="row" align="center" justify="between" gap="md" wrap>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{storePhoto.name}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">Loyalty app · 4.2 MB</Text>
          </Stack>
          {/* A dense viewer toolbar beside the title: Small buttons, so it fits a narrow card at Comfortable density too;
              on a 320px phone at Comfortable it wraps rather than run past the card. */}
          <Stack direction="row" align="center" gap="xs" wrap role="group" aria-label="Photo view">
            <Tooltip content="Zoom out · −" placement="bottom">
              <IconButton appearance="flat" size="sm" icon="icon-zoom-out-line" aria-label="Zoom out" onClick={() => step(-1)} />
            </Tooltip>
            {/* Five digits of room (ch follows the typography), so the buttons don't shift as the number changes. */}
            <Text as="span" textStyle="Body/Small/Regular" tone="base" role="status" align="center" tabularNumbers style={{ minWidth: "5ch" }}>{`${zoom}%`}</Text>
            <Tooltip content="Zoom in · +" placement="bottom">
              <IconButton appearance="flat" size="sm" icon="icon-zoom-in-line" aria-label="Zoom in" onClick={() => step(1)} />
            </Tooltip>
            <Tooltip content="Zoom to fit · ⇧1" placement="bottom">
              <IconButton appearance="flat" size="sm" icon="icon-expand-04-line" aria-label="Zoom to fit" onClick={() => setZoom(100)} />
            </Tooltip>
            {/* No shortcut to add: the IconButton's own tooltip names it. */}
            <IconButton appearance="flat" size="sm" icon="icon-download-01-line" aria-label="Download photo" onClick={() => toast({ title: "Photo downloaded" })} />
          </Stack>
        </Stack>
        {/* The viewer scrolls both ways when zoomed in (the scroll prop takes one axis). */}
        <Box height={240} radius="lg" surface="surface-alt" style={{ overflow: "auto" }}>
          <Image src={storePhoto.src} alt={storePhoto.alt} ratio="3:2" radius="none" loading="eager" style={{ width: `${zoom}%` }} />
        </Box>
      </Stack>
    </Card>
  );
}
