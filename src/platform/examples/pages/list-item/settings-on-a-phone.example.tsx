import { useId, useRef, useState, type RefObject } from "react";
import { AppShell, Box, DockIcon, Heading, Icon, List, ListBox, ListItem, Stack, TopNavigation, type DockIconTheme, type IconName } from "@zen-ds/react";

type Choice = { id: string; label: string; caption?: string };
type Setting = { id: string; title: string; icon: IconName; theme: DockIconTheme; choices: Choice[] };
const settingGroups: { id: string; title: string; settings: Setting[] }[] = [
  {
    id: "preferences", title: "Preferences", settings: [
      { id: "language", title: "Language", icon: "icon-translate-line", theme: "blue", choices: [{ id: "en", label: "English" }, { id: "vi", label: "Tiếng Việt" }] },
      { id: "appearance", title: "Appearance", icon: "icon-sun-line", theme: "violet", choices: [{ id: "system", label: "Match system" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }] },
      { id: "text", title: "Text size", icon: "icon-type-01-line", theme: "indigo", choices: [{ id: "default", label: "Default" }, { id: "large", label: "Large" }, { id: "larger", label: "Larger" }] },
      { id: "week", title: "Week starts on", icon: "icon-calendar-line", theme: "orange", choices: [{ id: "mon", label: "Monday" }, { id: "sun", label: "Sunday" }, { id: "sat", label: "Saturday" }] },
      { id: "time", title: "Time format", icon: "icon-clock-line", theme: "teal", choices: [{ id: "12", label: "12-hour", caption: "10:30 am" }, { id: "24", label: "24-hour", caption: "10:30" }] },
      { id: "start", title: "Start screen", icon: "icon-home-02-line", theme: "green", choices: [{ id: "home", label: "Home" }, { id: "tasks", label: "My tasks" }, { id: "inbox", label: "Inbox" }] },
    ],
  },
  {
    id: "notifications", title: "Notifications", settings: [
      {
        id: "push", title: "Push notifications", icon: "icon-bell-01-line", theme: "red", choices: [
          { id: "all", label: "All activity", caption: "Comments, reviews, mentions and status changes" },
          { id: "direct", label: "Mentions and reviews", caption: "Only when someone needs you" },
          { id: "off", label: "Off" },
        ],
      },
      { id: "digest", title: "Email digest", icon: "icon-mail-01-line", theme: "cyan", choices: [{ id: "daily", label: "Daily at 8:00 am" }, { id: "weekly", label: "Weekly on Monday" }, { id: "off", label: "Off" }] },
      { id: "reminders", title: "Task reminders", icon: "icon-alarm-clock-line", theme: "yellow", choices: [{ id: "hour", label: "1 hour before" }, { id: "day", label: "1 day before" }, { id: "off", label: "Off" }] },
      { id: "quiet", title: "Quiet hours", icon: "icon-moon-01-line", theme: "plum", choices: [{ id: "night", label: "10:00 pm – 7:00 am" }, { id: "evening", label: "8:00 pm – 8:00 am" }, { id: "off", label: "Off" }] },
    ],
  },
  {
    id: "privacy", title: "Privacy", settings: [
      { id: "online", title: "Online status", icon: "icon-eye-line", theme: "purple", choices: [{ id: "studio", label: "Everyone in the studio" }, { id: "teams", label: "My teams only" }, { id: "nobody", label: "Nobody" }] },
      { id: "photo", title: "Profile photo", icon: "icon-user-circle-line", theme: "pink", choices: [{ id: "everyone", label: "Everyone", caption: "Studio members and client guests" }, { id: "studio", label: "Studio members only" }] },
      { id: "receipts", title: "Read receipts", icon: "icon-check-done-line", theme: "teal", choices: [{ id: "on", label: "On" }, { id: "off", label: "Off" }] },
    ],
  },
  {
    id: "storage", title: "Storage and data", settings: [
      { id: "downloads", title: "Download files", icon: "icon-download-01-line", theme: "blue", choices: [{ id: "wifi", label: "On Wi-Fi only" }, { id: "any", label: "On Wi-Fi and mobile data" }, { id: "ask", label: "Ask every time" }] },
      { id: "offline", title: "Offline projects", icon: "icon-hard-drive-line", theme: "brown", choices: [{ id: "pinned", label: "Pinned projects" }, { id: "active", label: "All active projects" }, { id: "none", label: "None" }] },
      { id: "video", title: "Video quality", icon: "icon-video-recorder-line", theme: "crimson", choices: [{ id: "auto", label: "Auto" }, { id: "high", label: "High" }, { id: "saver", label: "Data saver" }] },
    ],
  },
];
const allSettings = settingGroups.flatMap((group) => group.settings);
const firstValues: Record<string, string> = {
  language: "en", appearance: "system", text: "default", week: "mon", time: "12", start: "home", push: "direct", digest: "daily",
  reminders: "hour", quiet: "night", online: "studio", photo: "everyone", receipts: "on", downloads: "wifi", offline: "pinned", video: "auto",
};

