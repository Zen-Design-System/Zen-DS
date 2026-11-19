import type { RefObject } from "react";
import { AppShell, Box, Button, Heading, Icon, IconButton, Image, Stack, Text, TopNavigation, useToast } from "@zen-ds/react";
import { photos } from "../../data";

/* Figma ◇ Master-Layout · Example › E · Consumer apps › E4 · Onboarding (15991:9843): one Pattern/AppShell/Mobile,
   Top=Band-Sheet · Bottom=None. The copy, variants and pictures are the Figma screen's. */

/** Figma Collage (390 × 330, no auto layout): five portraits in Corner-Radius/Giant frames with a 4px Surface ring, fanned
 *  out at these X / Y, and the Small Tertiary "+" under them. X is scaled to the hero's 350 inner width. */
const portraits = [
  { photo: photos.portraits.redHair, x: 9, y: 64, width: 96, height: 128 },
  { photo: photos.portraits.shortHair, x: 66, y: 30, width: 104, height: 140 },
  { photo: photos.portraits.curlyHoodie, x: 119, y: 96, width: 124, height: 168 },
  { photo: photos.portraits.curlyHair, x: 185, y: 44, width: 104, height: 140 },
  { photo: photos.portraits.smile, x: 253, y: 76, width: 96, height: 128 },
];

/** A family-stories app's welcome: the brand over a band of fanned-out faces, then the promise and the ways in. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function Onboarding({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  return (
    // Band-Sheet, no bottom bar: the brand mark over the Pale band where the faces fan out, then the Surface sheet with
    // the promise, the Primary Get started, the phone option and Sign in.
    <AppShell mobileTop="band-sheet" band="pale"
      topNavigation={<TopNavigation scrollRef={scrollRef} headingLevel="h1" title={(
        <Stack direction="row" gap="xs" align="center">
          <Icon name="icon-git-branch-01-line" size="xl" tone="accent-base" decorative />
          <Text as="span" textStyle="Heading/2">kindred</Text>
        </Stack>
      )} />}
      hero={(
        <Box height={330}>
          {portraits.map(({ photo, x, y, width, height }) => (
            <Box key={photo.src} position="absolute" insetLeft={x} insetTop={y} width={width} height={height} surface="surface" radius="3xl" padding="2xs">
              <Image src={photo.src} alt={photo.alt} ratio={(width - 8) / (height - 8)} radius="2xl" loading="eager" />
            </Box>
          ))}
          <Box position="absolute" constraintX="center" insetTop={274}>
            <IconButton size="sm" level="tertiary" icon="icon-plus-line" aria-label="Add a relative" onClick={() => toast({ title: "Add a relative", children: "Start with a parent or a grandparent." })} />
          </Box>
        </Box>
      )}
    >
      <Stack gap="md" align="stretch">
        <Stack gap="xs">
          <Heading level={2} textStyle="Heading/2" align="center">Explore generations, records and family stories.</Heading>
          <Text tone="base" align="center">Find the people who shaped your journey and keep their stories together.</Text>
        </Stack>
        <Button size="lg" level="primary" onClick={() => toast({ title: "Let's start your tree", children: "Add yourself first, then your parents." })}>Get started</Button>
        <Button size="lg" level="tertiary" startIcon="icon-phone-line" onClick={() => toast({ title: "Continue with phone", children: "We text you a 6-digit code." })}>Continue with phone</Button>
        <Stack direction="row" gap="xs" align="center" alignSelf="center">
          <Text textStyle="Body/Small/Regular" tone="base">Already have an account?</Text>
          <Button appearance="flat" size="sm" level="primary" onClick={() => toast({ title: "Sign in", children: "With your phone or email." })}>Sign in</Button>
        </Stack>
      </Stack>
    </AppShell>
  );
}
