import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, BottomNavigation, BottomSheet, Box, Card, DescriptionList, FileIcon, Heading, IconButton, InputField, List, ListBox, ListItem, Menu,
  Stack, Text, TopNavigation, fileIconFormatOf, plural, useFormState, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatBytes, formatRelative, people, studio, type PersonId } from "../../data";

type PhoneFile = { id: string; name: string; bytes: number; owner: PersonId; updated: Date; offline: boolean };
const minutesAgo = (m: number) => new Date(TODAY.getTime() - m * 60_000);
const phoneFiles: PhoneFile[] = [
  { id: "p1", name: "Points history.fig", bytes: 18_400_000, owner: "chi", updated: minutesAgo(13), offline: true },
  { id: "p2", name: "Rewards API.json", bytes: 86_000, owner: "bao", updated: daysFromToday(-2, 9, 40), offline: false },
  { id: "p3", name: "Android test plan.pdf", bytes: 640_000, owner: "em", updated: daysFromToday(-8, 16, 15), offline: false },
  { id: "p4", name: "Store locator.fig", bytes: 9_800_000, owner: "chi", updated: daysFromToday(-1, 15, 20), offline: false },
  { id: "p5", name: "Loyalty brief v2.pdf", bytes: 1_100_000, owner: "duy", updated: daysFromToday(-12, 11, 0), offline: true },
  { id: "p6", name: "Sprint 6 report.xlsx", bytes: 420_000, owner: "duy", updated: daysFromToday(-3, 17, 30), offline: false },
  { id: "p7", name: "Onboarding flow.fig", bytes: 12_600_000, owner: "gia", updated: daysFromToday(-6, 10, 5), offline: false },
  { id: "p8", name: "Push copy.docx", bytes: 54_000, owner: "linh", updated: daysFromToday(-4, 14, 45), offline: false },
  { id: "p9", name: "App icon set.zip", bytes: 7_300_000, owner: "gia", updated: daysFromToday(-15, 9, 10), offline: false },
  { id: "p10", name: "Release notes 1.4.docx", bytes: 38_000, owner: "bao", updated: daysFromToday(-1, 18, 2), offline: false },
  { id: "p11", name: "Usability notes.pdf", bytes: 2_200_000, owner: "ava", updated: daysFromToday(-9, 13, 30), offline: false },
  { id: "p12", name: "Points rules.xlsx", bytes: 96_000, owner: "duy", updated: daysFromToday(-20, 10, 0), offline: false },
  { id: "p13", name: "Kickoff deck.key", bytes: 31_000_000, owner: "hana", updated: daysFromToday(-70, 15, 0), offline: false },
  { id: "p14", name: "Receipt scanner.mp4", bytes: 48_000_000, owner: "emi", updated: daysFromToday(-5, 16, 50), offline: false },
  { id: "p15", name: "Brand colours.pdf", bytes: 3_400_000, owner: "gia", updated: daysFromToday(-30, 12, 0), offline: false },
];
/** Đìzai Studio's Zen app on a phone: the roots of its tab bar. */
const zenRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "files", label: "Files", icon: "icon-file-doc-line", selectedIcon: "icon-file-doc-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const back = "icon-chevron-left-line-medium" as const;

