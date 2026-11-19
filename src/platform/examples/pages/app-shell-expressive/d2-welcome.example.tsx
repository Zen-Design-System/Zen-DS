import { useState } from "react";
import { AppShell, Box, Button, Heading, Stack, Text, TooltipSurface, TopNavigation, chatReactionEmojis, useToast } from "@zen-ds/react";

type ReactionKind = keyof typeof chatReactionEmojis;

/** Display-Extra/1 in the phone's Mobile typography (74px): the size the reaction glyph is drawn at before scaling. */
const EMOJI_FONT_SIZE = 74;

/**
 * Figma Chat/Reaction/Emoji/Static, scaled up into a picture: Zen's own reaction glyph (Chat's chatReactionEmojis) in
 * Display-Extra/1, scaled to the Figma size and turned by the Figma rotation (counter-clockwise positive, as Shape's
 * rotation). Decorative: the screen's text says what it means.
 */
function ReactionPicture({ kind, size, rotation = 0 }: { kind: ReactionKind; size: number; rotation?: number }) {
  return (
    <Box width={size} height={size}>
      <Stack align="center" justify="center" height="fill">
        {/* The instance is scaled in Figma (K), so the glyph keeps its text style and is drawn at the instance's size. */}
        <Text as="span" textStyle="Display-Extra/1" aria-hidden="true" style={{ transform: `rotate(${-rotation}deg) scale(${size / EMOJI_FONT_SIZE})` }}>
          {chatReactionEmojis[kind]}
        </Text>
      </Stack>
    </Box>
  );
}

/** Figma Illustration (390 × 432, no auto layout) inside the hero's padding: the hero pads Margin-Comfortable at the
 *  sides, Spacing/Gap/XSmall above the picture and Spacing/Padding/XLarge under it, where Figma's picture runs edge to
 *  edge and to the band's end. So the frame is 400 high (432 − 8 − 24) and each reaction keeps its Figma place on the
 *  band: X − 20 and Y − 8 (the unrotated box, centred where Figma's turned one is), with its size and rotation. */
const welcomeReactions: { kind: ReactionKind; x: number; y: number; size: number; rotation: number }[] = [
  { kind: "lol", x: -7, y: 70, size: 124, rotation: -8 },
  { kind: "heart", x: 248, y: 27, size: 74, rotation: 10 },
  { kind: "like", x: 252, y: 214, size: 105, rotation: 6 },
  { kind: "surprised", x: 14, y: 255, size: 88, rotation: -23 },
  { kind: "sad", x: 156, y: 344, size: 72, rotation: 0 },
];

/** D2 · Welcome (Figma ◇ Master-Layout · Example, 15948:9920): AppShell/Mobile · Phone · Top=Band · Bottom=None, on
 *  Canvas/Alt. No bar row, so nothing to follow the scroll: the TopNavigation takes no scrollRef. */
export default function WelcomePhone() {
  const { toast } = useToast();
  const [pending, setPending] = useState<"apple" | "google">();
  const signIn = (provider: "apple" | "google") => {
    setPending(provider);
    toast({ title: `Signed in with ${provider === "apple" ? "Apple" : "Google"}`, children: "Welcome to zenio! Pick who to chat with first.", action: { label: "Undo", onClick: () => setPending(undefined) } });
  };
  return (
    // Band + None: one Pale band from the top edge holds the status bar (Top-Navigation Top-bar=false: no bar row, and no
    // title, since the wordmark is the h1), the Display-Extra wordmark and a picture that sets the mood (Zen's own
    // reaction emoji, scaled, with a Tooltip as the speech bubble); the sign-in buttons sit below on the white Canvas,
    // within thumb reach.
    <AppShell canvas="alt" mobileTop="band" band="pale"
      topNavigation={<TopNavigation topBar={false} />}
      hero={(
        <>
          {/* Figma's Brand frame pads 20 above the wordmark: the hero's Spacing/Padding/XSmall plus Padding/Small. */}
          <Stack align="center" style={{ paddingTop: "var(--zen-spacing-padding-small)" }}>
            <Heading level={1} textStyle="Display-Extra/1">zenio</Heading>
          </Stack>
          <Box height={400} role="img" aria-label="Laughing, heart, thumbs-up, surprised and sad reactions around a speech bubble that says Hello">
            {welcomeReactions.map((item) => (
              <Box key={item.kind} position="absolute" insetLeft={item.x} insetTop={item.y}>
                <ReactionPicture kind={item.kind} size={item.size} rotation={item.rotation} />
              </Box>
            ))}
            <Box position="absolute" insetLeft={152} insetTop={142}>
              <TooltipSurface aria-hidden="true">Hello~</TooltipSurface>
            </Box>
          </Box>
        </>
      )}
    >
      <Stack gap="sm" align="stretch">
        <Text textStyle="Body/Small/Regular" tone="light" align="center">Sign in to get started</Text>
        <Button size="lg" level="primary" disabled={pending === "google"} onClick={() => signIn("apple")}>{pending === "apple" ? "Signed in with Apple" : "Sign in with Apple"}</Button>
        <Button size="lg" level="tertiary" disabled={pending === "apple"} onClick={() => signIn("google")}>{pending === "google" ? "Signed in with Google" : "Sign in with Google"}</Button>
        <Text textStyle="Caption/Regular" tone="light">By continuing you agree to the Terms and the Privacy Policy.</Text>
      </Stack>
    </AppShell>
  );
}
