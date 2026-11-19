import { useState } from "react";
import { ActionBar, AppShell, Chip, DescriptionList, Heading, IconButton, Image, Stack, Text, TopNavigation, useToast } from "@zen-ds/react";
import { photos } from "../../data";

const highlights = [
  { label: "Small group", detail: "Up to 10 guests with one photographer guide." },
  { label: "3 hours", detail: "08:30 – 11:30, including the walk in." },
  { label: "Photo stops", detail: "The guide times each stop for the light beams." },
  { label: "Free cancellation", detail: "Cancel up to 24 hours before for a full refund." },
];

/** C4 · Media + Bottom sheet (Figma ◇ Master-Layout · Example, 15922:8287): AppShell/Mobile · Phone · Top=Media ·
 *  Bottom=Actions. The photo runs under the status bar: light status-bar content in your app. The bar over the photo
 *  scrolls away with it (it is not pinned), so it takes no scrollRef. */
export default function MediaSheetPhone() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  return (
    // Media + Actions: the photo is the backdrop, the Liquid-Glass actions float on it, and one Surface sheet rises over
    // it with the title, highlights and facts (no cards inside it); the booking actions sit in the Action bar.
    <AppShell mobileTop="media"
      backdrop={<Image src={photos.antelopeCanyon.src} alt={photos.antelopeCanyon.alt} radius="none" loading="eager" />}
      topNavigation={<TopNavigation aria-label="Antelope Canyon photo tour" topBar
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Page, Arizona" }) }}
        trailing={[{ icon: saved ? "icon-heart-solid" : "icon-heart-line", label: saved ? "Saved" : "Save tour", onClick: () => setSaved((value) => !value) }]} />}
      actionBar={<ActionBar direction="horizontal"
        secondaryAction={{ label: "Message host", onClick: () => toast({ title: "Message host", children: "Hosts reply within an hour." }) }}
        primaryAction={{ label: "Reserve · $120", onClick: () => toast({ title: "Reserved for Sat, Oct 18", children: "08:30 – 11:30 · 2 adults" }) }} />}
    >
      <Stack gap="md">
        <Stack direction="row" gap="xs" align="start">
          <Stack gap="3xs" width="fill">
            {/* The bar over the photo has no title, so the sheet's title names the screen: the h1, in Heading/1 (Figma
                draws Heading-Text H3; an h1 is never smaller than Heading/1). */}
            <Heading level={1}>Antelope Canyon photo tour</Heading>
            <Text tone="light">Page, Arizona · ★ 4.9 (1,284)</Text>
          </Stack>
          <IconButton level="tertiary" icon="icon-share-01-line" aria-label="Share tour" onClick={() => toast({ title: "Tour link copied" })} />
        </Stack>
        <Stack direction="row" gap="xs" wrap>
          {highlights.map((item) => (
            <Chip key={item.label} variant="normal" size="sm" onClick={() => toast({ title: item.label, children: item.detail })}>{item.label}</Chip>
          ))}
        </Stack>
        <DescriptionList divider items={[
          { term: "Date", description: "Sat, Oct 18" },
          { term: "Time", description: "08:30 – 11:30" },
          { term: "Guests", description: "2 adults" },
        ]} />
      </Stack>
    </AppShell>
  );
}
