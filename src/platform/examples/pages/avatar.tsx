/* Avatar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Avatar decision: the 5-avatar stack, presence with text,
   square workspaces, the initials fallback and a profile photo on a phone. The two screens sit in the studio's AppShell:
   a project page (pattern sidebar) and the Profile root on a phone (Band-Sheet with the bottom bar). */
import { useId, useState } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar, AvatarStack, type AvatarTheme } from "../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { BottomSheet } from "../../../components/BottomSheet";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { Form, FormActions } from "../../../components/Form";
import { InputField } from "../../../components/Input";
import { Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { Sidebar, SidebarMenuItem, type SidebarSection } from "../../../components/Sidebar";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { activity, daysFromToday, formatRange, formatRelative, initials, me, people, peopleList, projectById, studio, tasks, TODAY, workspacePlan, type Person, type PersonId } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "avatar";

// ——— Shared helpers ————————————————————————————————————————————————————————————————————————
/** Photo when the person has one, else initials on their steady theme. */
const avatarItem = (person: Pick<Person, "name" | "photo" | "theme">) =>
  person.photo ? { src: person.photo, alt: person.name, theme: "photo" as const } : { alt: person.name, theme: person.theme };
/** In a row the name sits next to the Avatar, so alt is empty and the initials are passed as children. */
const RowAvatar = ({ person, status }: { person: Pick<Person, "name" | "photo" | "theme">; status?: boolean }) => person.photo
  ? <Avatar size="md" theme="photo" src={person.photo} alt="" status={status} />
  : <Avatar size="md" theme={person.theme} alt="" status={status} background="solid">{initials(person.name)}</Avatar>;

/** Initials themes whose white initials keep 3:1 contrast on the solid fill (not green, orange, teal or cyan). */
const initialsThemes: Exclude<AvatarTheme, "photo" | "accent" | "neutral">[] = ["blue", "pink", "purple", "violet", "crimson", "indigo", "plum", "brown", "red"];
/** A guest has no studio colour: the same name always gets the same one, on every screen. */
const themeOf = (name: string) => initialsThemes[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % initialsThemes.length];

// ——— The studio app's chrome (the desktop screen) ————————————————————————————————————————————————
// "Project people" is a page of the Đìzai Studio app: one AppShell (pattern sidebar) with the studio's Sidebar, the
// header's top row (the trail, notifications, the account) and the project's PageHeader in its Main row. The Body pads
// the page, so the content starts at the page margin without a Container.
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unread = activity.filter((item) => item.unread);

/** A place this example does not draw: the toast says so, and the Sidebar keeps the current page. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the project's people." });
}

/** The top row's utilities: notifications (the count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const [count, setCount] = useState(unread.length);
  const latest = unread[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={count} onClick={() => {
        setCount(0);
        toast({ title: count ? plural(count, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
      }} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
        { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Workspace, notifications and billing." }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
      ]} />
    </>
  );
}

// ——— 1. Project people: the stack in a page header ——————————————————————————————————————————
type Member = Pick<Person, "name" | "photo" | "theme"> & { id: string; caption: string; guest?: boolean; invited?: boolean };
/** Online banking redesign: the studio team, lead first, then the two Lumen Bank people who joined as client guests. */
const banking = projectById("lumen-banking");
const teamMembers: Member[] = [
  ...banking.members.map((id) => people[id]).map((person) => ({ ...person, caption: person.id === banking.lead ? `${person.role} · Project lead` : person.role })),
  ...["Lena Park", "Minh Do"].map((name) => ({ id: name, name, theme: themeOf(name), caption: `${banking.client} · Client guest`, guest: true })),
];
const nameFromEmail = (email: string) => email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

function ProjectPeople() {
  const { toast } = useToast();
  const notHere = useNotHere();
  const membersId = useId();
  const accessId = useId();
  const projectId = useId();
  const [members, setMembers] = useState(teamMembers);
  const [inviting, setInviting] = useState(false);
  const shown = members.slice(0, 5);
  const rest = members.length - shown.length;
  // The stack is one picture with one name: every member, so initials Avatars are named too.
  const everyone = `${plural(members.length, "member")}: ${shown.map((member) => member.name).join(", ")}${rest > 0 ? ` and ${rest} more` : ""}`;
  const guests = members.filter((member) => member.guest).length;
  const invited = members.filter((member) => member.invited).length;
  const remove = (member: Member) => {
    const index = members.indexOf(member);
    setMembers((list) => list.filter((item) => item.id !== member.id));
    toast({ title: `${member.name} removed from the project`, action: { label: "Undo", onClick: () => setMembers((list) => (list.some((item) => item.id === member.id) ? list : [...list.slice(0, index), member, ...list.slice(index)])) } });
  };
  return (
    <>
      <PreviewAppFrame>
        <AppShell
          sidebar={(
            <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
              sections={studioPlaces} selectedId="projects" onItemClick={(item) => { if (item.id !== "projects") notHere(item.label); }}
              footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
          )}
          header={(
            <AppShellHeader
              // A Sub-level trail beside the collapse toggle (no Master crumb next to it).
              leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: banking.id, label: banking.name }]}
                onNavigate={(_, event) => { event.preventDefault(); notHere("Projects"); }} />}
              actions={<StudioActions />}
              main={(
                <PageHeader eyebrow={banking.client} title={banking.name}
                  description="Web and mobile banking for Lumen Bank customers, from research to hand-off."
                  meta={
                    <Stack direction="row" gap="xs" align="center" role="img" aria-label={everyone}>
                      <AvatarStack size="sm" items={shown.map(avatarItem)} />
                      {rest > 0 ? <Text as="span" textStyle="Body/Small/Medium" tone="base">{`+${rest} more`}</Text> : null}
                    </Stack>
                  }
                  actions={<>
                    <Button level="tertiary" startIcon="icon-link-01-line" onClick={() => toast({ title: "Link copied", children: `Only members can open ${banking.name}.` })}>Copy link</Button>
                    <Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite people</Button>
                  </>} />
              )}
            />
          )}
        >
          {/* The Sidebar casts the screen's one elevation, so every block takes Shadow. The full team lives in its own
              section beside who can see what; the header only summarises it. */}
          <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="lg" align="start" maxWidth={1440}>
            <ListBox as="section" theme="shadow" aria-labelledby={membersId}
              header={(
                <Stack direction="row" gap="xs" align="center">
                  <Heading level={2} id={membersId} textStyle="Heading/Subheading">Members</Heading>
                  <BadgeCounter size="sm" theme="neutral" background="subtle" value={members.length} />
                </Stack>
              )}>
              <List aria-labelledby={membersId}>
                {members.map((member) => {
                  const lead = member.id === banking.lead;
                  return (
                    <ListItem key={member.id} leading={<RowAvatar person={member} />} title={member.id === me.id ? `${member.name} (you)` : member.name} caption={member.caption}
                      trailing={(
                        <Stack direction="row" gap="xs" align="center">
                          {member.guest ? <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>Guest</Badge> : null}
                          {member.invited ? <Badge size="sm" theme="yellow" background="subtle" leadingIcon={false}>Invited</Badge> : null}
                          <Menu align="end" trigger={<IconButton appearance="flat" level="secondary" size="md" icon="icon-dots-vertical-line" aria-label={`More for ${member.name}`} />} items={[
                            { id: "message", label: `Message ${member.name.split(" ")[0]}`, icon: "icon-message-chat-circle-line", disabled: member.id === me.id, onSelect: () => toast({ title: `Message to ${member.name}`, children: banking.name }) },
                            { type: "separator" },
                            { id: "remove", label: "Remove from project", icon: "icon-user-minus-line", danger: true, disabled: lead, onSelect: () => remove(member) },
                          ]} />
                        </Stack>
                      )} />
                  );
                })}
              </List>
            </ListBox>
            <Stack gap="md">
              <Card as="section" theme="shadow" aria-labelledby={accessId}>
                <Stack gap="md">
                  <Heading level={2} id={accessId} textStyle="Heading/Subheading">Who can see what</Heading>
                  <DescriptionList divider items={[
                    { id: "team", term: "Studio team", description: `${plural(members.length - guests - invited, "person", "people")} · everything` },
                    { id: "guests", term: "Client guests", description: `${plural(guests, "person", "people")} · tasks, files, reviews` },
                    { id: "invites", term: "Waiting to join", description: invited ? plural(invited, "invite") : "None" },
                  ]} />
                </Stack>
              </Card>
              <Card as="section" theme="shadow" aria-labelledby={projectId}>
                <Stack gap="md">
                  <Heading level={2} id={projectId} textStyle="Heading/Subheading">Project</Heading>
                  <DescriptionList divider items={[
                    { id: "lead", term: "Lead", description: people[banking.lead].name },
                    { id: "dates", term: "Dates", description: formatRange(banking.start, banking.due) },
                    { id: "progress", term: "Progress", description: `${banking.progress}% done` },
                  ]} />
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </AppShell>
      </PreviewAppFrame>
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title={`Invite to ${banking.name}`}
        description="They can see the project's tasks, files and reviews."
        field={{ kind: "email", label: "Email address", placeholder: "name@dizai.studio" }} submitLabel="Send invite"
        confirm={(email) => `Invite sent to ${email}`}
        onSubmit={(email) => setMembers((list) => [...list, { id: email, name: nameFromEmail(email), theme: themeOf(nameFromEmail(email)), caption: `${email} · Invited just now`, invited: true }])} />
    </>
  );
}

