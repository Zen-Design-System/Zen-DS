/* Toast examples: short feedback on what the user just did, in Đìzai Studio's Zen workspace and, on the phone, in the
   Phin & Co loyalty app the studio builds (brief: docs/research/example-rebuild-brief-2026-09-30.md). Desktop examples
   call useToast(): ZenProvider hosts the stack. A persistent condition is an Alert Banner, never a toast. */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { Form, FormActions } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { InputField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Table, TableMedia, TableText, type TableColumn } from "../../../components/Table";
import { Heading, Text, plural } from "../../../components/Text";
import { ToastStack, useToast, type ToastItem } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone } from "../../PlatformPhone";
import {
  TODAY, daysFromToday, files, formatBytes, formatDay, formatRelative, initials, people, projectById,
  type Person, type PersonId, type StudioFile,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./toast.css";

export const page: PlatformPage = "toast";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, background: "subtle" as const, alt: "", children: initials(person.name) };

/* ───────────── 1. Undo a delete ───────────── */

const recentFiles = files.slice(0, 4);

function UndoDeleteExample() {
  const { toast, dismiss } = useToast();
  const titleId = useId();
  const [list, setList] = useState<StudioFile[]>(recentFiles);
  const root = useRef<HTMLElement>(null);
  const focusAt = useRef<number | StudioFile | null>(null);
  // After a delete, focus goes to the row that took its place (or the one above); after Undo, which closes its toast,
  // to the file that came back. Never to <body>.
  useEffect(() => {
    const target = focusAt.current;
    focusAt.current = null;
    if (target === null) return;
    const buttons = root.current?.querySelectorAll<HTMLElement>(".zen-list-item button") ?? [];
    const index = typeof target === "number" ? Math.min(target, buttons.length - 1) : list.indexOf(target);
    (buttons[index] ?? root.current?.querySelector<HTMLElement>(".zen-empty-state button"))?.focus();
  }, [list]);
  // Deleting is undoable, so it acts at once; Undo puts the file back where it was.
  const open = useRef(new Set<ToastItem["id"]>());
  const remove = (file: StudioFile) => {
    focusAt.current = list.indexOf(file);
    setList((current) => current.filter((item) => item.id !== file.id));
    const id: ToastItem["id"] = toast({
      title: "File deleted",
      children: file.name,
      action: { label: "Undo", onClick: () => { focusAt.current = file; setList((current) => recentFiles.filter((item) => item.id === file.id || current.includes(item))); } },
    });
    open.current.add(id);
  };
  // Restoring everything makes the open Undo toasts pointless, so they go too.
  const restoreAll = () => {
    open.current.forEach((id) => dismiss(id));
    open.current.clear();
    setList(recentFiles);
    toast({ title: `${plural(recentFiles.length, "file")} restored` });
  };
  return (
    // A ListBox: the title in its Header-Slot, the files (or the Empty State once they are all gone) in its Body-Slot.
    <ListBox ref={root} as="section" aria-labelledby={titleId} className="px-toast-card"
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Recent files</Heading>}>
      {list.length ? (
        <List aria-labelledby={titleId}>
          {list.map((file) => (
            <ListItem key={file.id} title={file.name} titleLines={2}
              caption={`${formatBytes(file.bytes)} · ${people[file.owner].name} · ${formatRelative(file.updated)}`}
              leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
              trailing={<IconButton appearance="flat" level="primary" icon="icon-trash-line" aria-label={`Delete ${file.name}`} tooltip="Delete" onClick={() => remove(file)} />} />
          ))}
        </List>
      ) : (
        <EmptyState illustration={false} icon="icon-folder-line" title="No recent files" primaryAction={{ label: "Restore files", onClick: restoreAll }}>
          Files you open in any project show up here.
        </EmptyState>
      )}
    </ListBox>
  );
}

/* ───────────── 2. One toast per event ───────────── */

const contacts: PersonId[] = ["hana", "mai", "minhAnh", "duy"];

