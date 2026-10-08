/* Tag examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. A Tag is a chosen value: people and keywords inside a field, removable with ×;
   Error flags a value that can't be used; onClick acts on the value itself (filter by it). Statuses stay Badges and
   filters stay Chips. No Disabled example: a Tag is disabled only inside a disabled field, and the Autocomplete field
   has no Disabled state (Read-only instead, shown in "Reviewers"). */
import { useEffect, useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { AutocompleteField, InputField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Table, TableTags, TableText, type TableColumn } from "../../../components/Table";
import { Tag } from "../../../components/Tag";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { TODAY, daysFromToday, files, formatRelative, people, peopleList, projectById, type Person, type PersonId } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./tag.css";

export const page: PlatformPage = "tag";

/** People with a photo become Leading-Photo tags. */
const withPhoto = peopleList.filter((person) => person.photo);
const personOption = (person: Person) => ({ id: person.id, label: person.name, photoSrc: person.photo });

// ——— 1. Reviewers: people tags in a field, Read-only until you edit ———————————————————————————————
function Reviewers() {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const [saved, setSaved] = useState(["chi", "bao", "ava"]);
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(true);
  const [error, setError] = useState<string>();
  const file = files[0];
  // Switching between editing and Read-only replaces the buttons, so focus moves to the control that takes their place.
  useEffect(() => {
    const selector = focusNext.current;
    focusNext.current = null;
    if (selector) cardRef.current?.querySelector<HTMLElement>(selector)?.focus();
  }, [editing]);
  const switchTo = (next: boolean) => { focusNext.current = next ? ".zen-autocomplete__add button" : "[data-edit-reviewers]"; setEditing(next); };
  const save = () => {
    if (!draft.length) { setError("Add at least one reviewer"); return; }
    setSaved(draft);
    switchTo(false);
    toast({ type: "positive", title: "Reviewers saved" });
  };
  return (
    <Card theme="flat" ref={cardRef}>
      <Form onSubmit={save}>
        <Stack gap="xs" align="stretch">
          <Heading level={4} textStyle="Heading/Subheading">{file.name}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Design review · updated ${formatRelative(file.updated).toLowerCase()}`}</Text>
        </Stack>
        <AutocompleteField label="Reviewers" readOnly={!editing} addLabel="Add people" popoverLabel="Studio members" searchPlaceholder="Search people"
          options={withPhoto.filter((person) => person.id !== "alex").map(personOption)}
          value={editing ? draft : saved} error={error}
          onValueChange={(next) => { setDraft(next); setError(undefined); }} />
        {editing ? (
          <FormActions>
            <Button level="tertiary" onClick={() => { setDraft(saved); setError(undefined); switchTo(false); }}>Cancel</Button>
            <Button level="primary" type="submit">Save reviewers</Button>
          </FormActions>
        ) : (
          // Read-only: nothing to submit, just the way back into editing.
          <Stack direction="row" justify="end">
            <Button level="tertiary" startIcon="icon-edit-02-line" data-edit-reviewers="" onClick={() => { setDraft(saved); switchTo(true); }}>Edit reviewers</Button>
          </Stack>
        )}
      </Form>
    </Card>
  );
}

// ——— 2. Keywords: free-text values become Tags inside the field, duplicates merge ——————————————————————
/** Keywords the studio already uses on its case studies. */
const keywordLibrary = ["Accessibility", "Event website", "Exhibitor map", "Loyalty", "Ticketing", "Volunteers", "Wayfinding"];

/** The case study the keywords belong to: the finished Book Fair site. */
const caseStudy = projectById("bookfair-site");

function Keywords() {
  const titleId = useId();
  const [options, setOptions] = useState(keywordLibrary.map((keyword) => ({ id: keyword, label: keyword })));
  const [keywords, setKeywords] = useState(["Event website", "Ticketing", "Accessibility"]);
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId}>
      <Stack gap="md" align="stretch">
        <Stack gap="xs" align="stretch">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">{caseStudy.name}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Case study · ${caseStudy.client}`}</Text>
        </Stack>
        <AutocompleteField label="Keywords" addLabel="Add keyword" popoverLabel="Studio keywords" searchPlaceholder="Find or create a keyword"
          helpText="Clients find this case study by its keywords."
          options={options} value={keywords} onValueChange={setKeywords}
          // A new keyword becomes an option and is selected; one that already exists is picked instead of added twice.
          onCreate={(label) => { const keyword = label.trim(); setOptions((list) => [...list, { id: keyword, label: keyword }]); return keyword; }} />
      </Stack>
    </Card>
  );
}