// ——— 2. Who's online: the status dot always has a text equivalent ——————————————————————————————
type Presence = { person: Person; online: boolean; lastActive?: Date };
/** When the people who are away were last active. */
const lastActive: Partial<Record<PersonId, Date>> = { mai: new Date(TODAY.getTime() - 13 * 60 * 1000), minhAnh: daysFromToday(0, 8, 50), gia: daysFromToday(-1, 18, 40) };
/** The Ho Chi Minh City office: who is online comes from the studio's own presence, online first. */
const officePresence: Presence[] = peopleList.filter((person) => person.location === "Ho Chi Minh City")
  .map((person) => ({ person, online: Boolean(person.online), lastActive: lastActive[person.id as PersonId] }))
  .sort((a, b) => Number(b.online) - Number(a.online) || (b.lastActive?.getTime() ?? 0) - (a.lastActive?.getTime() ?? 0));

function WhosOnline() {
  const [onlineOnly, setOnlineOnly] = useState(false);
  const online = officePresence.filter((member) => member.online).length;
  const rows = onlineOnly ? officePresence.filter((member) => member.online) : officePresence;
  return (
    <Stack gap="md" align="stretch">
      <Stack direction="row" gap="xs" align="center" justify="between">
        <Text as="span" textStyle="Body/Small/Medium" tone="base" role="status">{`${online} of ${plural(officePresence.length, "person", "people")} online`}</Text>
        <Chip variant="normal" level="secondary" selected={onlineOnly} onClick={() => setOnlineOnly((on) => !on)}>Online now</Chip>
      </Stack>
      {/* A loose list on the Surface-Alt stage sits in a ListBox; its Body-Slot insets the rows. */}
      <ListBox>
        <List aria-label="Ho Chi Minh City office">
          {rows.map(({ person, online: isOnline, lastActive }) => (
            <ListItem key={person.id}
              leading={<RowAvatar person={person} status={isOnline} />}
              title={person.id === me.id ? `${person.name} (you)` : person.name}
              caption={isOnline ? "Online" : `Away · ${formatRelative(lastActive!)}`} />
          ))}
        </List>
      </ListBox>
    </Stack>
  );
}

