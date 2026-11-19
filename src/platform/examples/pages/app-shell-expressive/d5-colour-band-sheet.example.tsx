import { useId, useState, type ReactNode } from "react";
import {
  AppShell, Avatar, Badge, BottomNavigation, Box, Button, Card, Heading, Icon, Link, List, ListItem, ProgressBar, Stack, Text, TopNavigation,
  useToast, type AvatarProps, type BottomNavigationItem,
} from "@zen-ds/react";
import { people } from "../../data";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;

/**
 * A tappable account photo (Figma Avatar/Single in a Trailing-Slot): the Avatar drawn as it is, made one labelled button.
 * The button lays its Avatar out as a flex item (no text line around it, so it stays the Avatar's 56 and centres in the
 * bar) and rounds its focus ring like the round Avatar. On the Accent/Solid band the AppShell rings the band's controls
 * in Focus/Neutral/Solid itself.
 */
function ProfileButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <Link as="button" aria-label={label} onClick={onClick} style={{ display: "flex", borderRadius: "var(--zen-corner-radius-rounded)" }}>{children}</Link>;
}

const quizRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "search", label: "Search", icon: "icon-search-medium-line" },
  { id: "progress", label: "Progress", icon: "icon-bar-chart-up-line" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const liveQuizzes: { id: string; initials: string; theme: AvatarTheme; title: string; caption: string }[] = [
  { id: "statistics", initials: "St", theme: "violet", title: "Statistics math quiz", caption: "Math · 12 quizzes" },
  { id: "integers", initials: "In", theme: "blue", title: "Integers quiz", caption: "Math · 10 quizzes" },
  { id: "music-theory", initials: "Mu", theme: "pink", title: "Music theory basics", caption: "Music · 8 quizzes" },
];

/** D5 · Colour band + sheet (Figma ◇ Master-Layout · Example, 15952:9644): AppShell/Mobile · Phone · Top=Band-Sheet ·
 *  Bottom=Floating. The band and its large title scroll away under the sheet (the bar is not pinned), so the
 *  TopNavigation takes no scrollRef. */
export default function ColourBandPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const liveId = useId();
  return (
    // Band-Sheet + Floating: the Accent/Solid band (band="accent": the bar turns Transparent-On-Color) carries the
    // greeting (a Capline over the name) and the avatar in Header-Trailing, then a white card with the recent quiz and a
    // Glass panel (its text Neutral, as on any Surface); the list lives on the Surface sheet that rises over the band
    // with 3XLarge top corners. The band is the one strong colour on the screen.
    <AppShell mobileTop="band-sheet" band="accent"
      topNavigation={<TopNavigation largeTitle="Madelyn Dias" largeTitleCapline="GOOD MORNING"
        largeTitleAction={(
          <ProfileButton label="Madelyn's profile" onClick={() => toast({ title: "Madelyn Dias", children: "Level 12 · 4,820 points" })}>
            <Avatar size="lg" theme="photo" src={people.ava.photo} alt="" />
          </ProfileButton>
        )} />}
      hero={(
        // The screen's Hero pads 24 · 48 where the slot pads 8 · 24 (Figma instance override): the Stack adds
        // Spacing/Padding/Medium above and below, the Box Padding/XSmall more below.
        <Box style={{ paddingBottom: "var(--zen-spacing-padding-xsmall)" }}>
          <Stack gap="md" paddingY="md">
            <Card theme="default">
              <Stack gap="sm">
                <Stack direction="row" gap="sm" align="center">
                  <Stack gap="3xs" width="fill">
                    <Text textStyle="All-Caps/S" tone="light">Recent quiz</Text>
                    <Text textStyle="Body/Base/Bold">A basic music quiz</Text>
                  </Stack>
                  <Badge theme="violet" leadingIcon={false}>65%</Badge>
                </Stack>
                <ProgressBar value={65} aria-label="A basic music quiz" />
              </Stack>
            </Card>
            {/* Figma's Featured panel: Surface/Glass on the band, Corner-Radius/XLarge, Spacing/Padding/Large. */}
            <Box padding="lg" radius="xl" style={{ background: "var(--zen-color-background-surface-glass)" }}>
              <Stack gap="sm" align="center">
                <Text textStyle="All-Caps/S" tone="base">Featured</Text>
                <Text textStyle="Body/Base/Bold" align="center" maxWidth={280}>Take part in challenges with friends or other players</Text>
                <Button size="sm" level="primary" startIcon="icon-users-plus-line" onClick={() => toast({ title: "Find friends", children: "Invite from your contacts or share your player code." })}>Find friends</Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}
      bottomNavigation={<BottomNavigation type="floating" aria-label="Quiz app" value={root} onValueChange={setRoot} items={quizRoots}
        action={{ icon: "icon-plus-line", label: "Create a quiz", theme: "primary", onClick: () => toast({ title: "Create a quiz", children: "Pick a topic, add questions, invite players." }) }} />}
    >
      {/* The list that closes the sheet is an open section (usage rules §19, §13): its title row over a List, Spacing/Gap/
          Medium apart, as Figma D5's "Live quizzes" (Title-Row over a List frame, rows 2 apart). */}
      <Stack as="section" gap="md" aria-labelledby={liveId}>
        <Stack direction="row" justify="between" align="center" gap="xs">
          <Heading level={2} id={liveId} textStyle="Heading/4">Live quizzes</Heading>
          <Text as="span" textStyle="Body/Base/Bold">
            <Link as="button" tone="inherit" onClick={() => setRoot("search")}>See All</Link>
          </Text>
        </Stack>
        <List aria-labelledby={liveId}>
          {liveQuizzes.map((quiz) => (
            <ListItem key={quiz.id} title={quiz.title} caption={quiz.caption}
              leading={<Avatar size="md" shape="square" theme={quiz.theme} background="subtle" alt="">{quiz.initials}</Avatar>}
              trailing={<Icon name="icon-chevron-right-line-medium" decorative />}
              onClick={() => toast({ title: quiz.title, children: `${quiz.caption} · join the live round` })} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}