function CopyEmailExample() {
  const { toast } = useToast();
  const titleId = useId();
  // The same id replaces the toast on screen: five copies in a row leave one toast, showing the latest address.
  const copy = (person: Person) => {
    void navigator.clipboard?.writeText(person.email).catch(() => undefined);
    toast({ id: "email-copied", title: "Email copied", children: person.email });
  };
  return (
    <ListBox as="section" aria-labelledby={titleId} className="px-toast-card"
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Who to ask</Heading>}>
      <List aria-labelledby={titleId}>
        {contacts.map((id) => (
          <ListItem key={id} title={people[id].name} caption={`${people[id].role} · ${people[id].email}`}
            leading={<Avatar size="md" {...avatarOf(people[id])} />}
            trailing={<IconButton appearance="flat" level="primary" icon="icon-copy-line" aria-label={`Copy ${people[id].name}’s email`} tooltip="Copy email" onClick={() => copy(people[id])} />} />
        ))}
      </List>
    </ListBox>
  );
}

/* ───────────── 3. Export in the background ───────────── */

type Export = { id: string; name: string; bytes: number; at: Date };
const pastExports: Export[] = [
  { id: "aug", name: "Timesheets – Aug 2026.csv", bytes: 51_200, at: daysFromToday(-29, 17, 4) },
  { id: "jul", name: "Timesheets – Jul 2026.csv", bytes: 47_900, at: daysFromToday(-61, 16, 52) },
];
type Entry = { id: string; person: PersonId; project: string; hours: number };
const entries: Entry[] = [
  { id: "e1", person: "alex", project: "lumen-banking", hours: 152.5 },
  { id: "e2", person: "bao", project: "phin-loyalty", hours: 160 },
  { id: "e3", person: "chi", project: "phin-loyalty", hours: 148 },
  { id: "e4", person: "duy", project: "mekong-tracking", hours: 96.5 },
  { id: "e5", person: "ava", project: "lumen-banking", hours: 132 },
];
const entryColumns: TableColumn<Entry>[] = [
  { id: "person", header: "Person", cell: (row) => <TableMedia media={<Avatar size="xs" {...avatarOf(people[row.person])} />}>{people[row.person].name}</TableMedia> },
  { id: "project", header: "Project", cell: (row) => <TableText>{projectById(row.project).name}</TableText> },
  { id: "hours", header: "Hours", align: "right", width: "96px", cell: (row) => <TableText>{row.hours.toFixed(1)}</TableText> },
];

function BackgroundExportExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [exports, setExports] = useState(pastExports);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<Export>(pastExports[0]);
  const [open, setOpen] = useState(false);
  const view = (item: Export) => { setPreview(item); setOpen(true); };
  const listRef = useRef<HTMLUListElement>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // The export runs on its own; the toast brings the result back with one action, the same one the list row offers.
  const start = () => {
    setRunning(true);
    timer.current = window.setTimeout(() => {
      const done: Export = { id: "sep", name: "Timesheets – Sep 2026.csv", bytes: 48_300, at: TODAY };
      setRunning(false);
      setExports((list) => [done, ...list.filter((item) => item.id !== "sep")]);
      // View closes its toast, so it opens the file from its row (first in the list): closing the preview lands there.
      toast({ type: "positive", title: "Export ready", children: done.name, action: { label: "View", onClick: () => { listRef.current?.querySelector<HTMLElement>("button")?.focus(); view(done); } } });
    }, 2400);
  };
  const download = () => { setOpen(false); toast({ title: "Download started", children: preview.name }); };
  return (
    <>
    {/* A ListBox: the title, the export status and Export CSV in its Header-Slot, the past exports in its Body-Slot. */}
    <ListBox as="section" aria-labelledby={titleId} className="px-toast-card"
      header={<Stack direction="row" justify="between" align="center" gap="xs" wrap>
        <Stack gap="2xs" className="px-toast-grow">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Timesheets</Heading>
          <Text textStyle="Body/Small/Regular" tone="base" role="status">
            {running ? "Exporting September for 48 people…" : `September 2026 · ${plural(48, "person", "people")}`}
          </Text>
        </Stack>
        <Button level="tertiary" startIcon="icon-download-01-line" disabled={running} onClick={start}>{running ? "Exporting…" : "Export CSV"}</Button>
      </Stack>}>
      <List ref={listRef} aria-label="Recent exports">
        {exports.map((item) => (
          <ListItem key={item.id} title={item.name} caption={`${formatBytes(item.bytes)} · ${formatRelative(item.at)}`}
            leading={<FileIcon format={fileIconFormatOf(item.name)} size="xl" />} onClick={() => view(item)} />
        ))}
      </List>
    </ListBox>
    <Dialog open={open} onOpenChange={setOpen} title={preview.name}
      description={`Exported ${formatRelative(preview.at).toLowerCase()} · ${formatBytes(preview.bytes)}`}
      primaryAction={{ label: "Download CSV", onClick: download }} secondaryAction={{ label: "Close" }}>
      <Table aria-label="First rows of the export" columns={entryColumns} rows={entries} />
    </Dialog>
    </>
  );
}

