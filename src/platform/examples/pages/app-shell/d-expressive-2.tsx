/* App Shell examples · d-expressive-2: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "D · Expressive mobile (consumer)" (15948:9467): D4 · Greeting + colour tiles (15950:9696) and D5 · Colour band +
   sheet (15952:9644). Each phone is one Pattern/AppShell/Mobile instance; the copy, numbers and component variants are
   the ones the Figma screens hold. */
import { useId, useState, type ReactNode } from "react";
import { AppShell } from "../../../../components/AppShell";
import { Avatar, type AvatarProps } from "../../../../components/Avatar";
import { Badge } from "../../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { DockIcon } from "../../../../components/DockIcon";
import { Icon } from "../../../../components/Icon";
import { Box, Stack } from "../../../../components/Layout";
import { Link } from "../../../../components/Link";
import { List, ListItem } from "../../../../components/ListItem";
import { MetricCard } from "../../../../components/MetricWidget";
import { ProgressBar } from "../../../../components/Progress";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { TopNavigation } from "../../../../components/TopNavigation";
import { PlatformPhone } from "../../../PlatformPhone";
import { people } from "../../data";
import type { ExampleDef } from "../../types";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;

/**
 * A tappable account photo (Figma Avatar/Single in a Trailing-Slot): the Avatar drawn as it is, made one labelled button.
 * The button lays its Avatar out as a flex item (no text line around it, so it stays the Avatar's 56 and centres in the
 * bar) and rounds its focus ring like the Avatar: round, or Corner-Radius/Base for the square Large one. On the
 * Accent/Solid band the AppShell rings the band's controls in Focus/Neutral/Solid itself (app-shell.css).
 */
function ProfileButton({ label, onClick, square = false, children }: { label: string; onClick: () => void; square?: boolean; children: ReactNode }) {
  return (
    <Link as="button" aria-label={label} onClick={onClick}
      style={{ display: "flex", borderRadius: square ? "var(--zen-corner-radius-base)" : "var(--zen-corner-radius-rounded)" }}>
      {children}
    </Link>
  );
}

// ——— D4 · Greeting + colour tiles (Top=Bar · Bottom=Tab-Bar; Shadow cards on Canvas/Default) ——————————————————————
const careRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "schedule", label: "Schedule", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "doctors", label: "Doctors", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
  { id: "alerts", label: "Alerts", icon: "icon-bell-01-line", selectedIcon: "icon-bell-01-solid" },
];
/** Figma holds Dr. Richard Kim; the two rows after him fill the list below the fold. */
const doctors: { id: string; name: string; initials: string; theme: AvatarTheme; caption: string }[] = [
  { id: "kim", name: "Dr. Richard Kim", initials: "RK", theme: "teal", caption: "Cardiology · ★ 4.8" },
  { id: "patel", name: "Dr. David Patel", initials: "DP", theme: "cyan", caption: "Family therapy · ★ 4.9" },
  { id: "lin", name: "Dr. Sarah Lin", initials: "SL", theme: "violet", caption: "Dermatology · ★ 4.7" },
];

function GreetingTilesPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [saved, setSaved] = useState(false);
  const appointmentId = useId();
  const doctorsId = useId();
  return (
    <PlatformPhone label="Care booking app" canvas="default">
      {/* Bar + Tab-Bar on the grey Canvas: Menu in Top-Leading, the person's photo in Top-Trailing and no bar title; the
          two-line greeting is the screen's h1. One strong colour per row: the Solid Accent tile beside a Shadow one, then
          the next appointment and the doctors as Shadow boxes (the tab bar casts a shadow, so every box floats). */}
      <AppShell
        topNavigation={<TopNavigation aria-label="Home"
          leading={{ icon: "icon-dots-grid-line", label: "Menu", onClick: () => toast({ title: "Menu", children: "Records, payments, insurance and settings." }) }}
          trailing={[
            <ProfileButton key="profile" label="Alexander's profile" square onClick={() => toast({ title: "Alexander", children: "Profile, family members and privacy." })}>
              <Avatar size="lg" shape="square" theme="photo" src={people.alex.photo} alt="" />
            </ProfileButton>,
          ]} />}
        bottomNavigation={<BottomNavigation aria-label="Care app" value={root} onValueChange={setRoot} showLabels items={careRoots} />}
      >
        <Stack gap="xs">
          <Heading level={1} textStyle="Heading/1">
            Morning{" "}<Text as="span" textStyle="Heading/1" tone="light" truncate>Alexander</Text>
          </Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Your health data stays private and protected.</Text>
        </Stack>
        <Stack direction="row" gap="sm" fillChildren>
          <MetricCard type="tile" spacing="md" theme="solid" color="accent" label="Success rate" value="56%" icon="icon-rocket-line" />
          <MetricCard type="tile" spacing="md" label="Clients" value="286" icon="icon-users-plus-line" iconTheme="violet" />
        </Stack>
        <Stack as="section" gap="md" aria-labelledby={appointmentId}>
          <Stack direction="row" justify="between" align="center" gap="xs">
            <Heading level={2} id={appointmentId} textStyle="Heading/4">Appointment</Heading>
            {/* A section head's View All is underlined text, not a button (Zen rule); it opens the Schedule tab. */}
            <Text as="span" textStyle="Body/Base/Bold">
              <Link as="button" tone="inherit" onClick={() => setRoot("schedule")}>View All</Link>
            </Text>
          </Stack>
          <Card>
            <Stack gap="sm">
              <Stack direction="row" gap="sm" align="center">
                <DockIcon icon="icon-heart-hand-line" theme="cyan" background="solid" />
                <Stack gap="3xs" width="fill">
                  <Heading level={3} textStyle="Body/Base/Bold">Family therapy</Heading>
                  <Text textStyle="Body/Small/Regular" tone="light">Tomorrow · Dr. David Patel</Text>
                </Stack>
                <IconButton appearance="flat" level="secondary" size="sm" icon={saved ? "icon-bookmark-solid" : "icon-bookmark-line"}
                  aria-label="Save appointment" aria-pressed={saved}
                  onClick={() => { setSaved((value) => !value); toast({ title: saved ? "Removed from saved" : "Appointment saved", children: "Family therapy · Tomorrow, 5:30 pm" }); }} />
              </Stack>
              <Stack direction="row" gap="xs" wrap>
                <Badge theme="violet" background="subtle" leading="icon-clock-line">5:30 – 8:00 pm</Badge>
                <Badge theme="neutral" background="subtle" leadingIcon={false}>$100 / session</Badge>
              </Stack>
            </Stack>
          </Card>
        </Stack>
        <Stack as="section" gap="md" aria-labelledby={doctorsId}>
          <Stack direction="row" justify="between" align="center" gap="xs">
            <Heading level={2} id={doctorsId} textStyle="Heading/4">Top doctors</Heading>
            <Text as="span" textStyle="Body/Base/Bold">
              <Link as="button" tone="inherit" onClick={() => setRoot("doctors")}>View All</Link>
            </Text>
          </Stack>
          <List aria-labelledby={doctorsId}>
            {doctors.map((doctor) => (
              // The call button is the row's action, so the row itself is not clickable (Zen: no button in a clickable row).
              <ListItem key={doctor.id} title={doctor.name} caption={doctor.caption}
                leading={<Avatar size="md" shape="square" theme={doctor.theme} background="subtle" alt="">{doctor.initials}</Avatar>}
                trailing={<IconButton appearance="flat" level="primary" icon="icon-phone-line" aria-label={`Call ${doctor.name}`}
                  onClick={() => toast({ title: `Calling ${doctor.name}…`, children: doctor.caption })} />} />
            ))}
          </List>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— D5 · Colour band + sheet (Top=Band-Sheet · Bottom=Floating) ————————————————————————————————————————————————
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

function ColourBandPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const liveId = useId();
  return (
    <PlatformPhone label="Quiz app" canvas="surface">
      {/* Band-Sheet + Floating: the Accent/Solid band (band="accent": the bar turns Transparent-On-Color) carries the
          greeting (a Capline over the name) and the avatar in Header-Trailing, then a white card with the recent quiz
          and a Glass panel (its text Neutral, as on any Surface); the list lives on the Surface sheet that rises over
          the band with 3XLarge top corners. The band is the one strong colour on the screen. */}
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
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "D4 · Greeting + colour tiles",
    description: "A warm service home: a two-line greeting (name in a lighter colour) with a privacy note, two big number tiles (one Solid with On-Colors text, one Subtle: one strong colour per row) and the next appointment as a Shadow card with time and price badges; the top doctors close the screen as an open list. Menu in Top-Leading, the person's photo in Top-Trailing. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Healthcare booking, Beauty / Services, Fitness studio, Education.",
    render: () => <GreetingTilesPhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation aria-label="Home"
      leading={{ icon: "icon-dots-grid-line", label: "Menu", onClick: openMenu }}
      trailing={[
        // The account photo opens the profile: the Avatar as it is (56, square), made one labelled button.
        <Link key="profile" as="button" aria-label="Alexander's profile" onClick={openProfile}
          style={{ display: "flex", borderRadius: "var(--zen-corner-radius-base)" }}>
          <Avatar size="lg" shape="square" theme="photo" src={me.photo} alt="" />
        </Link>,
      ]} />}
    bottomNavigation={<BottomNavigation aria-label="Care app" value={root} onValueChange={setRoot} showLabels items={[
      { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
      { id: "schedule", label: "Schedule", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
      { id: "doctors", label: "Doctors", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
      { id: "alerts", label: "Alerts", icon: "icon-bell-01-line", selectedIcon: "icon-bell-01-solid" },
    ]} />}
  >
    <Stack gap="xs">
      <Heading level={1} textStyle="Heading/1">
        Morning <Text as="span" textStyle="Heading/1" tone="light" truncate>Alexander</Text>
      </Heading>
      <Text textStyle="Body/Small/Regular" tone="base">Your health data stays private and protected.</Text>
    </Stack>
    <Stack direction="row" gap="sm" fillChildren>
      <MetricCard type="tile" spacing="md" theme="solid" color="accent" label="Success rate" value="56%" icon="icon-rocket-line" />
      <MetricCard type="tile" spacing="md" label="Clients" value="286" icon="icon-users-plus-line" iconTheme="violet" />
    </Stack>
    <Stack as="section" gap="md" aria-labelledby="appointment">
      <Stack direction="row" justify="between" align="center" gap="xs">
        <Heading level={2} id="appointment" textStyle="Heading/4">Appointment</Heading>
        <Text as="span" textStyle="Body/Base/Bold"><Link as="button" tone="inherit" onClick={openSchedule}>View All</Link></Text>
      </Stack>
      <Card>
        <Stack gap="sm">
          <Stack direction="row" gap="sm" align="center">
            <DockIcon icon="icon-heart-hand-line" theme="cyan" background="solid" />
            <Stack gap="3xs" width="fill">
              <Heading level={3} textStyle="Body/Base/Bold">Family therapy</Heading>
              <Text textStyle="Body/Small/Regular" tone="light">Tomorrow · Dr. David Patel</Text>
            </Stack>
            <IconButton appearance="flat" level="secondary" size="sm" icon="icon-bookmark-line" aria-label="Save appointment" aria-pressed={saved} onClick={toggleSaved} />
          </Stack>
          <Stack direction="row" gap="xs" wrap>
            <Badge theme="violet" background="subtle" leading="icon-clock-line">5:30 – 8:00 pm</Badge>
            <Badge theme="neutral" background="subtle" leadingIcon={false}>$100 / session</Badge>
          </Stack>
        </Stack>
      </Card>
    </Stack>
    <Stack as="section" gap="md" aria-labelledby="doctors">
      …Top doctors · View All (the title row)…
      <List aria-labelledby="doctors">
        <ListItem title="Dr. Richard Kim" caption="Cardiology · ★ 4.8"
          leading={<Avatar size="md" shape="square" theme="teal" background="subtle" alt="">RK</Avatar>}
          trailing={<IconButton appearance="flat" level="primary" icon="icon-phone-line" aria-label="Call Dr. Richard Kim" onClick={call} />} />
        …
      </List>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "D5 · Colour band + sheet",
    description: "Bold top, calm list. A Solid colour band from the top edge: Top-Navigation Type=Transparent-On-Color carries the greeting (Capline + heading in On-Colors) and the avatar, then a white card and a Glass panel; the list lives on a white sheet with rounded top corners that overlaps the band. The band is the one strong colour on the screen. Shell: AppShell/Mobile · Phone · Top=Band-Sheet · Bottom=Floating. Fits: Quiz / Games, Kids / Education, Events / Tickets, Music / Media.",
    render: () => <ColourBandPhone />,
    code: `<PlatformPhone canvas="surface">
  <AppShell
    mobileTop="band-sheet"
    band="accent"
    topNavigation={<TopNavigation largeTitle="Madelyn Dias" largeTitleCapline="GOOD MORNING"
      largeTitleAction={(
        // On the Accent band the focus ring is Focus/Neutral/Solid (Focus/Accent is the band's colour).
        <Link as="button" aria-label="Madelyn's profile" onClick={openProfile}
          style={{ display: "flex", borderRadius: "var(--zen-corner-radius-rounded)" }}>
          <Avatar size="lg" theme="photo" src={madelyn.photo} alt="" />
        </Link>
      )} />}
    hero={(
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
          <Box padding="lg" radius="xl" style={{ background: "var(--zen-color-background-surface-glass)" }}>
            <Stack gap="sm" align="center">
              <Text textStyle="All-Caps/S" tone="base">Featured</Text>
              <Text textStyle="Body/Base/Bold" align="center" maxWidth={280}>Take part in challenges with friends or other players</Text>
              <Button size="sm" level="primary" startIcon="icon-users-plus-line" onClick={findFriends}>Find friends</Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    )}
    bottomNavigation={<BottomNavigation type="floating" aria-label="Quiz app" value={root} onValueChange={setRoot} items={roots}
      action={{ icon: "icon-plus-line", label: "Create a quiz", theme: "primary", onClick: createQuiz }} />}
  >
    {/* The closing list is an open section: its title row over a List, md apart. */}
    <Stack as="section" gap="md" aria-labelledby="live">
      <Stack direction="row" justify="between" align="center" gap="xs">
        <Heading level={2} id="live" textStyle="Heading/4">Live quizzes</Heading>
        <Text as="span" textStyle="Body/Base/Bold"><Link as="button" tone="inherit" onClick={openSearch}>See All</Link></Text>
      </Stack>
      <List aria-labelledby="live">
        <ListItem title="Statistics math quiz" caption="Math · 12 quizzes" onClick={openQuiz}
          leading={<Avatar size="md" shape="square" theme="violet" background="subtle" alt="">St</Avatar>}
          trailing={<Icon name="icon-chevron-right-line-medium" decorative />} />
        …Integers quiz · Music theory basics
      </List>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
];
