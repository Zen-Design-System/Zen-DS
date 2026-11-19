import { useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, Box, Card, FormFieldset, Heading, List, ListBox, ListItem, Stack, Toggle, TopNavigation, useToast,
  type AvatarSize, type BottomNavigationItem,
} from "@zen-ds/react";
import { initials, me, studio, type Person } from "../../data";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page).
 *  Beside a written name the Avatar is decorative (alt=""). */
function PersonAvatar({ person, size }: { person: Person; size: AvatarSize }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

type PhoneSetting = { key: string; label: string; caption: string; on: boolean };
// The Zen app's Settings tab: five groups, long enough that the large title folds as the screen scrolls.
const phoneSettingGroups: Array<{ id: string; title: string; rows: PhoneSetting[] }> = [
  { id: "notifications", title: "Notifications", rows: [
    { key: "assigned", label: "Task assignments", caption: "When someone gives you a task", on: true },
    { key: "mentions", label: "Mentions and replies", caption: "When someone @mentions you or replies to you", on: true },
    { key: "due", label: "Due date reminders", caption: "At 9:00 am on the day before a task is due", on: false },
  ] },
  { id: "files", title: "Files", rows: [
    { key: "cellular", label: "Download over mobile data", caption: "Files over 50 MB still wait for Wi-Fi", on: false },
    { key: "offline", label: "Keep pinned projects offline", caption: "Loyalty app and Zen design system · 1.2 GB on this phone", on: true },
  ] },
  { id: "sounds", title: "Sounds and haptics", rows: [
    { key: "sounds", label: "Message sounds", caption: "A sound for new chat messages", on: true },
    { key: "haptics", label: "Haptic feedback", caption: "A light tap when you complete a task", on: true },
  ] },
  { id: "privacy", title: "Privacy", rows: [
    { key: "online", label: "Show when I'm online", caption: "Teammates see a green dot on your photo", on: true },
    { key: "receipts", label: "Read receipts", caption: "People see when you have read their messages", on: true },
    { key: "usage", label: "Share usage data", caption: "Anonymous crash reports that help the team fix Zen", on: false },
  ] },
  { id: "calendar", title: "Calendar", rows: [
    { key: "weekends", label: "Show weekends", caption: "Saturday and Sunday in the week view", on: false },
    { key: "weekNumbers", label: "Week numbers", caption: "The number of each week beside its first day", on: false },
    { key: "declined", label: "Show declined events", caption: "Meetings you said no to stay in your day, faded", on: false },
  ] },
];
const phoneSettingsSaved = Object.fromEntries(phoneSettingGroups.flatMap((group) => group.rows.map((row) => [row.key, row.on])));

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "settings", label: "Settings", icon: "icon-settings-01-line", selectedIcon: "icon-settings-01-solid" },
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneSettings({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const baseId = useId();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(phoneSettingsSaved);
  const on = Object.values(prefs).filter(Boolean).length;
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Toggle." });
  return (
    // The Settings root, a grouped list: each group a white block on the grey Canvas under the kicker that names it, so a
    // group reads as one unit. Toggles are not List-Item rows, so each block is a Card (20px on a phone) and the kicker
    // lines up with the row text (lg). The bottom bar casts a shadow, so every block takes the same Shadow elevation.
    <AppShell
      topNavigation={<TopNavigation title="Settings" largeTitle="Settings" largeTitleSubheading={`${on} of ${Object.keys(prefs).length} on · saved as you change them`} scrollRef={scrollRef} />}
      bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="settings"
        onValueChange={(id) => { if (id !== "settings") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
    >
      {/* The account first: the whole row opens it. */}
      <ListBox theme="shadow">
        <List aria-label="Account">
          <ListItem title={me.name} caption={`${me.role} · ${me.email}`} leading={<PersonAvatar person={me} size="large" />}
            onClick={() => toast({ title: me.name, children: `${me.role} at ${studio.name}` })} />
        </List>
      </ListBox>
      {phoneSettingGroups.map((group) => (
        <Stack as="section" key={group.id} gap="xs" aria-labelledby={`${baseId}-${group.id}`}>
          <Box paddingX="lg">
            <Heading level={2} id={`${baseId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
          </Box>
          <Card theme="shadow">
            <FormFieldset kind="toggle" legend={group.title} hideLegend>
              {group.rows.map((row) => (
                <Toggle key={row.key} size="lg" label={row.label} caption={row.caption}
                  checked={prefs[row.key]} onCheckedChange={(next) => setPrefs((current) => ({ ...current, [row.key]: next }))} bold={false} />
              ))}
            </FormFieldset>
          </Card>
        </Stack>
      ))}
    </AppShell>
  );
}