// ——— 3. Switch workspace: square for organisations, circle for people ——————————————————————————
const workspaces = [
  { id: "dizai", name: studio.name, logo: studio.logo, initials: "ĐS", theme: "indigo" as const, caption: `${plural(workspacePlan.seats, "member")} · Owner` },
  { id: "phin", name: "Phin & Co", initials: "PC", theme: "brown" as const, caption: "12 members · Guest" },
  { id: "lumen", name: "Lumen Bank", initials: "LB", theme: "blue" as const, caption: "9 members · Guest" },
  { id: "mekong", name: "Mekong Freight", initials: "MF", theme: "indigo" as const, caption: "6 members · Guest" },
];

function SwitchWorkspace() {
  const accountId = useId();
  const workspacesId = useId();
  const [current, setCurrent] = useState("dizai");
  return (
    // Each group is a ListBox headed by its label (Figma List-Box Header-Slot), so the label and the rows share
    // Card-padding-medium on every device; rows have no side padding of their own.
    <Stack gap="lg" align="stretch">
      <ListBox as="section" aria-labelledby={accountId}
        header={<Heading level={4} id={accountId} textStyle="Body/Small/Bold" tone="light">Signed in as</Heading>}>
        <List aria-labelledby={accountId}>
          <ListItem leading={<Avatar size="md" theme="photo" src={me.photo} alt="" />} title={me.name} caption={me.email} />
        </List>
      </ListBox>
      <ListBox as="section" aria-labelledby={workspacesId}
        header={<Heading level={4} id={workspacesId} textStyle="Body/Small/Bold" tone="light">Workspaces</Heading>}>
        <List aria-labelledby={workspacesId}>
          {workspaces.map((workspace) => (
            <ListItem key={workspace.id} selected={current === workspace.id} onClick={() => setCurrent(workspace.id)}
              leading={workspace.logo
                ? <Avatar size="md" shape="square" theme="photo" src={workspace.logo} alt="" />
                : <Avatar size="md" shape="square" theme={workspace.theme} alt="">{workspace.initials}</Avatar>}
              title={workspace.name} caption={workspace.caption} />
          ))}
        </List>
      </ListBox>
    </Stack>
  );
}