/** The Files tab of the studio's phone app: each row opens its file, and its ⋯ holds a few short actions. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneFileMenu({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const recentId = useId();
  const earlierId = useId();
  const [files, setFiles] = useState(phoneFiles);
  const [openId, setOpenId] = useState<string | null>(null);
  // The file that was open last: Back lands on its row.
  const [fromId, setFromId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<PhoneFile | null>(null);
  // Focus follows the screen: a file's screen focuses its title, Back returns to the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const opened = files.find((file) => file.id === openId);
  /** A place this example does not draw: the toast says so, and the bar keeps this root. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the menu." });
  const openFile = (file: PhoneFile) => {
    setOpenId(file.id);
    setFromId(file.id);
    setTimeout(() => titleRef.current?.focus());
  };
  const closeFile = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  const form = useFormState<{ name: string }>({
    initialValues: { name: "" },
    validate: ({ name }) => ({ name: !name.trim() ? "Enter a file name" : undefined }),
    onSubmit: ({ name }) => {
      if (!renaming) return;
      const ext = renaming.name.split(".").pop();
      const next = name.trim().endsWith(`.${ext}`) ? name.trim() : `${name.trim()}.${ext}`;
      setFiles((list) => list.map((file) => (file.id === renaming.id ? { ...file, name: next } : file)));
      setRenaming(null);
      toast({ title: "File renamed", children: next });
    },
  });
  // Rename opens with the name filled in, without its extension (the file keeps it).
  const rename = (file: PhoneFile) => {
    form.reset({ name: file.name.replace(/\.[^.]+$/, "") });
    setRenaming(file);
  };
  const toggleOffline = (file: PhoneFile) => {
    setFiles((list) => list.map((item) => (item.id === file.id ? { ...item, offline: !item.offline } : item)));
    toast({ title: file.offline ? "Offline copy removed" : "Available offline", children: file.name });
  };
  const remove = (file: PhoneFile) => {
    const index = files.findIndex((item) => item.id === file.id);
    setFiles((list) => list.filter((item) => item.id !== file.id));
    toast({ title: "File deleted", children: file.name, action: { label: "Undo", onClick: () => setFiles((list) => [...list.slice(0, index), file, ...list.slice(index)]) } });
  };
  const caption = (file: PhoneFile) => `${formatBytes(file.bytes)} · ${file.offline ? "Available offline" : formatRelative(file.updated)}`;

  // On a phone the menu opens as an action Bottom Sheet by itself, titled by the button's name.
  const fileMenu = (file: PhoneFile) => (
    <Menu align="end"
      trigger={<IconButton appearance="flat" level="primary" size="md" icon="icon-dots-horizontal-line" aria-label={`More actions for ${file.name}`} />}
      items={[
        { id: "copy", label: "Copy link", icon: "icon-link-01-line", onSelect: () => {
          void navigator.clipboard?.writeText(`https://zen.dizai.studio/files/${file.id}`).catch(() => undefined);
          toast({ title: "Link copied" });
        } },
        { id: "rename", label: "Rename…", icon: "icon-edit-02-line", onSelect: () => rename(file) },
        { id: "offline", label: file.offline ? "Remove offline copy" : "Make available offline", icon: file.offline ? "icon-cloud-off-line" : "icon-download-cloud-01-line", onSelect: () => toggleOffline(file) },
        { type: "separator" },
        { id: "delete", label: "Delete file", icon: "icon-trash-line", danger: true, onSelect: () => remove(file) },
      ]} />
  );

  if (opened) {
    return (
      // A pushed screen: the compact bar with Back and the file's name (the screen's h1), the file's one action in the
      // Action bar the shell pins to the bottom, no tab bar.
      <AppShell key={opened.id}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{opened.name}</span>}
          leading={{ icon: back, label: "Back", onClick: closeFile }} />}
        actionBar={<ActionBar primaryAction={{ label: opened.offline ? "Remove offline copy" : "Make available offline", onClick: () => toggleOffline(opened) }} />}
      >
        <Stack gap="sm" align="center" paddingY="md">
          <FileIcon format={fileIconFormatOf(opened.name)} size="3xl" />
          <Text textStyle="Body/Small/Regular" tone="base" align="center">{`${formatBytes(opened.bytes)} · Loyalty app · Phin & Co`}</Text>
        </Stack>
        <Card theme="default">
          <DescriptionList divider layout="inline" items={[
            { term: "Size", description: formatBytes(opened.bytes) },
            { term: "Owner", description: people[opened.owner].name },
            { term: "Project", description: "Loyalty app" },
            { term: "Updated", description: formatRelative(opened.updated) },
            { term: "On this phone", description: opened.offline ? "Available offline" : "Online only" },
          ]} />
        </Card>
      </AppShell>
    );
  }

  // Files changed this week first, then the rest; both keep the order they had.
  const weekAgo = daysFromToday(-7, 0, 0);
  const groups = [
    { id: recentId, title: "This week", rows: files.filter((file) => file.updated >= weekAgo) },
    { id: earlierId, title: "Earlier", rows: files.filter((file) => file.updated < weekAgo) },
  ].filter((group) => group.rows.length);
  return (
    // A tab root of Đìzai Studio's Zen app: the large title folds as the files scroll under the bar; the tab bar casts a
    // shadow, so the file groups take the same Shadow elevation.
    <AppShell key="files"
      topNavigation={<TopNavigation scrollRef={scrollRef} title="Files" largeTitle="Files" largeTitleSubheading={`Loyalty app · ${plural(files.length, "file")}`} />}
      bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={zenRoots} value="files"
        onValueChange={(id) => { if (id !== "files") notHere(zenRoots.find((item) => item.id === id)?.label ?? id); }} />}
    >
      {groups.map((group) => (
        <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
          {/* The kicker lines up with the rows' text, which the ListBox pads (lg). */}
          <Box paddingX="lg"><Heading level={2} id={group.id} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading></Box>
          <ListBox theme="shadow">
            <List aria-labelledby={group.id}>
              {group.rows.map((file) => (
                // The row opens the file; its ⋯ is a separate target with a few short actions.
                <ListItem key={file.id} ref={file.id === fromId ? rowRef : undefined} tabIndex={file.id === fromId ? -1 : undefined}
                  title={file.name} caption={caption(file)}
                  leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                  onClick={() => openFile(file)}
                  trailing={fileMenu(file)} />
              ))}
            </List>
          </ListBox>
        </Stack>
      ))}
      {/* Rename is a Bottom Sheet form: it opens above the shell's tab bar. */}
      <BottomSheet open={Boolean(renaming)} onOpenChange={(open) => { if (!open) setRenaming(null); }} title="Rename file"
        onSubmit={form.handleSubmit} primaryAction={{ label: "Rename file" }} secondaryAction={{ label: "Cancel" }}>
        <InputField size="lg" label="File name" autoComplete="off" {...form.field("name")} />
      </BottomSheet>
    </AppShell>
  );
}