/** Settings on a phone: a grouped list whose rows drill down to a pick-one list. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneSettings({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const baseId = useId();
  const [values, setValues] = useState(firstValues);
  const [openId, setOpenId] = useState<string | null>(null);
  // The setting last opened: Back returns focus to its row.
  const [fromId, setFromId] = useState<string | null>(null);
  // Focus follows the screen: a pushed screen focuses its title, Back returns to the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const setting = allSettings.find((item) => item.id === openId);
  const labelOf = (item: Setting) => item.choices.find((choice) => choice.id === values[item.id])?.label;
  const open = (item: Setting) => {
    setOpenId(item.id);
    setFromId(item.id);
    setTimeout(() => titleRef.current?.focus());
  };
  const goBack = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  if (!setting) {
    return (
      // Settings is a tab root: the large title folds into the bar as the groups scroll under it. A grouped list: each
      // group a ListBox on the screen's Canvas under its kicker. Rows have no side padding of their own: the ListBox pads
      // Card-padding-medium (20px on a phone), so the row text sits 20px from every edge and a row's hover fill (12px
      // outside it) 8px, concentric with its 2XLarge corners (24px = the fill's Large 16px + 8px); the kicker lines up
      // with the row text (paddingX lg).
      <AppShell key="settings" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Settings" largeTitle="Settings" />}>
        <Stack gap="lg">
          {settingGroups.map((group) => (
            <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${baseId}-${group.id}`}>
              <Box paddingX="lg">
                <Heading level={2} id={`${baseId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
              </Box>
              <ListBox>
                <List aria-labelledby={`${baseId}-${group.id}`}>
                  {group.settings.map((item) => (
                    <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
                      title={item.title} caption={labelOf(item)}
                      leading={<DockIcon icon={item.icon} theme={item.theme} background="solid" />}
                      trailing={<Icon name="icon-chevron-right-line-small" decorative />}
                      onClick={() => open(item)} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          ))}
        </Stack>
      </AppShell>
    );
  }
  return (
    // A pushed screen of the same grouped list: compact-alt bar with Back, which returns focus to the setting it came
    // from.
    <AppShell key={setting.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{setting.title}</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: goBack }} />}>
      {/* Pick one: the current value is the Selected row, with a check so it doesn't rely on the fill alone. */}
      <ListBox>
        <List aria-label={setting.title}>
          {setting.choices.map((choice) => {
            const current = values[setting.id] === choice.id;
            return (
              <ListItem key={choice.id} title={choice.label} caption={choice.caption} selected={current}
                trailing={current ? <Icon name="icon-check-line" decorative /> : undefined}
                onClick={() => setValues((state) => ({ ...state, [setting.id]: choice.id }))} />
            );
          })}
        </List>
      </ListBox>
    </AppShell>
  );
}