// ——— 4. Guests without a photo: initials from the first and last name, on a steady theme ————————

type Guest = { id: string; name: string; company: string };
const firstGuests: Guest[] = [
  { id: "g1", name: "Lena Park", company: "Lumen Bank" },
  { id: "g2", name: "Tran Minh Chau", company: "Phin & Co" },
  { id: "g3", name: "Samuel O’Neill", company: "Mekong Freight" },
];

function GuestInitials() {
  const [guests, setGuests] = useState(firstGuests);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  // An invalid name shows its error; Form then focuses the field and announces it.
  const add = () => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.split(" ").length < 2) { setError("Enter a first and last name, like Minh Anh Vo"); return; }
    setGuests((list) => [{ id: `g${Date.now()}`, name: clean, company: "Invited just now" }, ...list]);
    setName("");
    setError(undefined);
  };
  return (
    <Stack gap="xl" align="stretch">
      <Form onSubmit={add} gap="sm">
        <InputField label="Guest name" placeholder="Minh Anh Vo" value={name} error={error}
          onValueChange={(value) => { setName(value); setError(undefined); }} />
        <FormActions><Button type="submit" level="tertiary" startIcon="icon-plus-line">Add guest</Button></FormActions>
      </Form>
      {/* zen-detached: Card · Zen Studio */}
      <ListBox>
        <List aria-label="Guests">
          {guests.map((guest) => (
            <ListItem key={guest.id} leading={<Avatar size="md" theme={themeOf(guest.name)} alt="">{initials(guest.name)}</Avatar>}
              title={guest.name} caption={guest.company} />
          ))}
        </List>
      </ListBox>
    </Stack>
  );
}

// ——— 5. Profile photo on a phone: the photo, or initials when it is removed ——————————————————————
/** The studio app's roots on a phone; Profile is this screen. */
const studioRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "time-off", label: "Time off", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** Alex's latest comment, where the Avatar shows next to what they wrote. */
const myComment = { task: tasks.find((task) => task.id === "t5")!, text: "Contrast on the balance card fails at 3.9:1. Can we darken the label?" };
/** The project team as others see it in a stack: Alex first, then the rest of the Lumen Bank team. */
const bankingTeam = projectById("lumen-banking").members.filter((id) => id !== me.id).map((id) => people[id]);

