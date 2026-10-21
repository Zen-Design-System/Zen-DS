/* App Shell examples · d-expressive-1: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "D · Expressive mobile (consumer)" (15948:9467): D1 · Display Hero (15948:9468), D2 · Welcome (15948:9920) and
   D3 · Companion Home (15950:9324). Each phone is one Pattern/AppShell/Mobile · Phone · Top=Band instance; the copy,
   numbers and component variants are the ones the Figma screens hold. */
import { useId, useState, type ReactNode } from "react";
import { AppShell } from "../../../../components/AppShell";
import { Avatar, type AvatarProps } from "../../../../components/Avatar";
import { Badge } from "../../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { chatReactionEmojis } from "../../../../components/Chat";
import { DockIcon, type DockIconTheme } from "../../../../components/DockIcon";
import { Flag } from "../../../../components/Flag";
import { Icon, type IconName } from "../../../../components/Icon";
import { Box, Stack } from "../../../../components/Layout";
import { Link } from "../../../../components/Link";
import { List, ListBox, ListItem } from "../../../../components/ListItem";
import { ProgressBar } from "../../../../components/Progress";
import { Segmented } from "../../../../components/Segmented";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { TooltipSurface } from "../../../../components/Tooltip";
import { TopNavigation } from "../../../../components/TopNavigation";
import { PlatformPhone } from "../../../PlatformPhone";
import { people } from "../../data";
import type { ExampleDef } from "../../types";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;
type ReactionKind = keyof typeof chatReactionEmojis;

/** Display-Extra/1 in the phone's Mobile typography (74px): the size the reaction glyph is drawn at before scaling. */
const EMOJI_FONT_SIZE = 74;

