import { useId, useState, type ReactNode } from "react";
import {
  AppShell, Avatar, Badge, BottomNavigation, Box, Card, Heading, Icon, IconButton, Link, List, ListItem, ProgressBar, Stack, Text, TooltipSurface, TopNavigation,
  chatReactionEmojis, useToast, type AvatarProps, type BottomNavigationItem, type IconName,
} from "@zen-ds/react";
import { people } from "../../data";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;
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

/**
 * A tappable account photo (Figma Avatar/Single in a Trailing-Slot): the Avatar drawn as it is, made one labelled button.
 * The button lays its Avatar out as a flex item (no text line around it, so it stays the Avatar's 48 and centres in the
 * bar) and rounds its focus ring like the round Avatar.
 */
function ProfileButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <Link as="button" aria-label={label} onClick={onClick} style={{ display: "flex", borderRadius: "var(--zen-corner-radius-rounded)" }}>{children}</Link>;
}

const coachRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "coach", label: "Coach", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "track", label: "Track", icon: "icon-plus-circle-line", selectedIcon: "icon-plus-circle-solid" },
  { id: "explore", label: "Explore", icon: "icon-compass-line", selectedIcon: "icon-compass-solid" },
];
const plan: { id: string; initials: string; theme: AvatarTheme; title: string; caption: string }[] = [
  { id: "breakfast", initials: "Br", theme: "green", title: "Breakfast: oats & berries", caption: "08:00 · 350 kcal" },
  { id: "lunch", initials: "Lu", theme: "orange", title: "Lunch: chicken & rice bowl", caption: "12:30 · 520 kcal" },
  { id: "walk", initials: "Wa", theme: "blue", title: "Walk after lunch", caption: "13:15 · 20 min · 2,000 steps" },
  { id: "dinner", initials: "Di", theme: "violet", title: "Dinner: salmon & greens", caption: "19:00 · 480 kcal" },
];

/** D3 · Companion Home (Figma ◇ Master-Layout · Example, 15950:9324): AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar,
 *  Shadow cards on Canvas/Default. The band and its large title scroll away with the page (the bar is not pinned), so
 *  the TopNavigation takes no scrollRef. */
export default function CompanionHomePhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [glasses, setGlasses] = useState(0);
  const [fasting, setFasting] = useState(false);
  const [mood, setMood] = useState<string>();
  const planId = useId();
  const trackers: { id: string; icon: IconName; value: string; label: string; name: string; onClick: () => void }[] = [
    { id: "water", icon: "icon-droplets-01-line", value: `${glasses} / 8`, label: "Water", name: `Water, ${glasses} of 8 glasses. Add a glass`,
      onClick: () => { const next = Math.min(glasses + 1, 8); setGlasses(next); toast({ title: next === 8 ? "Water goal reached" : `${next} of 8 glasses`, children: next === 8 ? "Blinky is proud of you." : "One more glass logged." }); } },
    { id: "steps", icon: "icon-running-line", value: "0 / 5k", label: "Steps", name: "Steps, 0 of 5,000",
      onClick: () => toast({ title: "0 of 5,000 steps", children: "Steps sync from your phone's health app." }) },
    { id: "fasting", icon: "icon-zap-line", value: fasting ? "Stop" : "Start", label: "Fasting", name: fasting ? "Stop fasting" : "Start fasting",
      onClick: () => { setFasting(!fasting); toast({ title: fasting ? "Fast ended" : "Fast started", children: fasting ? "Logged for today." : "16 hours · until 08:00 tomorrow." }); } },
    { id: "mood", icon: "icon-heart-line", value: mood ?? "Log", label: "Mood", name: mood ? `Mood, ${mood}` : "Log your mood",
      onClick: () => { setMood("Good"); toast({ title: "Mood logged: Good", children: "Blinky will check in again tonight." }); } },
  ];
  return (
    // Band + Tab-Bar: a buddy at the top of the home. The band from the top edge holds the Transparent bar (the large
    // "Home" title, the streak and the profile), a speech bubble (Tooltip) and a character (Zen's own reaction emoji,
    // scaled); then a row of round trackers, a coach card and today's plan as Shadow boxes. Warm and personal. Figma's
    // Header-Trailing holds the streak Badge and the account Avatar as they are (largeTitleAction).
    <AppShell mobileTop="band" band="pale"
      topNavigation={<TopNavigation largeTitle="Home"
        largeTitleAction={[
          // zen-allow-badge-count: a 3-day streak, not a count to clear (Figma Header-Trailing: Badge Medium Orange Solid with its zap).
          <Badge key="streak" size="md" theme="orange" background="solid" leading="icon-zap-line" role="img" aria-label="3-day streak">3</Badge>,
          <ProfileButton key="profile" label="Profile" onClick={() => toast({ title: "Max", children: "Profile, goals and reminders." })}>
            <Avatar size="md" theme="photo" src={people.finn.photo} alt="" />
          </ProfileButton>,
        ]} />}
      hero={(
        <Stack gap="md" align="center">
          <TooltipSurface color="white-overlay">Hey Max, I'm Blinky, your bestest buddy</TooltipSurface>
          <ReactionPicture kind="lol" size={96} />
        </Stack>
      )}
      bottomNavigation={<BottomNavigation aria-label="Health coach" value={root} onValueChange={setRoot} showLabels items={coachRoots} />}
    >
      <Stack gap="xl">
        <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-label="Today's trackers">
          {trackers.map((tracker) => (
            <Stack as="li" key={tracker.id} gap="xs" align="center">
              {/* zen-allow-no-tooltip: the tracker's value and name sit right under the button (Figma Trackers). */}
              <IconButton size="lg" level="tertiary" icon={tracker.icon} aria-label={tracker.name} tooltip={false} onClick={tracker.onClick} />
              {/* zen-allow-caption-light: the tracker's value is its main value, not a caption; its name under it is the Light caption. */}
              <Text as="span" textStyle="Caption/Medium" tabularNumbers aria-hidden="true">{tracker.value}</Text>
              <Text as="span" textStyle="Caption/Regular" tone="light" aria-hidden="true">{tracker.label}</Text>
            </Stack>
          ))}
        </Stack>
        <Card as="section" aria-label="Coach Avo">
          <Stack gap="sm">
            <Badge size="sm" theme="violet" leading="icon-stars-01-line">Coach Avo</Badge>
            <Text tone="base">Over the next 3 days I'll learn your routine and tune your plan. Let's make it count!</Text>
            <ProgressBar value={33} aria-label="Coach plan: day 1 of 3" />
          </Stack>
        </Card>
        <Stack as="section" gap="md" aria-labelledby={planId}>
          <Stack direction="row" justify="between" align="center" gap="xs">
            <Heading level={2} id={planId} textStyle="Heading/4">Today's plan</Heading>
            {/* A section head's action is underlined text, not a button (Zen rule, as See all). */}
            <Text as="span" textStyle="Body/Base/Bold">
              <Link as="button" tone="inherit" onClick={() => toast({ title: "Edit today's plan", children: "Swap a meal, move the walk or add a snack." })}>Edit</Link>
            </Text>
          </Stack>
          <List aria-labelledby={planId}>
            {plan.map((item) => (
              <ListItem key={item.id} title={item.title} caption={item.caption} onClick={() => toast({ title: item.title, children: item.caption })}
                leading={<Avatar size="md" shape="square" theme={item.theme} background="subtle" alt="">{item.initials}</Avatar>}
                trailing={<Icon name="icon-chevron-right-line-medium" decorative />} />
            ))}
          </List>
        </Stack>
      </Stack>
    </AppShell>
  );
}
