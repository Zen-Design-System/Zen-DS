import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Button, DockIcon, Heading, InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader,
  SidePanel, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useFormState, useToast, type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import { activity, daysFromToday, formatRelative, initials, me, people, studio, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// Đìzai Studio's navigation: the same Sidebar on every screen, its current page selected.
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "briefs", label: "Briefs", icon: "icon-file-doc-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);

/** The top row's utilities: Notifications with the unread count (read on open), then the account. */
function HeaderUtilities() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const first = unreadActivity[0];
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[first.actor].name} ${first.verb} “${first.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
      ]} />
    </>
  );
}

// The studio's briefs. The first has a long working title and a history of many changes: the panel's title wraps
// instead of truncating, and only the body scrolls, so the title and the actions stay in reach.
type Brief = { id: string; title: string; client: string; lead: Person; icon: "icon-file-doc-line"; theme: "blue" | "orange" | "teal" | "green" | "purple"; changes: number; crew: PersonId[] };
const briefs: Brief[] = [
  { id: "lumen-cards", title: "Card controls and spending limits for the Lumen Bank mobile app, phase 2", client: "Lumen Bank", lead: people.alex, icon: "icon-file-doc-line", theme: "blue", changes: 24, crew: ["alex", "ava", "finn", "khoa", "hana", "chi"] },
  { id: "phin-rewards", title: "Loyalty app: points, rewards and checkout", client: "Phin & Co", lead: people.chi, icon: "icon-file-doc-line", theme: "orange", changes: 9, crew: ["chi", "bao", "duy", "linh"] },
  { id: "mekong-holds", title: "Shipment tracking: customs holds and alerts", client: "Mekong Freight", lead: people.duy, icon: "icon-file-doc-line", theme: "teal", changes: 6, crew: ["duy", "khoa", "bao"] },
  { id: "saola-range", title: "Brand refresh for the outdoor range", client: "Saola Outdoor", lead: people.gia, icon: "icon-file-doc-line", theme: "green", changes: 4, crew: ["gia", "emi", "linh"] },
  { id: "bookfair-tickets", title: "Book Fair 2026 website: programme and tickets", client: "Hanoi Book Fair", lead: people.gia, icon: "icon-file-doc-line", theme: "purple", changes: 12, crew: ["gia", "linh", "em"] },
];
const briefVerbs = ["edited the scope of", "commented on", "attached a file to", "moved the due date of", "approved", "asked for changes to"];
const historyOf = (brief: Brief) => Array.from({ length: brief.changes }, (_, index) => {
  const person = people[brief.crew[index % brief.crew.length]];
  return { id: `${brief.id}-h${index}`, person, verb: briefVerbs[index % briefVerbs.length], at: daysFromToday(-index, 16 - (index % 6), 10 + index) };
});

/** The studio's Briefs page: a brief opens its long history in a Modal Side Panel whose title wraps and body scrolls. */
export default function BriefHistory() {
  const { toast } = useToast();
  const historyId = useId();
  const listId = useId();
  const [openedId, setOpenedId] = useState(briefs[0].id);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const brief = briefs.find((item) => item.id === openedId)!;
  const history = historyOf(brief);
  const go = (item: SidebarItem) => {
    if (item.id !== "briefs") toast({ title: `${item.label} isn’t part of this example`, children: "Each screen here is one page of the studio’s app." });
  };
  // New brief: one title field; submitting checks it, closes and confirms with a toast.
  const newBrief = useFormState<{ title: string }>({
    initialValues: { title: "" },
    validate: ({ title }) => ({ title: title.trim() ? undefined : "Enter a brief title" }),
    onSubmit: ({ title }, { reset }) => {
      setCreating(false);
      reset();
      toast({ type: "positive", title: `“${title.trim()}” created` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeCreating = (next: boolean) => { setCreating(next); if (!next) newBrief.reset(); };
  return (
    <AppShell
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId="briefs" onItemClick={go}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          actions={<HeaderUtilities />}
          main={<PageHeader title="Briefs" description={`${plural(briefs.length, "client brief")} the studio is working from`}
            actions={<Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New brief</Button>} />}
        />
      )}
    >
      {/* The page's elevation follows the default Sidebar: a shadowed ListBox. */}
      <ListBox as="section" theme="shadow" aria-labelledby={listId}
        header={<Heading level={2} id={listId} textStyle="Heading/Subheading">All briefs</Heading>}>
        <List aria-labelledby={listId}>
          {briefs.map((item) => (
            <ListItem key={item.id} title={item.title} titleLines={2} caption={`${item.client} · ${plural(item.changes, "change")}`}
              leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />} onClick={() => { setOpenedId(item.id); setOpen(true); }} />
          ))}
        </List>
      </ListBox>
      {/* The title wraps, never cut; only the body scrolls, so the header and the actions stay put. */}
      <SidePanel type="modal" open={open} onOpenChange={setOpen} title={brief.title} description={`${brief.client} · Lead ${brief.lead.name}`}
        primaryAction={{ label: "Export history", onClick: () => toast({ title: "History exported", children: `${plural(history.length, "change")} as a CSV file` }) }}>
        <Stack as="section" gap="xs" aria-labelledby={historyId}>
          {/* A kicker one level below the panel's h2 title. */}
          <Heading level={3} id={historyId} textStyle="Body/Small/Bold" tone="light">History</Heading>
          <List aria-labelledby={historyId}>
            {history.map((entry) => (
              <ListItem key={entry.id} title={entry.person.name} caption={`${entry.verb[0].toUpperCase()}${entry.verb.slice(1)} the brief · ${formatRelative(entry.at)}`}
                leading={<Avatar size="md" {...avatarOf(entry.person)} />} />
            ))}
          </List>
        </Stack>
      </SidePanel>
      <ModalForm open={creating} onOpenChange={changeCreating} title="New brief" onSubmit={newBrief.handleSubmit}
        primaryAction={{ label: "Create brief" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Brief title" type="text" autoComplete="off" placeholder="Savings goals research, round 1" data-autofocus="" {...newBrief.field("title")} />
      </ModalForm>
    </AppShell>
  );
}