/* ───────────── 4. An error that waits ───────────── */

type Comment = { id: string; author: PersonId; text: string; at: Date };
const thread: Comment[] = [
  { id: "c1", author: "chi", text: "Points history is ready for review. I split pending and earned points into two tabs.", at: daysFromToday(0, 9, 5) },
  { id: "c2", author: "bao", text: "Looks good. The rewards API returns both lists already, so no backend change.", at: daysFromToday(0, 10, 17) },
];

function FailedCommentExample() {
  const { toast, dismiss } = useToast();
  const titleId = useId();
  const [comments, setComments] = useState(thread);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [attempts, setAttempts] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const post = useCallback((text: string) => {
    setComments((list) => [...list, { id: `c${list.length + 1}`, author: "alex", text, at: TODAY }]);
    setDraft("");
    dismiss("comment-failed");
  }, [dismiss]);
  // The first send drops (the connection blinked): the text stays in the field, and the Negative toast waits
  // (duration: null) until Retry or close. It never takes focus; its action is in the Tab order after the field.
  const send = () => {
    const text = draft.trim();
    if (!text) { setError("Write a comment first"); return; }
    setAttempts(attempts + 1);
    if (attempts === 0) {
      // Retry closes its toast, so focus goes back to the (now empty) field for the next comment.
      toast({ id: "comment-failed", type: "negative", title: "Comment not sent", children: "Your text is still in the box.", duration: null, action: { label: "Retry", onClick: () => { post(text); field.current?.focus(); } } });
      return;
    }
    post(text);
  };
  return (
    <Card theme="flat" spacing="md" className="px-toast-card">
      {/* Two groups in one surface (lg): the thread, then the reply form; each keeps md inside. */}
      <Stack as="section" gap="lg" aria-labelledby={titleId}>
        <Stack gap="md">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Comments</Heading>
          <List aria-labelledby={titleId}>
            {comments.map((comment) => (
              <ListItem key={comment.id} title={people[comment.author].name} caption={comment.text}
                leading={<Avatar size="md" {...avatarOf(people[comment.author])} />}
                trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{formatRelative(comment.at)}</Text>} />
            ))}
          </List>
        </Stack>
        {/* Enter sends; an empty comment shows its error on the field, and Form moves focus there. */}
        <Form onSubmit={send} gap="md" aria-label="Reply">
          <InputField ref={field} label="Comment" placeholder="Reply to Chi and Bao" value={draft} error={error}
            onValueChange={(value) => { setDraft(value); setError(undefined); }} />
          <FormActions>
            <Button level="primary" type="submit">Send comment</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}

/* ───────────── 5. On a phone (Phin & Co loyalty app) ───────────── */

