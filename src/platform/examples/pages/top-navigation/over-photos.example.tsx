import { useRef, useState, type RefObject } from "react";
import { AppShell, BottomSheet, Box, Grid, Image, Stack, Text, TopNavigation, plural, useToast, type BottomSheetItem } from "@zen-ds/react";
import { people, photos, type Photo } from "../../data";

const firstName = (name: string) => name.split(" ")[0];
// The Saola Outdoor moodboard: every feed and place photo once, so the grid runs past the screen.
const moodboard: (Photo & { name: string })[] = [
  ...["Sunset field", "Forest creek", "Balloon over palms", "Mountain road", "Snow peaks", "Desert hills", "Coast road", "Moss study"]
    .map((name, index) => ({ ...photos.feed[index], name })),
  ...["College courtyard", "Snowy rooftops", "Old town", "White houses", "Bridge at dusk", "Café table"]
    .map((name, index) => ({ ...photos.site[index], name })),
];
/** Each photo is one button that opens the viewer: no button look of its own, the photo's corners. */
const tile = { display: "block", padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: "var(--zen-corner-radius-small, 8px)" } as const;

/** A moodboard that opens each photo in a viewer, its bar in the Liquid Overlay type. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function OverPhotos({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [index, setIndex] = useState<number | null>(null);
  const [fromIndex, setFromIndex] = useState<number | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  // Focus follows the screen: the viewer focuses its title, Close returns to the tile you opened.
  const titleRef = useRef<HTMLSpanElement>(null);
  const tileRef = useRef<HTMLButtonElement>(null);
  const open = (i: number) => {
    setIndex(i);
    setFromIndex(i);
    setTimeout(() => titleRef.current?.focus());
  };
  const close = () => {
    setIndex(null);
    setTimeout(() => tileRef.current?.focus());
  };

  if (index === null) {
    return (
      // The moodboard is a root: its large title folds as the grid scrolls.
      <AppShell key="moodboard" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Moodboard" largeTitle="Moodboard" />}>
        <Stack gap="xs">
          <Text textStyle="Body/Small/Regular" tone="base">{`Brand refresh · Saola Outdoor · ${plural(moodboard.length, "photo")}`}</Text>
          <Grid columns={2} gap="2xs">
            {moodboard.map((photo, i) => (
              <button key={photo.src} ref={i === fromIndex ? tileRef : undefined} type="button" aria-label={`Open ${photo.name}`} style={tile} onClick={() => open(i)}>
                <Image src={photo.src} alt="" ratio="1:1" radius="sm" loading="eager" />
              </button>
            ))}
          </Grid>
        </Stack>
      </AppShell>
    );
  }

  const photo = moodboard[index];
  const favourite = favourites.includes(photo.src);
  const toggleFavourite = () => setFavourites((list) => favourite ? list.filter((src) => src !== photo.src) : [...list, photo.src]);
  const shareItems: BottomSheetItem[] = [
    { id: "link", label: "Copy link", icon: "icon-link-01-line" },
    { id: "send", label: `Send to ${people.gia.name}`, icon: "icon-send-01-line" },
    { id: "save", label: "Save to device", icon: "icon-download-01-line" },
  ];
  const share = (item: BottomSheetItem) => toast({ title: item.id === "link" ? "Link copied" : item.id === "send" ? `Photo sent to ${firstName(people.gia.name)}` : "Photo saved" });
  return (
    <>
      {/* Overlay type only on imagery: its gradient keeps the white title and actions readable on the photo. The viewer
          does not scroll, so its bar has no scrollRef. */}
      <AppShell key={photo.src}
        topNavigation={<TopNavigation type="liquid-overlay" title={<span ref={titleRef} tabIndex={-1}>{photo.name}</span>}
          leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }}
          trailing={[
            { icon: favourite ? "icon-heart-solid" : "icon-heart-line", label: favourite ? "Remove from favourites" : "Add to favourites", onClick: toggleFavourite },
            { icon: "icon-share-01-line", label: "Share", onClick: () => setSharing(true) },
          ]} />}>
        {/* The photo fills the whole screen, under the bar: a layer pinned to every edge of the shell.
            zen-allow-absolute-parent: AppShell is the frame here (its root is positioned), so the layer spans the screen. */}
        <Box position="absolute" constraintX="left-right" constraintY="top-bottom" image={photo.src} role="img" aria-label={photo.alt} />
      </AppShell>
      <BottomSheet inline type="action" open={sharing} onOpenChange={setSharing} title={`Share ${photo.name}`} items={shareItems} onSelect={share} />
    </>
  );
}