/**
 * Figma Chat/Reaction/Emoji/Static, scaled up into a picture (D2, D3): Zen's own reaction glyph (Chat's
 * chatReactionEmojis) in Display-Extra/1, scaled to the Figma size and turned by the Figma rotation (counter-clockwise
 * positive, as Shape's rotation). Decorative: the screen's text says what it means.
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

// ——— D1 · Display Hero (Top=Band · Bottom=Tab-Bar; Shadow cards on Canvas/Default) ————————————————————————————————
const frenchRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "lessons", label: "Lessons", icon: "icon-book-closed-line", selectedIcon: "icon-book-closed-solid" },
  { id: "practice", label: "Practice", icon: "icon-play-line", selectedIcon: "icon-play-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const frenchLessons: { id: string; title: string; meta: string; done: number; icon: IconName; theme: DockIconTheme }[] = [
  { id: "greetings", title: "Greetings", meta: "Lesson 4 · 12 min", done: 40, icon: "icon-message-chat-circle-line", theme: "accent" },
  { id: "cafe", title: "At the café", meta: "Lesson 5 · 15 min", done: 20, icon: "icon-graduation-hat-line", theme: "cyan" },
];

function DisplayHeroPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [view, setView] = useState("grid");
  const lessonsId = useId();
  const openLesson = (lesson: (typeof frenchLessons)[number]) => toast({ title: `${lesson.title} · ${lesson.meta.split(" · ")[0]}`, children: `${lesson.done}% done · ${lesson.meta.split(" · ")[1]}` });
  return (
    <PlatformPhone label="Language app" canvas="default">
      {/* Band + Tab-Bar: the headline is the hero. The Support/Brand/Subtle band runs from the top edge with the
          Transparent bar (menu, course flag), the greeting, the Display/1 call to action and two badges; the next
          lessons follow as Shadow cards on the grey Canvas (the Tab-Bar casts one too). */}
      <AppShell mobileTop="band"
        topNavigation={<TopNavigation aria-label="French course"
          leading={{ icon: "icon-menu-02-line", label: "Menu", onClick: () => toast({ title: "Menu", children: "Courses, reminders and settings." }) }}
          trailing={[{ icon: <Flag name="France" />, label: "Course language: French", onClick: () => toast({ title: "Learning French", children: "Add Spanish, Italian or German from Courses." }) }]} />}
        hero={(
          <>
            <Text textStyle="Body/Extra/Regular" tone="base">Hello Alan,</Text>
            <Heading level={1} textStyle="Display/1">Continue French!</Heading>
            <Stack direction="row" gap="xs" wrap>
              <Badge theme="accent" leading="icon-zap-line">12-day streak</Badge>
              <Badge theme="neutral" leadingIcon={false}>A2 · Elementary</Badge>
            </Stack>
          </>
        )}
        bottomNavigation={<BottomNavigation aria-label="French course" value={root} onValueChange={setRoot} showLabels items={frenchRoots} />}
      >
        <Stack gap="xl">
          <Stack as="section" gap="xl" aria-labelledby={lessonsId}>
            <Stack direction="row" justify="between" align="center" gap="xs">
              <Heading level={2} id={lessonsId} textStyle="Heading/4">Your lessons</Heading>
              <Segmented size="sm" aria-label="Lesson layout" value={view} onValueChange={setView} options={[
                { id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> },
                { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-menu-01-line" decorative /> },
              ]} />
            </Stack>
            {view === "grid" ? (
              <Stack direction="row" gap="sm" fillChildren>
                {frenchLessons.map((lesson) => (
                  <Card key={lesson.id} onClick={() => openLesson(lesson)}>
                    <Stack gap="sm">
                      <DockIcon size="lg" icon={lesson.icon} theme={lesson.theme} background="subtle" />
                      <Stack gap="3xs">
                        <Text textStyle="Body/Base/Bold">{lesson.title}</Text>
                        <Text textStyle="Body/Small/Regular" tone="light">{lesson.meta}</Text>
                      </Stack>
                      <ProgressBar value={lesson.done} aria-label={`${lesson.title}: ${lesson.done}% done`} />
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <ListBox theme="shadow" aria-labelledby={lessonsId}>
                <List aria-labelledby={lessonsId}>
                  {frenchLessons.map((lesson) => (
                    <ListItem key={lesson.id} title={lesson.title} caption={lesson.meta} onClick={() => openLesson(lesson)}
                      leading={<DockIcon size="lg" icon={lesson.icon} theme={lesson.theme} background="subtle" />}
                      trailing={<Text as="span" textStyle="Body/Small/Medium" tone="base" tabularNumbers>{`${lesson.done}%`}</Text>} />
                  ))}
                </List>
              </ListBox>
            )}
          </Stack>
          <Card as="section" aria-label="Daily goal">
            <Stack gap="sm">
              <Stack direction="row" gap="sm" align="center">
                <DockIcon size="lg" icon="icon-target-01-line" theme="orange" background="subtle" />
                <Stack gap="3xs" width="fill">
                  <Text textStyle="Body/Base/Bold">Daily goal</Text>
                  <Text textStyle="Body/Small/Regular" tone="light">15 of 20 minutes · 5 to go</Text>
                </Stack>
              </Stack>
              <ProgressBar value={75} aria-label="Daily goal: 15 of 20 minutes" />
            </Stack>
          </Card>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— D2 · Welcome (Top=Band · Bottom=None; Canvas/Alt) —————————————————————————————————————————————————————————————
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

function WelcomePhone() {
  const { toast } = useToast();
  const [pending, setPending] = useState<"apple" | "google">();
  const signIn = (provider: "apple" | "google") => {
    setPending(provider);
    toast({ title: `Signed in with ${provider === "apple" ? "Apple" : "Google"}`, children: "Welcome to zenio! Pick who to chat with first.", action: { label: "Undo", onClick: () => setPending(undefined) } });
  };
  return (
    <PlatformPhone label="zenio welcome" canvas="alt">
      {/* Band + None: one Pale band from the top edge holds the status bar (Top-Navigation Top-bar=false: no bar row,
          and no title, since the wordmark is the h1), the Display-Extra wordmark and a picture that sets the mood (Zen's
          own reaction emoji, scaled, with a Tooltip as the speech bubble); the sign-in buttons sit below on the white
          Canvas, within thumb reach. */}
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
    </PlatformPhone>
  );
}

// ——— D3 · Companion Home (Top=Band · Bottom=Tab-Bar; Shadow cards on Canvas/Default) ——————————————————————————————
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

function CompanionHomePhone() {
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
    <PlatformPhone label="Health coach app" canvas="default">
      {/* Band + Tab-Bar: a buddy at the top of the home. The band from the top edge holds the Transparent bar (the
          large "Home" title, the streak and the profile), a speech bubble (Tooltip) and a character (Zen's own reaction
          emoji, scaled); then a row of round trackers, a coach card and today's plan as Shadow boxes. Warm and personal.
          Figma's Header-Trailing holds the streak Badge and the account Avatar as they are (largeTitleAction). */}
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
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "D1 · Display hero",
    description: "Big type in a full-bleed tint. The headline is the hero: a Support/Brand/Subtle band runs from the top edge and holds the bar (Top-Navigation Type=Transparent: menu, language flag), a short greeting and a Display/1 call to action; the next lessons follow as Shadow cards. The reference's gradient becomes a flat Subtle tint. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Language / Learning, Fitness programs, Meditation, Kids apps.",
    render: () => <DisplayHeroPhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    mobileTop="band"
    topNavigation={<TopNavigation aria-label="French course"
      leading={{ icon: "icon-menu-02-line", label: "Menu", onClick: openMenu }}
      trailing={[{ icon: <Flag name="France" />, label: "Course language: French", onClick: pickCourse }]} />}
    hero={(
      <>
        <Text textStyle="Body/Extra/Regular" tone="base">Hello Alan,</Text>
        <Heading level={1} textStyle="Display/1">Continue French!</Heading>
        <Stack direction="row" gap="xs" wrap>
          <Badge theme="accent" leading="icon-zap-line">12-day streak</Badge>
          <Badge theme="neutral" leadingIcon={false}>A2 · Elementary</Badge>
        </Stack>
      </>
    )}
    bottomNavigation={<BottomNavigation aria-label="French course" value={root} onValueChange={setRoot} showLabels items={[
      { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
      { id: "lessons", label: "Lessons", icon: "icon-book-closed-line", selectedIcon: "icon-book-closed-solid" },
      …Practice · Profile
    ]} />}
  >
    <Stack gap="xl">
      <Stack as="section" gap="xl" aria-labelledby="lessons">
        <Stack direction="row" justify="between" align="center" gap="xs">
          <Heading level={2} id="lessons" textStyle="Heading/4">Your lessons</Heading>
          <Segmented size="sm" aria-label="Lesson layout" value={view} onValueChange={setView} options={[
            { id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> },
            { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-menu-01-line" decorative /> },
          ]} />
        </Stack>
        <Stack direction="row" gap="sm" fillChildren>
          <Card onClick={openLesson}>
            <Stack gap="sm">
              <DockIcon size="lg" icon="icon-message-chat-circle-line" theme="accent" background="subtle" />
              <Stack gap="3xs">
                <Text textStyle="Body/Base/Bold">Greetings</Text>
                <Text textStyle="Body/Small/Regular" tone="light">Lesson 4 · 12 min</Text>
              </Stack>
              <ProgressBar value={40} aria-label="Greetings: 40% done" />
            </Stack>
          </Card>
          …At the café · Lesson 5 · 15 min (cyan, 20%)
        </Stack>
      </Stack>
      <Card as="section" aria-label="Daily goal">
        <Stack gap="sm">
          <Stack direction="row" gap="sm" align="center">
            <DockIcon size="lg" icon="icon-target-01-line" theme="orange" background="subtle" />
            <Stack gap="3xs" width="fill">
              <Text textStyle="Body/Base/Bold">Daily goal</Text>
              <Text textStyle="Body/Small/Regular" tone="light">15 of 20 minutes · 5 to go</Text>
            </Stack>
          </Stack>
          <ProgressBar value={75} aria-label="Daily goal: 15 of 20 minutes" />
        </Stack>
      </Card>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "D2 · Welcome",
    description: "Brand, a playful picture, one way in. The first screen of a consumer app: one Pale band from the top edge holds the status bar (Top-Navigation Transparent), the Display-Extra wordmark and a picture that sets the mood (Zen's own emoji, scaled, with a Tooltip as the speech bubble); the sign-in buttons sit below within thumb reach. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=None. Fits: Any consumer app, Social / Chat, Kids / Games, Wellness.",
    render: () => <WelcomePhone />,
    code: `<PlatformPhone canvas="alt">
  <AppShell
    canvas="alt"
    mobileTop="band"
    band="pale"
    // Figma Top-bar=false: only the status-bar inset; no title, the wordmark is the screen's h1.
    topNavigation={<TopNavigation topBar={false} />}
    hero={(
      <>
        <Stack align="center" style={{ paddingTop: "var(--zen-spacing-padding-small)" }}>
          <Heading level={1} textStyle="Display-Extra/1">zenio</Heading>
        </Stack>
        <Box height={400} role="img" aria-label="Laughing, heart, thumbs-up, surprised and sad reactions around a speech bubble that says Hello">
          {/* Chat's own reaction glyphs (chatReactionEmojis), scaled and turned as in Figma, at their Figma places. */}
          <Box position="absolute" insetLeft={-7} insetTop={70}><ReactionPicture kind="lol" size={124} rotation={-8} /></Box>
          <Box position="absolute" insetLeft={248} insetTop={27}><ReactionPicture kind="heart" size={74} rotation={10} /></Box>
          …like · surprised · sad
          <Box position="absolute" insetLeft={152} insetTop={142}><TooltipSurface aria-hidden="true">Hello~</TooltipSurface></Box>
        </Box>
      </>
    )}
  >
    <Stack gap="sm" align="stretch">
      <Text textStyle="Body/Small/Regular" tone="light" align="center">Sign in to get started</Text>
      <Button size="lg" level="primary" onClick={signInWithApple}>Sign in with Apple</Button>
      <Button size="lg" level="tertiary" onClick={signInWithGoogle}>Sign in with Google</Button>
      <Text textStyle="Caption/Regular" tone="light">By continuing you agree to the Terms and the Privacy Policy.</Text>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "D3 · Companion home",
    description: "A character talks to you. A buddy at the top of the home: a Pale band from the top edge holds the bar (Transparent, large \"Home\" title, streak, avatar), a speech bubble (Tooltip) and a character (Zen emoji, scaled); then a row of round trackers, a coach card and today's plan, which closes the screen as an open list. Warm and personal. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Health coach, Habits / Diet, AI assistant, Kids learning.",
    render: () => <CompanionHomePhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    mobileTop="band"
    band="pale"
    topNavigation={<TopNavigation largeTitle="Home" largeTitleAction={[
      // zen-allow-badge-count: a 3-day streak, not a count to clear (Figma Badge Medium Orange Solid with its zap).
      <Badge key="streak" size="md" theme="orange" background="solid" leading="icon-zap-line" role="img" aria-label="3-day streak">3</Badge>,
      // The account photo opens the profile: the Avatar as it is, made one labelled button.
      <Link key="profile" as="button" aria-label="Profile" onClick={openProfile} style={{ display: "flex", borderRadius: "var(--zen-corner-radius-rounded)" }}>
        <Avatar size="md" theme="photo" src={max.photo} alt="" />
      </Link>,
    ]} />}
    hero={(
      <Stack gap="md" align="center">
        <TooltipSurface color="white-overlay">Hey Max, I'm Blinky, your bestest buddy</TooltipSurface>
        <ReactionPicture kind="lol" size={96} />
      </Stack>
    )}
    bottomNavigation={<BottomNavigation aria-label="Health coach" value={root} onValueChange={setRoot} showLabels items={[
      { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
      { id: "coach", label: "Coach", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
      …Track · Explore
    ]} />}
  >
    <Stack gap="xl">
      <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-label="Today's trackers">
        <Stack as="li" gap="xs" align="center">
          {/* zen-allow-no-tooltip: the value and name sit right under the button. */}
          <IconButton size="lg" level="tertiary" icon="icon-droplets-01-line" aria-label="Water, 0 of 8 glasses. Add a glass" tooltip={false} onClick={addGlass} />
          <Text as="span" textStyle="Caption/Medium" tabularNumbers aria-hidden="true">0 / 8</Text>
          <Text as="span" textStyle="Caption/Regular" tone="light" aria-hidden="true">Water</Text>
        </Stack>
        …Steps 0 / 5k · Fasting Start · Mood Log
      </Stack>
      <Card as="section" aria-label="Coach Avo">
        <Stack gap="sm">
          <Badge size="sm" theme="violet" leading="icon-stars-01-line">Coach Avo</Badge>
          <Text tone="base">Over the next 3 days I'll learn your routine and tune your plan. Let's make it count!</Text>
          <ProgressBar value={33} aria-label="Coach plan: day 1 of 3" />
        </Stack>
      </Card>
      <Stack as="section" gap="md" aria-labelledby="plan">
        …Today's plan · Edit (Link) (the title row)…
        <List aria-labelledby="plan">
          <ListItem title="Breakfast: oats & berries" caption="08:00 · 350 kcal" onClick={open}
            leading={<Avatar size="md" shape="square" theme="green" background="subtle" alt="">Br</Avatar>}
            trailing={<Icon name="icon-chevron-right-line-medium" decorative />} />
          …
        </List>
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
];