function ProfilePhoto() {
  const { toast } = useToast();
  const [photo, setPhoto] = useState<string | undefined>(me.photo);
  const [sheet, setSheet] = useState(false);
  const [root, setRoot] = useState("profile");
  const previewId = useId();
  const detailsId = useId();
  const avatar = (size: "sm" | "md" | "3xl", status = false) => photo
    ? <Avatar size={size} theme="photo" src={photo} alt="" status={status} />
    : <Avatar size={size} theme={me.theme} alt="" status={status}>{initials(me.name)}</Avatar>;
  const meInStack = photo ? { src: photo, alt: me.name, theme: "photo" as const } : { alt: me.name, theme: me.theme };
  const remove = () => {
    setPhoto(undefined);
    toast({ title: "Photo removed", children: "People see your initials instead.", action: { label: "Undo", onClick: () => setPhoto(me.photo) } });
  };
  return (
    // Profile is a tab root on the AppShell's Band-Sheet: the band carries who you are (the photo at 3XLarge, the name,
    // Change photo), and the page rises over it as a white sheet whose groups show the same Avatar where others meet it.
    <PlatformPhone label="Profile" canvas="surface">
      <AppShell mobileTop="band-sheet"
        topNavigation={<TopNavigation title="Profile"
          trailing={[{ icon: "icon-settings-01-line", label: "Settings", onClick: () => toast({ title: "Settings", children: "Notifications, privacy and sign-in." }) }]} />}
        hero={(
          <Stack gap="md" align="center" paddingY="sm">
            {avatar("3xl")}
            <Stack gap="2xs" align="center">
              <Heading level={2} textStyle="Heading/2" align="center">{me.name}</Heading>
              <Text tone="base" align="center">{`${me.role} · ${me.location}`}</Text>
            </Stack>
            <Button level="tertiary" startIcon="icon-camera-line" onClick={() => setSheet(true)}>{photo ? "Change photo" : "Add photo"}</Button>
          </Stack>
        )}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={studioRoots} value={root} onValueChange={setRoot} />}
      >
        {/* The rows have no side padding of their own: the sheet's margin (20) insets them and the kicker above each group. */}
        <Stack as="section" gap="xs" aria-labelledby={previewId}>
          <Heading level={2} id={previewId} textStyle="Body/Small/Bold" tone="light">How others see you</Heading>
          <List aria-labelledby={previewId}>
            <ListItem leading={avatar("md", true)} title={me.name} caption="Online · in chat and on every task" />
            <ListItem leading={avatar("md")} title={`On ${myComment.task.key}`} titleLines={1} caption={myComment.text} />
            <ListItem leading={<AvatarStack size="sm" items={[meInStack, ...bankingTeam.slice(0, 3).map(avatarItem)]} />}
              title={projectById("lumen-banking").name} caption={`You and ${plural(bankingTeam.length, "other")}`} />
          </List>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={detailsId}>
          <Heading level={2} id={detailsId} textStyle="Body/Small/Bold" tone="light">Details</Heading>
          <DescriptionList divider items={[
            { id: "email", term: "Email", description: me.email },
            { id: "team", term: "Team", description: me.team },
            { id: "office", term: "Office", description: me.location },
            { id: "workspace", term: "Workspace", description: studio.name },
          ]} />
        </Stack>
      </AppShell>
      <BottomSheet inline type="action" open={sheet} onOpenChange={setSheet} title="Profile photo"
        items={photo
          ? [{ id: "library", label: "Choose from library", icon: "icon-image-line" }, { id: "remove", label: "Remove photo", icon: "icon-trash-line", destructive: true }]
          : [{ id: "library", label: "Choose from library", icon: "icon-image-line" }]}
        onSelect={(item) => {
          if (item.id === "remove") remove();
          else { setPhoto(me.photo); toast({ title: "Photo updated", children: "It shows on your tasks, comments and chats." }); }
        }} />
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Project people",
    wide: true,
    screen: true,
    description: "A project page in the studio's AppShell shows who is on the project in its header: at most 5 Avatars in the stack and the rest summarised in text, with the whole team under Members beside who can see what. The stack is named once, with everyone in it; inviting someone adds them to the count and the list as Invited, and removing a member offers Undo.",
    render: () => <ProjectPeople />,
    code: `const shown = members.slice(0, 5);
const rest = members.length - shown.length;
const everyone = \`\${plural(members.length, "member")}: \${shown.map((m) => m.name).join(", ")}\${rest > 0 ? \` and \${rest} more\` : ""}\`;

<AppShell
  sidebar={<Sidebar logo={logo} sections={places} selectedId="projects" onItemClick={go} footer={settings} />}
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "lumen", label: "Online banking redesign" }]} onNavigate={go} />}
      actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={openNotifications} />
        <Menu align="end" trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={account} /></>}
      main={<PageHeader eyebrow="Lumen Bank" title="Online banking redesign"
        meta={<Stack direction="row" gap="xs" align="center" role="img" aria-label={everyone}>
          <AvatarStack size="sm" items={shown.map((m) => m.photo
            ? { src: m.photo, alt: m.name, theme: "photo" }
            : { alt: m.name, theme: m.theme })} />
          {rest > 0 ? <Text as="span" textStyle="Body/Small/Medium" tone="base">{\`+\${rest} more\`}</Text> : null}
        </Stack>}
        actions={<>
          <Button level="tertiary" startIcon="icon-link-01-line" onClick={copyLink}>Copy link</Button>
          <Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite people</Button>
        </>} />}
    />
  }
>
  {/* The Body pads the page: the Grid starts at the margin. Shadow blocks, the Sidebar's elevation. */}
  <Grid columns={{ mobile: 1, desktop: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="lg" align="start">
    <ListBox as="section" theme="shadow" aria-labelledby="members"
      header={<Stack direction="row" gap="xs" align="center">
        <Heading level={2} id="members" textStyle="Heading/Subheading">Members</Heading>
        <BadgeCounter size="sm" theme="neutral" background="subtle" value={members.length} />
      </Stack>}>
      <List aria-labelledby="members">
        {members.map((m) => (
          <ListItem key={m.id} title={m.name} caption={m.caption}
            leading={m.photo
              ? <Avatar size="md" theme="photo" src={m.photo} alt="" />
              : <Avatar size="md" theme={m.theme} alt="">{initials(m.name)}</Avatar>}
            trailing={<Menu align="end" trigger={<IconButton appearance="flat" level="secondary" size="md" icon="icon-dots-vertical-line" aria-label={\`More for \${m.name}\`} />}
              items={[{ id: "remove", label: "Remove from project", danger: true, onSelect: () => remove(m) }]} />} />
        ))}
      </List>
    </ListBox>
    <Card as="section" theme="shadow" aria-labelledby="access">…who can see what…</Card>
  </Grid>
</AppShell>`,
  },
  {
    title: "Who's online",
    description: "The green dot is never the only signal: each row says Online, or Away with the last active time. The name sits next to the Avatar, so its alt is empty.",
    render: () => <WhosOnline />,
    code: `<Text as="span" textStyle="Body/Small/Medium" tone="base" role="status">
  {\`\${online} of \${plural(office.length, "person", "people")} online\`}
</Text>
<Chip variant="normal" level="secondary" selected={onlineOnly}
  onClick={() => setOnlineOnly((on) => !on)}>Online now</Chip>

<ListBox>
  <List aria-label="Ho Chi Minh City office">
    {rows.map(({ person, online, lastActive }) => (
      <ListItem key={person.id}
        leading={person.photo
          ? <Avatar size="md" theme="photo" src={person.photo} alt="" status={online} />
          : <Avatar size="md" theme={person.theme} alt="" status={online}>{initials(person.name)}</Avatar>}
        title={person.name}
        caption={online ? "Online" : \`Away · \${formatRelative(lastActive)}\`} />
    ))}
  </List>
</ListBox>`,
  },
  {
    title: "Profile photo",
    description: "On a phone, the profile is a tab root on the AppShell's Band-Sheet: the photo at 3XLarge on the band, then a sheet showing the same Avatar where others meet it (online in chat, beside a comment, in a project's stack). Removing the photo falls back to initials on the person's own colour in every one of those places, with Undo in the toast.",
    render: () => <ProfilePhoto />,
    code: `const avatar = (size) => photo
  ? <Avatar size={size} theme="photo" src={photo} alt="" />
  : <Avatar size={size} theme="indigo" alt="">{initials("Alex Duong")}</Avatar>;

<PlatformPhone canvas="surface">
  <AppShell mobileTop="band-sheet"
    topNavigation={<TopNavigation title="Profile" trailing={[{ icon: "icon-settings-01-line", label: "Settings", onClick: openSettings }]} />}
    hero={<Stack gap="md" align="center" paddingY="sm">
      {avatar("3xl")}
      <Heading level={2} textStyle="Heading/2" align="center">Alex Duong</Heading>
      <Button level="tertiary" startIcon="icon-camera-line" onClick={() => setSheet(true)}>Change photo</Button>
    </Stack>}
    bottomNavigation={<BottomNavigation aria-label="Đìzai Studio" showLabels items={roots} value={root} onValueChange={setRoot} />}
  >
    <Stack as="section" gap="xs" aria-labelledby="preview">
      <Heading level={2} id="preview" textStyle="Body/Small/Bold" tone="light">How others see you</Heading>
      <List aria-labelledby="preview">
        <ListItem leading={avatar("md")} title="Alex Duong" caption="Online · in chat and on every task" />
        <ListItem leading={<AvatarStack size="sm" items={[me, ...team]} />} title="Online banking redesign" caption="You and 4 others" />
      </List>
    </Stack>
    {/* Details: <DescriptionList divider … /> */}
  </AppShell>
  <BottomSheet inline type="action" open={sheet} onOpenChange={setSheet} title="Profile photo"
    items={[
      { id: "library", label: "Choose from library", icon: "icon-image-line" },
      { id: "remove", label: "Remove photo", icon: "icon-trash-line", destructive: true },
    ]}
    onSelect={(item) => item.id === "remove"
      ? (setPhoto(undefined), toast({ title: "Photo removed", action: { label: "Undo", onClick: restore } }))
      : pickPhoto()} />
</PlatformPhone>`,
  },
  {
    title: "Switch workspace",
    description: "Workspaces and client organisations are square Avatars; the signed-in person stays a circle. Pick a workspace to switch to it.",
    render: () => <SwitchWorkspace />,
    code: `{/* Each group is a ListBox headed by its label: label and rows share Card-padding-medium on every device. */}
<ListBox as="section" aria-labelledby={accountId}
  header={<Heading level={4} id={accountId} textStyle="Body/Small/Bold" tone="light">Signed in as</Heading>}>
  <List aria-labelledby={accountId}>
    <ListItem leading={<Avatar size="md" theme="photo" src={me.photo} alt="" />} title="Alex Duong" caption="alex@dizai.studio" />
  </List>
</ListBox>

<ListBox as="section" aria-labelledby={workspacesId}
  header={<Heading level={4} id={workspacesId} textStyle="Body/Small/Bold" tone="light">Workspaces</Heading>}>
  <List aria-labelledby={workspacesId}>
    {workspaces.map((w) => (
      <ListItem key={w.id} selected={current === w.id} onClick={() => setCurrent(w.id)}
        leading={<Avatar size="md" shape="square" theme={w.theme} alt="">{w.initials}</Avatar>}
        title={w.name} caption={w.caption} />
    ))}
  </List>
</ListBox>`,
  },
  {
    title: "Guests without a photo",
    description: "Without a photo, the Avatar shows the first letters of the first and last name on a colour derived from the name, so a guest looks the same on every screen.",
    render: () => <GuestInitials />,
    code: `/** "Minh Anh Vo" → "MV": the first letters of the first and the last name. */
const initials = (name: string) => {
  const words = name.split(/\\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
};
const themeOf = (name: string) => themes[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % themes.length];

<Form onSubmit={addGuest}>
  <InputField label="Guest name" placeholder="Minh Anh Vo" value={name} error={error} onValueChange={setName} />
  <FormActions><Button type="submit" level="tertiary" startIcon="icon-plus-line">Add guest</Button></FormActions>
</Form>
<ListBox>
  <List aria-label="Guests">
    {guests.map((guest) => (
      <ListItem key={guest.id} title={guest.name} caption={guest.company}
        leading={<Avatar size="md" theme={themeOf(guest.name)} alt="">{initials(guest.name)}</Avatar>} />
    ))}
  </List>
</ListBox>`,
  },
]);
