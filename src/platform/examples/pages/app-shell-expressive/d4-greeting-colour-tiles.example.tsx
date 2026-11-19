import { useId, useState, type ReactNode, type RefObject } from "react";
import {
  AppShell, Avatar, Badge, BottomNavigation, Card, DockIcon, Heading, IconButton, Link, List, ListItem, MetricCard, Stack, Text, TopNavigation,
  useToast, type AvatarProps, type BottomNavigationItem,
} from "@zen-ds/react";
import { people } from "../../data";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;

/**
 * A tappable account photo (Figma Avatar/Single in a Trailing-Slot): the Avatar drawn as it is, made one labelled button.
 * The button lays its Avatar out as a flex item (no text line around it, so it stays the Avatar's 56 and centres in the
 * bar) and rounds its focus ring like the Avatar: round, or Corner-Radius/Base for the square Large one.
 */
function ProfileButton({ label, onClick, square = false, children }: { label: string; onClick: () => void; square?: boolean; children: ReactNode }) {
  return (
    <Link as="button" aria-label={label} onClick={onClick}
      style={{ display: "flex", borderRadius: square ? "var(--zen-corner-radius-base)" : "var(--zen-corner-radius-rounded)" }}>
      {children}
    </Link>
  );
}

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

/** D4 · Greeting + colour tiles (Figma ◇ Master-Layout · Example, 15950:9696): AppShell/Mobile · Phone · Top=Bar ·
 *  Bottom=Tab-Bar, Shadow cards on Canvas/Default. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function GreetingTilesPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [saved, setSaved] = useState(false);
  const appointmentId = useId();
  const doctorsId = useId();
  return (
    // Bar + Tab-Bar on the grey Canvas: Menu in Top-Leading, the person's photo in Top-Trailing and no bar title; the
    // two-line greeting is the screen's h1. One strong colour per row: the Solid Accent tile beside a Shadow one, then
    // the next appointment and the doctors as Shadow boxes (the tab bar casts a shadow, so every box floats).
    <AppShell
      topNavigation={<TopNavigation aria-label="Home" scrollRef={scrollRef}
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
            <Stack direction="row" gap="2xs" wrap>
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
  );
}
