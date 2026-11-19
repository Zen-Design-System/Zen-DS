import { type RefObject } from "react";
import { AppShell, Box, Heading, Image, Stack, Text, TopNavigation, useToast } from "@zen-ds/react";
import { photos } from "../../data";

const hero = photos.mountainRoad;

/** A stay's page: the bar starts in the Default-Overlay type at the hero photo and turns Default as the page scrolls. */
// scrollRef: what scrolls the screen, so the bar changes type as the page scrolls under it. "window" in your app.
export default function HeroHeader({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  return (
    <AppShell
      // The audit reads the white title against the screen's canvas: the Default-Overlay gradient (on the bar's ::before
      // while scroll-linked) and the photo under it are not in its background walk, so it is skipped here.
      topNavigation={<TopNavigation data-audit-skip-contrast="" type="default-overlay" scrolledType="default" title="Saola Lodge" scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to stays" }) }}
        trailing={[{ icon: "icon-share-01-line", label: "Share", onClick: () => toast({ title: "Link copied" }) }]} />}>
      <Stack gap="lg">
        {/* The hero runs edge to edge: it takes back the page margin at the sides and the space above it. */}
        <Box style={{ margin: "calc(-1 * var(--zen-spacing-padding-xsmall, 8px)) calc(-1 * var(--zen-margin-comfortable, 20px)) 0" }}>
          <Image src={hero.src} alt={hero.alt} ratio="4:3" loading="eager" />
        </Box>
        <Stack gap="md">
          <Heading level={2} textStyle="Heading/3">A lodge above the valley</Heading>
          <Text tone="base">Twelve rooms on the ridge road, an hour from the airport. Every room looks over the valley, and breakfast is served on the terrace from seven.</Text>
          <Text tone="base">Scroll down: the bar starts over the photo, in white on its dark gradient, and turns into the Default bar as the page moves under it.</Text>
          <Text tone="base">Check-in from 2 pm, check-out until 11 am. The lodge arranges pickup at the airport on request.</Text>
        </Stack>
      </Stack>
    </AppShell>
  );
}
