import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, BottomNavigation, Box, Card, DescriptionList, EmptyState, FileIcon, Heading, List, ListBox, ListItem, Stack, Text, TopNavigation,
  fileIconFormatOf, plural, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, files, formatBytes, formatRelative, people, projectById, studio, type StudioFile } from "../../data";

type PhoneFile = StudioFile & { locked?: boolean };
/** Files shared with Alex, newest first. Finance's Q3 report and People Ops' salary bands are locked to him. */
const newestFirst = (list: PhoneFile[]) => [...list].sort((a, b) => b.updated.getTime() - a.updated.getTime());
const sharedFiles = newestFirst([
  ...files.map((file) => ({ ...file, locked: file.id === "f4" })),
  { id: "f7", name: "Transfer flow v4.fig", bytes: 24_600_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(0, 9, 5) },
  { id: "f8", name: "Points expiry copy.docx", bytes: 64_000, owner: "linh", project: "phin-loyalty", updated: daysFromToday(-1, 11, 30) },
  { id: "f9", name: "Customs hold states.pdf", bytes: 980_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-2, 15, 10) },
  { id: "f10", name: "Salary bands 2026.xlsx", bytes: 98_000, owner: "minhAnh", project: "zen-ds", updated: daysFromToday(-5, 9, 15), locked: true },
  { id: "f11", name: "Outdoor range moodboard.png", bytes: 8_200_000, owner: "gia", project: "saola-brand", updated: daysFromToday(-5, 10, 0) },
  { id: "f12", name: "Transfers usability notes.docx", bytes: 210_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-6, 17, 15) },
  { id: "f13", name: "Zen tokens export.json", bytes: 412_000, owner: "finn", project: "zen-ds", updated: daysFromToday(-8, 9, 50) },
  { id: "f14", name: "Tier badges.svg", bytes: 42_000, owner: "gia", project: "phin-loyalty", updated: daysFromToday(-14, 16, 30) },
  { id: "f15", name: "Shipment tracking – app map.pdf", bytes: 3_100_000, owner: "duy", project: "mekong-tracking", updated: daysFromToday(-23, 10, 15) },
]);
const bareName = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");
/** The files grouped as the phone list shows them: today, the last seven days, then everything older. */
const startOfToday = daysFromToday(0, 0, 0);
const startOfWeek = daysFromToday(-6, 0, 0);
const fileGroups = [
  { id: "today", title: "Today", rows: sharedFiles.filter((file) => file.updated >= startOfToday) },
  { id: "week", title: "This week", rows: sharedFiles.filter((file) => file.updated < startOfToday && file.updated >= startOfWeek) },
  { id: "earlier", title: "Earlier", rows: sharedFiles.filter((file) => file.updated < startOfWeek) },
];

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "projects", label: "Projects", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "files", label: "Files", icon: "icon-file-doc-line", selectedIcon: "icon-file-doc-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function NoAccess({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const groupId = useId();
  const [view, setView] = useState<"files" | "file">("file");
  const [fileId, setFileId] = useState("f4");
  const [requested, setRequested] = useState<string[]>([]);
  // Focus follows the screen: a file's screen focuses its title, Back returns to the group of the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const groupRef = useRef<HTMLHeadingElement>(null);
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Empty State." });
  const file = view === "file" ? sharedFiles.find((item) => item.id === fileId) : undefined;
  const openFile = (id: string) => {
    setFileId(id);
    setView("file");
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setView("files");
    setTimeout(() => groupRef.current?.focus());
  };

  if (!file) {
    const locked = sharedFiles.filter((item) => item.locked && !requested.includes(item.id)).length;
    return (
      // The Files root: a large title, and the app's roots in the bottom bar. The bar casts a shadow, so each group's
      // block takes the same Shadow elevation.
      <AppShell key="files"
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Files" largeTitle="Files"
          largeTitleSubheading={`${plural(sharedFiles.length, "file")} shared with you${locked ? ` · ${locked} locked` : ""}`} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="files"
          onValueChange={(id) => { if (id !== "files") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
      >
        {fileGroups.map((group) => (
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={`${groupId}-${group.id}`}>
            {/* The kicker lines up with the row text inside the block (paddingX lg, 20). */}
            <Box paddingX="lg">
              <Heading ref={group.rows.some((item) => item.id === fileId) ? groupRef : undefined} tabIndex={-1} level={2} id={`${groupId}-${group.id}`}
                textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
            </Box>
            <ListBox theme="shadow">
              <List aria-labelledby={`${groupId}-${group.id}`}>
                {group.rows.map((item) => (
                  <ListItem key={item.id} title={item.name}
                    caption={`${people[item.owner].name} · ${item.locked ? (requested.includes(item.id) ? "Access requested" : "No access") : formatRelative(item.updated)}`}
                    leading={<FileIcon format={fileIconFormatOf(item.name)} size="xl" />}
                    onClick={() => openFile(item.id)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }
  const owner = people[file.owner];
  const asked = requested.includes(file.id);
  const project = projectById(file.project);
  return (
    // A pushed screen: the compact bar with Back and the file's name, no bottom bar. A file Alex can open keeps its one
    // action in the Action bar; a locked one has nothing to open, so the Empty State carries the action.
    <AppShell key={file.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{bareName(file.name)}</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      actionBar={file.locked ? undefined : (
        <ActionBar primaryAction={{ label: "Open file", onClick: () => toast({ title: `Opening ${file.name}`, children: `${formatBytes(file.bytes)} · ${project.name}` }) }} />
      )}
    >
      {file.locked ? (
        // aria-live: the caption and the action change after a request, and a screen reader hears the new state. The
        // action stays one button whose label changes, so focus stays on it.
        <EmptyState aria-live="polite" headingLevel={2} icon="icon-lock-01-line" title="No access to this file"
          primaryAction={asked
            ? { label: "Withdraw request", level: "tertiary", onClick: () => setRequested((list) => list.filter((id) => id !== file.id)) }
            : { label: "Request access", onClick: () => setRequested((list) => [...list, file.id]) }}>
          {asked
            ? `${owner.name} has your request and answers by email.`
            : `Request access and ${owner.name}, who owns it, gets an email.`}
        </EmptyState>
      ) : (
        <>
          <Stack direction="row" gap="sm" align="center">
            <FileIcon format={fileIconFormatOf(file.name)} size="3xl" />
            <Stack gap="2xs">
              <Text textStyle="Body/Base/Bold">{file.name}</Text>
              <Text textStyle="Body/Small/Regular" tone="base">{`${project.name} · ${project.client}`}</Text>
            </Stack>
          </Stack>
          <Card theme="default">
            <DescriptionList divider items={[
              { term: "Owner", description: owner.name },
              { term: "Size", description: formatBytes(file.bytes) },
              { term: "Updated", description: formatRelative(file.updated) },
            ]} />
          </Card>
        </>
      )}
    </AppShell>
  );
}
