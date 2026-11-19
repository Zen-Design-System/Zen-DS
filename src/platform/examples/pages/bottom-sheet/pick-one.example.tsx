import { useId, useRef, useState, type RefObject } from "react";
import {
  AppShell, BottomSheet, Box, DockIcon, EmptyState, Heading, Icon, List, ListBox, ListItem, Search, Stack, TopNavigation, type DockIconTheme, type IconName,
} from "@zen-ds/react";
import { TODAY, formatTime } from "../../data";

type Zone = { id: string; city: string; offset: number };
const zones: Zone[] = [
  { id: "honolulu", city: "Honolulu", offset: -10 },
  { id: "los-angeles", city: "Los Angeles", offset: -7 },
  { id: "new-york", city: "New York", offset: -4 },
  { id: "london", city: "London", offset: 1 },
  { id: "berlin", city: "Berlin", offset: 2 },
  { id: "dubai", city: "Dubai", offset: 4 },
  { id: "kolkata", city: "Kolkata", offset: 5.5 },
  { id: "bangkok", city: "Bangkok", offset: 7 },
  { id: "hanoi", city: "Hanoi", offset: 7 },
  { id: "ho-chi-minh-city", city: "Ho Chi Minh City", offset: 7 },
  { id: "jakarta", city: "Jakarta", offset: 7 },
  { id: "singapore", city: "Singapore", offset: 8 },
  { id: "hong-kong", city: "Hong Kong", offset: 8 },
  { id: "seoul", city: "Seoul", offset: 9 },
  { id: "tokyo", city: "Tokyo", offset: 9 },
  { id: "sydney", city: "Sydney", offset: 10 },
  { id: "auckland", city: "Auckland", offset: 13 },
];
/** "GMT+7" · "GMT−4" · "GMT+5:30" */
const gmt = (offset: number) => `GMT${offset < 0 ? "−" : "+"}${Math.trunc(Math.abs(offset))}${offset % 1 ? `:${String(Math.abs(offset % 1) * 60).padStart(2, "0")}` : ""}`;
/** The time there now (the studio is on GMT+7). */
const timeIn = (offset: number) => formatTime(new Date(TODAY.getTime() + (offset - 7) * 3_600_000));
// Every row opens a choice; Time zone is the long one (no `options`: it has its own sheet with a Search).
type Setting = { id: string; title: string; icon: IconName; theme: DockIconTheme; options?: string[] };
const settingGroups: { id: string; title: string; settings: Setting[] }[] = [
  { id: "region", title: "Language and region", settings: [
    { id: "language", title: "Language", icon: "icon-message-text-circle-line", theme: "blue", options: ["English", "Tiếng Việt"] },
    { id: "zone", title: "Time zone", icon: "icon-clock-line", theme: "green" },
    { id: "week", title: "Week starts on", icon: "icon-calendar-line", theme: "orange", options: ["Monday", "Sunday", "Saturday"] },
  ] },
  { id: "notifications", title: "Notifications", settings: [
    { id: "push", title: "Push notifications", icon: "icon-bell-01-line", theme: "red", options: ["All activity", "Mentions and replies", "Off"] },
    { id: "digest", title: "Email digest", icon: "icon-mail-01-line", theme: "blue", options: ["Daily", "Weekly", "Off"] },
    { id: "reminders", title: "Task reminders", icon: "icon-alarm-clock-line", theme: "orange", options: ["On the due date", "A day before", "Off"] },
    { id: "quiet", title: "Quiet hours", icon: "icon-moon-01-line", theme: "indigo", options: ["Off", "10:00 pm – 7:00 am", "11:00 pm – 8:00 am"] },
  ] },
  { id: "privacy", title: "Privacy", settings: [
    { id: "presence", title: "Show when I'm active", icon: "icon-eye-line", theme: "green", options: ["Everyone at Đìzai", "My teams", "Nobody"] },
    { id: "receipts", title: "Read receipts", icon: "icon-message-check-circle-line", theme: "teal", options: ["On", "Off"] },
    { id: "profile", title: "Who can see my profile", icon: "icon-users-line", theme: "violet", options: ["Everyone at Đìzai", "My teams", "Only me"] },
  ] },
  { id: "storage", title: "Storage", settings: [
    { id: "cellular", title: "Download over mobile data", icon: "icon-download-cloud-01-line", theme: "cyan", options: ["Always", "Files under 50 MB", "Never"] },
    { id: "quality", title: "Photo upload quality", icon: "icon-image-line", theme: "pink", options: ["Original", "High", "Data saver"] },
    { id: "offline", title: "Keep offline", icon: "icon-hard-drive-line", theme: "golden", options: ["Pinned projects", "Recent files", "Nothing"] },
    { id: "cleanup", title: "Remove offline files after", icon: "icon-trash-line", theme: "crimson", options: ["7 days", "30 days", "Never"] },
  ] },
];
const allSettings = settingGroups.flatMap((group) => group.settings);
const initialValues: Record<string, string> = {
  language: "English", week: "Monday", push: "Mentions and replies", digest: "Weekly", reminders: "A day before", quiet: "10:00 pm – 7:00 am",
  presence: "Everyone at Đìzai", receipts: "On", profile: "Everyone at Đìzai", cellular: "Files under 50 MB", quality: "High", offline: "Pinned projects", cleanup: "30 days",
};
const check = <Icon name="icon-check-line" size="base" decorative />;