// ——— 3. Invalid email addresses: Error tags plus the field's error text ————————————————————————————
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** The project the guests join, and the Lumen Bank people the studio already works with. */
const guestProject = projectById("lumen-banking");
const clientContacts = ["lena.park@lumenbank.com", "minh.do@lumenbank.com", "thao.pham@lumenbank.com", "vy.nguyen@lumenbank.com"];
/** Typed in by hand a moment ago: the domain is missing its ".com". */
const typedAddress = "quang@lumenbank";

function InviteGuests() {
  const { toast } = useToast();
  const titleId = useId();
  // A tag shows only for a value that is one of the options, so an address typed in becomes an option too.
  const [options, setOptions] = useState([...clientContacts, typedAddress].map((email) => ({ id: email, label: email })));
  const [value, setValue] = useState(["lena.park@lumenbank.com", typedAddress]);
  const [error, setError] = useState<string>();
  const invalid = value.filter((email) => !emailPattern.test(email));
  const fieldError = error ?? (invalid.length
    ? (invalid.length === 1
      ? `${invalid[0]} isn't a valid email address. Remove it and add the full address.`
      : `${plural(invalid.length, "address", "addresses")} aren't valid. Remove them and add the full addresses.`)
    : undefined);
  // Send with an invalid address: the field keeps its error, and Form announces it and focuses the first Error tag's
  // Remove, the fix the error text asks for.
  const send = () => {
    if (!value.length) { setError("Add at least one email address"); return; }
    if (invalid.length) return;
    toast({ type: "positive", title: `${plural(value.length, "invite")} sent` });
    setValue([]);
  };
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId}>
      <Form onSubmit={send} invalidMessage={() => (invalid.length ? `${invalid[0]} isn't a valid email address` : "Add at least one email address")}>
        <Stack gap="xs" align="stretch">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Invite client guests</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${guestProject.name} · ${guestProject.client}`}</Text>
        </Stack>
        <AutocompleteField label="Email addresses" addLabel="Add email" popoverLabel="Pick a contact or type an address" searchPlaceholder="name@company.com"
          createLabel="Add" options={options} value={value} invalidValues={invalid} error={fieldError}
          helpText="Guests see this project's files and reviews."
          onValueChange={(next) => { setValue(next); setError(undefined); }}
          onCreate={(label) => { const email = label.trim().toLowerCase(); setOptions((list) => [...list, { id: email, label: email }]); return email; }} />
        <FormActions>
          <Button level="primary" type="submit" startIcon="icon-send-01-line">Send invites</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 4. Filter by tag: the tag itself is a button that acts on its value —————————————————————————————
type Note = { id: string; title: string; author: Person; at: Date; tags: string[] };
/** Newest first, the order the library shows them in. */
const notes: Note[] = [
  { id: "n3", title: "Points history is the most-used loyalty screen", author: people.chi, at: daysFromToday(-1, 9, 45), tags: ["Loyalty", "Analytics"] },
  { id: "n1", title: "First-time users stall at the payee step", author: people.ava, at: daysFromToday(-2, 15, 20), tags: ["Transfers", "Usability test"] },
  { id: "n5", title: "Older customers read every word on the transfer review", author: people.ava, at: daysFromToday(-3, 16, 30), tags: ["Transfers", "Accessibility"] },
  { id: "n2", title: "Customers want to see pending card payments", author: people.hana, at: daysFromToday(-5, 11, 0), tags: ["Cards", "Interview"] },
  { id: "n4", title: "Passkeys cut sign-in time by 40%", author: people.finn, at: daysFromToday(-9, 14, 10), tags: ["Sign-in", "Analytics"] },
  { id: "n6", title: "Drivers misread the customs hold status", author: people.duy, at: daysFromToday(-12, 10, 0), tags: ["Logistics", "Interview"] },
];
const allTags = [...new Set(notes.flatMap((note) => note.tags))].sort();

function FilterByTag() {
  const [tag, setTag] = useState<string | null>(null);
  const rows = tag ? notes.filter((note) => note.tags.includes(tag)) : notes;
  const columns: TableColumn<Note>[] = [
    { id: "note", header: "Finding", cell: (note) => <TableText bold caption={note.author.name}>{note.title}</TableText> },
    { id: "tags", header: "Tags", width: "280px", cell: (note) => (
      <TableTags>{note.tags.map((name) => <Tag key={name} onClick={() => setTag(tag === name ? null : name)} aria-pressed={tag === name}>{name}</Tag>)}</TableTags>
    ) },
    { id: "added", header: "Added", width: "200px", cell: (note) => <TableText>{formatRelative(note.at)}</TableText> },
  ];
  return (
    // The table is the library itself, so it lies on the page under its toolbar, with no container.
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between" wrap>
        <Chip variant="advanced" dropdown selected={tag !== null} popoverLabel="Tag"
          popoverItems={allTags.map((name) => ({ id: name, label: name, selected: tag === name }))}
          onPopoverSelect={(item) => setTag(tag === item.id ? null : item.id)} onClearSelection={() => setTag(null)}>
          {tag ?? "Tag"}
        </Chip>
        <Text as="span" textStyle="Body/Small/Regular" tone="base" role="status">{plural(rows.length, "finding")}</Text>
      </Stack>
      <Table aria-label="Research findings" columns={columns} rows={rows}
        empty={<EmptyState illustration={false} headingLevel={4} title="No findings match" secondaryAction={{ label: "Clear filter", onClick: () => setTag(null) }}>Try another tag.</EmptyState>} />
    </Stack>
  );
}

// ——— 5. Members on a phone: tags wrap, people are picked in a Bottom Sheet, Close asks first ——————————————
type Group = { id: string; name: string; icon: IconName; theme: DockIconTheme; members: number; active: Date };
/** Alex's groups in the Zen app, most recently active first. Project groups keep their project's mark. */
const projectGroup = (projectId: string, members: number, active: Date): Group => {
  const project = projectById(projectId);
  return { id: project.id, name: project.name, icon: project.icon, theme: project.theme, members, active };
};
const studioGroups: Group[] = [
  projectGroup("phin-loyalty", 6, daysFromToday(0, 10, 24)),
  { id: "design", name: "Design team", icon: "icon-pen-tool-01-line", theme: "pink", members: 9, active: daysFromToday(0, 10, 2) },
  projectGroup("lumen-banking", 7, daysFromToday(0, 9, 40)),
  { id: "news", name: "Studio announcements", icon: "icon-bell-01-line", theme: "yellow", members: 48, active: daysFromToday(0, 8, 30) },
  { id: "engineering", name: "Engineering", icon: "icon-code-01-line", theme: "violet", members: 12, active: daysFromToday(-1, 18, 10) },
  projectGroup("zen-ds", 5, daysFromToday(-1, 16, 45)),
  { id: "hanoi", name: "Hanoi office", icon: "icon-building-01-line", theme: "cyan", members: 17, active: daysFromToday(-1, 12, 5) },
  { id: "hcmc", name: "Ho Chi Minh City office", icon: "icon-building-02-line", theme: "cyan", members: 28, active: daysFromToday(-1, 9, 30) },
  { id: "critique", name: "Design critique", icon: "icon-annotation-line", theme: "purple", members: 11, active: daysFromToday(-2, 15, 0) },
  projectGroup("mekong-tracking", 3, daysFromToday(-2, 11, 20)),
  { id: "research", name: "Research guild", icon: "icon-beaker-02-line", theme: "green", members: 6, active: daysFromToday(-5, 17, 30) },
  { id: "lunch", name: "Friday lunch", icon: "icon-coffee-cup-line", theme: "orange", members: 23, active: daysFromToday(-5, 11, 45) },
  projectGroup("saola-brand", 3, daysFromToday(-6, 14, 15)),
  { id: "motion", name: "Motion club", icon: "icon-film-01-line", theme: "plum", members: 5, active: daysFromToday(-8, 16, 0) },
  projectGroup("bookfair-site", 3, daysFromToday(-12, 10, 30)),
];

function NewGroup() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const [view, setView] = useState<"groups" | "new">("new");
  const [groups, setGroups] = useState(studioGroups);
  const [name, setName] = useState("Loyalty app launch");
  const [members, setMembers] = useState<PersonId[]>(["chi", "bao", "duy", "emi"]);
  const [picking, setPicking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<{ name?: string; members?: string }>({});
  const toggle = (id: PersonId) => setMembers((list) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const membersRef = useRef<HTMLFieldSetElement>(null);
  // A removed tag takes its button with it: focus moves to the next person's Remove (or the one before), else Add people.
  const removeMember = (id: PersonId) => {
    const index = members.indexOf(id);
    toggle(id);
    requestAnimationFrame(() => {
      const buttons = membersRef.current?.querySelectorAll<HTMLElement>(".zen-tag__remove") ?? [];
      (buttons[Math.min(index, buttons.length - 1)] ?? membersRef.current?.querySelector<HTMLElement>("[data-add-people]"))?.focus();
    });
  };
  const toGroups = () => screen.go('.zen-top-nav__action[aria-label="New group"]', () => { setView("groups"); setName(""); setMembers([]); setError({}); });
  const openNew = () => screen.go('.zen-top-nav__action[aria-label="Close"]', () => setView("new"));
  // Close drops the draft only after asking, unless there is nothing to lose.
  const close = () => (name.trim() || members.length ? setDiscarding(true) : toGroups());
  const create = () => {
    const next = { name: name.trim() ? undefined : "Enter a group name", members: members.length >= 2 ? undefined : "Add at least 2 people" };
    setError(next);
    if (next.name || next.members) return;
    setGroups((list) => [{ id: `group-${list.length}`, name: name.trim(), icon: "icon-users-line", theme: "blue", members: members.length + 1, active: TODAY }, ...list]);
    toGroups();
    toast({ type: "positive", title: "Group created" });
  };

  if (view === "groups") {
    return (
      <PlatformPhone key="groups" label="Groups" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Groups" largeTitle="Groups" scrollRef={screenRef}
          trailing={[{ icon: "icon-users-plus-line", label: "New group", onClick: openNew }]} />}>
        {screen.anchor}
        {/* Static rows (nothing opens a group here) sit in the screen margin. */}
        <Box padding="lg">
          <List aria-label="Groups">
            {groups.map((group) => (
              <ListItem key={group.id} title={group.name} caption={`${plural(group.members, "member")} · ${formatRelative(group.active)}`}
                leading={<DockIcon icon={group.icon} theme={group.theme} background="subtle" />} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }
  return (
    // A create screen opens as a modal: Close on the leading edge, the main action in the footer.
    <PlatformPhone key="new" label="New group" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="New group" scrollRef={screenRef}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
      footer={<ActionBar position="static" primaryAction={{ label: "Create group", type: "submit", form: formId }} />}>
      {screen.anchor}
      <Box padding="lg">
        <Form id={formId} onSubmit={create}>
          <InputField label="Group name" size="lg" value={name} error={error.name} onValueChange={(value) => { setName(value); setError((e) => ({ ...e, name: undefined })); }} />
          <FormFieldset ref={membersRef} legend="Members" error={error.members}>
            {members.length ? (
              <Stack as="ul" direction="row" gap="2xs" wrap className="px-tag-list" aria-label="Members added">
                {members.map((id) => {
                  const person = people[id];
                  return <li key={id}><Tag photoSrc={person.photo} remove onRemove={() => removeMember(id)}>{person.name}</Tag></li>;
                })}
              </Stack>
            ) : null}
            <Box>
              <Button level="tertiary" startIcon="icon-user-plus-line" aria-haspopup="dialog" data-add-people="" onClick={() => setPicking(true)}>Add people</Button>
            </Box>
          </FormFieldset>
        </Form>
      </Box>
      <BottomSheet inline size="max" open={picking} onOpenChange={setPicking} title="Add people" primaryAction={{ label: "Done" }}>
        <List aria-label="Studio members">
          {withPhoto.filter((person) => person.id !== "alex").map((person) => (
            <ListItem key={person.id} selected={members.includes(person.id as PersonId)} onClick={() => { toggle(person.id as PersonId); setError((e) => ({ ...e, members: undefined })); }}
              leading={<Avatar size="md" theme="photo" src={person.photo} alt="" />} title={person.name} caption={person.role} />
          ))}
        </List>
      </BottomSheet>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this group?"
        primaryAction={{ label: "Discard group", level: "danger", onClick: () => { setDiscarding(false); toGroups(); } }}
        secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">The name and the people you added will be lost.</Text>
      </BottomSheet>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Reviewers",
    description: "People picked for a review are photo Tags inside the field, each removable with ×. After saving, the field turns Read-only: the tags stay, without × or Add.",
    render: () => <Reviewers />,
    code: `<Card theme="flat">
  <Form onSubmit={save}>
    <Heading level={4} textStyle="Heading/Subheading">Loyalty app – points history.fig</Heading>
    <AutocompleteField label="Reviewers" readOnly={!editing} addLabel="Add people"
      options={members.map((p) => ({ id: p.id, label: p.name, photoSrc: p.photo }))}
      value={editing ? draft : saved} error={error}
      onValueChange={setDraft} />
    {editing ? (
      <FormActions>
        <Button level="tertiary" onClick={cancel}>Cancel</Button>
        <Button level="primary" type="submit">Save reviewers</Button>
      </FormActions>
    ) : (
      <Stack direction="row" justify="end">
        <Button level="tertiary" startIcon="icon-edit-02-line" onClick={edit}>Edit reviewers</Button>
      </Stack>
    )}
  </Form>