type Offer = { id: string; title: string; caption: string; icon: IconName; theme: DockIconTheme };
/** This month's offers in the Phin & Co app, the ones ending soonest first. */
const offers: Offer[] = [
  { id: "o1", title: "Bánh mì combo for $3", caption: "80 points · before 10:00 am", icon: "icon-bread-line", theme: "orange" },
  { id: "o2", title: "Double points on cold brew", caption: "Every Friday in October", icon: "icon-coffee-bean-line", theme: "green" },
  { id: "o3", title: "Free cà phê sữa đá", caption: "120 points · until Oct 15", icon: "icon-coffee-cup-line", theme: "brown" },
  { id: "o4", title: "Bạc xỉu upsized for free", caption: "60 points · until Oct 18", icon: "icon-milk-line", theme: "golden" },
  { id: "o5", title: "Birthday drink on us", caption: `Your birthday week · from ${formatDay(daysFromToday(20))}`, icon: "icon-gift-01-line", theme: "pink" },
  { id: "o6", title: "Peach tea for $2", caption: "Trà đào cam sả · after 6:00 pm", icon: "icon-fruit-juice-line", theme: "crimson" },
  { id: "o7", title: "Free oat milk swap", caption: "30 points · all of October", icon: "icon-salad-leaf-line", theme: "teal" },
  { id: "o8", title: "50 bonus points", caption: "Order ahead 3 times by Oct 31", icon: "icon-zap-line", theme: "yellow" },
  { id: "o9", title: "Two for one with a friend", caption: "Weekdays 2:00–5:00 pm · until Nov 15", icon: "icon-user-plus-line", theme: "blue" },
  { id: "o10", title: "Affogato for $2.50", caption: "100 points · Nguyen Hue store only", icon: "icon-ice-cream-line", theme: "purple" },
  { id: "o11", title: "20% off whole beans", caption: "200 points · 250 g bags · until Dec 31", icon: "icon-sale-line", theme: "red" },
  { id: "o12", title: "Phin filter set for $9", caption: "300 points · while stocks last", icon: "icon-shopping-bag-01-line", theme: "plum" },
  { id: "o13", title: "$0.50 off with your own cup", caption: "Every visit · no points needed", icon: "icon-star-01-line", theme: "indigo" },
];
type Tab = "offers" | "saved" | "account";
const tabs: BottomNavigationItem[] = [
  { id: "offers", label: "Offers", icon: "icon-ticket-01-line", selectedIcon: "icon-ticket-01-solid" },
  { id: "saved", label: "Saved", icon: "icon-bookmark-line", selectedIcon: "icon-bookmark-solid" },
  { id: "account", label: "Account", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
];
const tabTitle: Record<Tab, string> = { offers: "Offers", saved: "Saved", account: "Account" };

function PhoneToastExample() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("offers");
  const [saved, setSaved] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // A phone app hosts its own ToastStack: inline above the tab bar, one toast at a time.
  const show = (item: ToastItem) => setToasts([item]);
  const dismiss = useCallback((id: ToastItem["id"]) => setToasts((list) => list.filter((item) => item.id !== id)), []);
  // Tapping the current tab again scrolls it back to the top; another tab opens at its top.
  const openTab = (next: Tab) => {
    screenRef.current?.scrollTo({ top: 0, behavior: next === tab ? "smooth" : "auto" });
    setTab(next);
    setToasts([]);
  };
  const toggle = (offer: Offer) => {
    if (saved.includes(offer.id)) {
      setSaved((list) => list.filter((id) => id !== offer.id));
      show({ id: `removed-${offer.id}`, title: "Offer removed", action: { label: "Undo", onClick: () => setSaved((list) => [...list, offer.id]) } });
      return;
    }
    setSaved((list) => [...list, offer.id]);
    show({ id: `saved-${offer.id}`, title: "Offer saved", action: { label: "View", onClick: () => openTab("saved") } });
  };
  const list = tab === "saved" ? offers.filter((offer) => saved.includes(offer.id)) : offers;
  const title = tabTitle[tab];
  return (
    <PlatformPhone label="Phin & Co" headerOverlay screenRef={screenRef}
      header={<TopNavigation title={title} largeTitle={title} scrollRef={screenRef} />}
      footer={(
        <>
          <div className="px-toast-phone-host"><ToastStack inline toasts={toasts} onDismiss={dismiss} max={1} /></div>
          <BottomNavigation aria-label="Phin & Co" items={tabs} value={tab} onValueChange={(id) => openTab(id as Tab)} showLabels />
        </>
      )}>
      {tab === "account" ? (
        <Box padding="lg">
          <DescriptionList items={[
            { term: "Member", description: "Lan Nguyen" },
            { term: "Tier", description: "Gold" },
            { term: "Points", description: "1,240", emphasis: true },
            { term: "Member since", description: "Mar 12, 2025" },
          ]} />
        </Box>
      ) : list.length ? (
        // Static rows (the only action is the Save toggle) sit in the screen margin, like the Account tab.
        <Box padding="lg">
          <List aria-label={title}>
            {list.map((offer) => {
              const isSaved = saved.includes(offer.id);
              return (
                <ListItem key={offer.id} title={offer.title} caption={offer.caption}
                  leading={<DockIcon icon={offer.icon} theme={offer.theme} background="subtle" size="md" />}
                  trailing={<IconButton appearance="flat" level="primary" icon={isSaved ? "icon-bookmark-solid" : "icon-bookmark-line"}
                    aria-label={`Save ${offer.title}`} aria-pressed={isSaved} tooltip="Save" onClick={() => toggle(offer)} />} />
              );
            })}
          </List>
        </Box>
      ) : (
        <EmptyState illustration={false} headingLevel={2} icon="icon-bookmark-line" title="No saved offers yet" primaryAction={{ label: "Browse offers", onClick: () => openTab("offers") }}>
          Save an offer to find it here at the counter.
        </EmptyState>
      )}
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Undo a delete",
    description: "Deleting a file can be undone, so it happens at once and a Neutral toast offers Undo instead of asking first. Undo puts the file back in its place; delete them all and the list says so.",
    render: () => <UndoDeleteExample />,
    code: `const { toast } = useToast();

const remove = (file) => {
  setFiles((list) => list.filter((item) => item.id !== file.id));
  // Pressing Undo runs onClick, then closes the toast.
  toast({
    title: "File deleted",
    children: file.name,
    action: { label: "Undo", onClick: () => restore(file) },
  });
};

<IconButton appearance="flat" icon="icon-trash-line" aria-label={\`Delete \${file.name}\`} onClick={() => remove(file)} />`,
  },
  {
    title: "One toast per event",
    description: "Copying is everyday feedback: Neutral, no action, gone after a few seconds. Every copy reuses one id, so copying four addresses in a row leaves a single toast showing the latest one.",
    render: () => <CopyEmailExample />,
    code: `const copy = (person) => {
  navigator.clipboard.writeText(person.email);
  // Same id: the toast on screen is replaced, not stacked.
  toast({ id: "email-copied", title: "Email copied", children: person.email });
};

<IconButton appearance="flat" icon="icon-copy-line" aria-label={\`Copy \${person.name}’s email\`} onClick={() => copy(person)} />`,
  },
  {
    title: "Export in the background",
    description: "The export runs while you keep working; when it finishes, a Positive toast brings the result back with View. The same file also lands in Recent exports, so nothing lives only in the toast.",
    render: () => <BackgroundExportExample />,
    code: `const start = async () => {
  setRunning(true);
  const file = await exportTimesheets("2026-09");
  setRunning(false);
  setExports((list) => [file, ...list]);
  toast({ type: "positive", title: "Export ready", children: file.name, action: { label: "View", onClick: () => setPreview(file) } });
};

<Button level="tertiary" startIcon="icon-download-01-line" disabled={running} onClick={start}>
  {running ? "Exporting…" : "Export CSV"}
</Button>`,
  },
  {
    title: "An error that waits",
    description: "A failed send is a Negative toast with Retry that stays until it is used or closed (duration: null), and the comment stays in the field. The toast is announced as an alert but never takes focus.",
    render: () => <FailedCommentExample />,
    code: `toast({
  id: "comment-failed",
  type: "negative",
  title: "Comment not sent",
  children: "Your text is still in the box.",
  duration: null, // errors don't time out
  action: { label: "Retry", onClick: () => post(text) },
});

// A later send that works clears it.
dismiss("comment-failed");`,
  },
  {
    title: "On a phone",
    description: "A phone app hosts its own ToastStack, inline above the tab bar and one toast at a time. Saving an offer confirms with View, which opens Saved; removing one offers Undo.",
    render: () => <PhoneToastExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const [toasts, setToasts] = useState<ToastItem[]>([]);
const dismiss = useCallback((id) => setToasts((list) => list.filter((item) => item.id !== id)), []);

const save = (offer) => {
  setSaved((list) => [...list, offer.id]);
  setToasts([{ id: offer.id, title: "Offer saved", action: { label: "View", onClick: () => openTab("saved") } }]);
};
// Tapping the current tab again scrolls it back to the top.
const openTab = (next) => {
  screenRef.current?.scrollTo({ top: 0, behavior: next === tab ? "smooth" : "auto" });
  setTab(next);
};

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation title={title} largeTitle={title} scrollRef={screenRef} />}
  footer={<>
    <ToastStack inline toasts={toasts} onDismiss={dismiss} max={1} />
    <BottomNavigation items={tabs} value={tab} onValueChange={openTab} showLabels />
  </>}>
  <Box padding="lg">
    <List aria-label="Offers">{/* 13 offers, each with a Save toggle */}</List>
  </Box>
</PlatformPhone>`,
  },
]);