/** The phone app's Settings: each row opens a Bottom Sheet to pick one value. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PickOne({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // The last setting opened keeps titling its sheet while it slides away.
  const [lastId, setLastId] = useState("language");
  const [values, setValues] = useState(initialValues);
  const [zoneId, setZoneId] = useState("ho-chi-minh-city");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const groupId = useId();
  const zone = zones.find((item) => item.id === zoneId)!;
  const q = query.trim().toLowerCase();
  const matches = zones.filter((item) => item.city.toLowerCase().includes(q) || gmt(item.offset).toLowerCase().includes(q));
  const open = (id: string) => { setOpenId(id); setLastId(id); };
  const close = () => { setOpenId(null); setQuery(""); };
  const last = allSettings.find((setting) => setting.id === lastId)!;
  return (
    <>
      {/* Grouped list: each group a ListBox on the screen's Canvas, under the kicker that names it. Rows have no padding
          of their own, so the ListBox pads them Card-padding-medium (20px on a phone); their hover hangs 12px outside the
          row and sits 8px from every edge, concentric with its corners (2XLarge 24px = the fill's Large 16px + 8px). The
          kicker lines up with the row content (lg, 20px). The large title folds as the settings run under the bar. */}
      <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Settings" largeTitle="Settings" />}>
        {settingGroups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
            <Box paddingX="lg"><Heading level={2} id={`${groupId}-${group.id}`} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading></Box>
            <ListBox>
              <List aria-labelledby={`${groupId}-${group.id}`}>
                {group.settings.map((setting) => (
                  <ListItem key={setting.id} title={setting.title} caption={setting.options ? values[setting.id] : `${zone.city} (${gmt(zone.offset)})`}
                    leading={<DockIcon icon={setting.icon} theme={setting.theme} background="subtle" size="md" />}
                    trailing={<Icon name="icon-chevron-right-line" size="base" decorative />} aria-haspopup="dialog" onClick={() => open(setting.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
      {/* A short choice hugs its rows (flex); picking closes the sheet and focus returns to the row. */}
      <BottomSheet inline open={openId !== null && openId !== "zone"} onOpenChange={(shown) => { if (!shown) close(); }} title={last.title}>
        <List aria-label={last.title}>
          {(last.options ?? []).map((option) => (
            <ListItem key={option} title={option} selected={option === values[last.id]} trailing={option === values[last.id] ? check : undefined}
              onClick={() => { setValues((all) => ({ ...all, [last.id]: option })); close(); }} />
          ))}
        </List>
      </BottomSheet>
      {/* A long list takes the full height, with a Search under the header; the list scrolls, the header stays. */}
      <BottomSheet inline size="max" open={openId === "zone"} onOpenChange={(shown) => { if (!shown) close(); }} title="Time zone"
        search={<Search ref={searchRef} shape="rounded" placeholder="Search cities" aria-label="Search cities" value={query} onValueChange={setQuery} />}>
        {matches.length ? (
          <List aria-label="Time zones">
            {matches.map((item) => (
              <ListItem key={item.id} title={item.city} caption={`${gmt(item.offset)} · ${timeIn(item.offset)}`} selected={item.id === zoneId}
                trailing={item.id === zoneId ? check : undefined} onClick={() => { setZoneId(item.id); close(); }} />
            ))}
          </List>
        ) : (
          <EmptyState size="sm" headingLevel={3} icon="icon-search-medium-line" title="No cities match" secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
            {`No city or offset contains “${query.trim()}”.`}
          </EmptyState>
        )}
      </BottomSheet>
    </>
  );
}