</Card>`,
  },
  {
    title: "Members on a phone",
    description: "On a phone the member tags wrap onto new lines and each × keeps a 24px touch area; Add people opens a Bottom Sheet where tapping a person selects them. New group is a modal screen: Close asks before it drops the draft, and Create group sits in the footer.",
    render: () => <NewGroup />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="new" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="New group" scrollRef={screenRef}
    leading={{ icon: "icon-x-medium-line", label: "Close", onClick: () => (isDirty ? setDiscarding(true) : close()) }} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Create group", type: "submit", form: formId }} />}>
  <Form id={formId} onSubmit={create}>
    <InputField label="Group name" size="lg" value={name} error={errors.name} onValueChange={setName} />
    <FormFieldset legend="Members" error={errors.members}>
      {/* removeMember also moves focus to the next tag's Remove, or to Add people */}
      <Stack as="ul" direction="row" gap="2xs" wrap aria-label="Members added">
        {members.map((p) => (
          <li key={p.id}><Tag photoSrc={p.photo} remove onRemove={() => removeMember(p.id)}>{p.name}</Tag></li>
        ))}
      </Stack>
      <Button level="tertiary" startIcon="icon-user-plus-line" aria-haspopup="dialog" onClick={() => setPicking(true)}>Add people</Button>
    </FormFieldset>
  </Form>

  <BottomSheet inline size="max" open={picking} onOpenChange={setPicking} title="Add people" primaryAction={{ label: "Done" }}>
    <List aria-label="Studio members">
      {people.map((p) => (
        <ListItem key={p.id} selected={members.includes(p.id)} onClick={() => toggle(p.id)}
          leading={<Avatar size="md" theme="photo" src={p.photo} alt="" />} title={p.name} caption={p.role} />
      ))}
    </List>
  </BottomSheet>
  <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this group?"
    primaryAction={{ label: "Discard group", level: "danger", onClick: close }} secondaryAction={{ label: "Keep editing" }}>
    <Text tone="base">The name and the people you added will be lost.</Text>
  </BottomSheet>
</PlatformPhone>`,
  },
  {
    title: "Filter by tag",
    wide: true,
    description: "In a research library each tag is a toggle button: pressing it filters the table by that value, pressing it again clears the filter, and the Tag chip above shows the same filter.",
    render: () => <FilterByTag />,
    code: `const columns = [
  { id: "note", header: "Finding", cell: (n) => <TableText bold caption={n.author.name}>{n.title}</TableText> },
  { id: "tags", header: "Tags", width: "280px", cell: (n) => <TableTags>
    {n.tags.map((name) => <Tag key={name} onClick={() => setTag(tag === name ? null : name)} aria-pressed={tag === name}>{name}</Tag>)}
  </TableTags> },
];

<Stack gap="md">
  <Chip variant="advanced" dropdown selected={tag !== null} popoverLabel="Tag"
    popoverItems={allTags.map((name) => ({ id: name, label: name, selected: tag === name }))}
    onPopoverSelect={(item) => setTag(tag === item.id ? null : item.id)} onClearSelection={() => setTag(null)}>
    {tag ?? "Tag"}
  </Chip>
  {/* The table lies on the page: no Card or Box around it */}
  <Table aria-label="Research findings" columns={columns} rows={rows} />
</Stack>`,
  },
  {
    title: "Keywords",
    description: "Keywords are Tags inside the field. Add keyword picks one the studio already uses or creates a new one from what you type; a keyword that is already there is picked, never added twice.",
    render: () => <Keywords />,
    code: `const [options, setOptions] = useState(studioKeywords.map((k) => ({ id: k, label: k })));
const [keywords, setKeywords] = useState(["Event website", "Ticketing", "Accessibility"]);

<Card as="section" theme="flat" aria-labelledby={titleId}>
  <Heading level={4} id={titleId} textStyle="Heading/Subheading">Book Fair 2026 website</Heading>
  <Text textStyle="Body/Small/Regular" tone="base">Case study · Hanoi Book Fair</Text>
  <AutocompleteField label="Keywords" addLabel="Add keyword" searchPlaceholder="Find or create a keyword"
    helpText="Clients find this case study by its keywords."
    options={options} value={keywords} onValueChange={setKeywords}
    onCreate={(label) => {
      const keyword = label.trim();
      setOptions((list) => [...list, { id: keyword, label: keyword }]);
      return keyword; // selected as a new Tag
    }} />
</Card>`,
  },
  {
    title: "Invalid email addresses",
    description: "An address that can't receive an invite stays in the field as an Error tag, and the field's error text says how to fix it. Send invites with an invalid address announces the error and moves focus to that address's Remove, ready to fix.",
    render: () => <InviteGuests />,
    code: `const invalid = value.filter((email) => !emailPattern.test(email));

<Card as="section" theme="flat" aria-labelledby={titleId}>
  {/* Invalid: Form announces invalidMessage and focuses the first Error tag's Remove. */}
  <Form onSubmit={() => { if (!invalid.length) sendInvites(value); }}
    invalidMessage={() => \`\${invalid[0]} isn't a valid email address\`}>
    <Heading level={4} id={titleId} textStyle="Heading/Subheading">Invite client guests</Heading>
    <AutocompleteField label="Email addresses" addLabel="Add email" createLabel="Add"
      options={options} value={value} onValueChange={setValue}
      onCreate={(label) => { setOptions((list) => [...list, { id: label, label }]); return label; }}
      invalidValues={invalid}
      error={invalid.length ? \`\${invalid[0]} isn't a valid email address. Remove it and add the full address.\` : undefined} />
    <FormActions>
      <Button level="primary" type="submit" startIcon="icon-send-01-line">Send invites</Button>
    </FormActions>
  </Form>
</Card>`,
  },
]);
