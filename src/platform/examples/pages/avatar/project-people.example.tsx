import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, AvatarStack, Badge, BadgeCounter, Breadcrumbs, Button, Card, DescriptionList, Grid,
  Heading, IconButton, InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural,
  useFormState, useToast, type AvatarTheme, type SidebarSection,
} from "@zen-ds/react";
import { activity, formatRange, formatRelative, initials, me, people, projectById, studio, type Person } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarItem = (person: Pick<Person, "name" | "photo" | "theme">) =>
  person.photo ? { src: person.photo, alt: person.name, theme: "photo" as const } : { alt: person.name, theme: person.theme };
/** In a row the name sits next to the Avatar, so alt is empty and the initials are passed as children. */
const RowAvatar = ({ person }: { person: Pick<Person, "name" | "photo" | "theme"> }) => person.photo
  ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
  : <Avatar size="md" theme={person.theme} alt="" background="solid">{initials(person.name)}</Avatar>;

/** Initials themes whose white initials keep 3:1 contrast on the solid fill (not green, orange, teal or cyan). */
const initialsThemes: Exclude<AvatarTheme, "photo" | "accent" | "neutral">[] = ["blue", "pink", "purple", "violet", "crimson", "indigo", "plum", "brown", "red"];
/** A guest has no studio colour: the same name always gets the same one, on every screen. */
const themeOf = (name: string) => initialsThemes[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % initialsThemes.length];

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

type Member = Pick<Person, "name" | "photo" | "theme"> & { id: string; caption: string; guest?: boolean; invited?: boolean };
/** Online banking redesign: the studio team, lead first, then the two Lumen Bank people who joined as client guests. */
const banking = projectById("lumen-banking");
const teamMembers: Member[] = [
  ...banking.members.map((id) => people[id]).map((person) => ({ ...person, caption: person.id === banking.lead ? `${person.role} · Project lead` : person.role })),
  ...["Lena Park", "Minh Do"].map((name) => ({ id: name, name, theme: themeOf(name), caption: `${banking.client} · Client guest`, guest: true })),
];
const nameFromEmail = (email: string) => email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ProjectPeople() {
  const { toast } = useToast();
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
  /** A place this example does not draw: the toast says so, and the Sidebar keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the project's people." });
  const remove = (member: Member) => {
    const index = members.indexOf(member);
    setMembers((list) => list.filter((item) => item.id !== member.id));
    toast({ title: `${member.name} removed from the project`, action: { label: "Undo", onClick: () => setMembers((list) => (list.some((item) => item.id === member.id) ? list : [...list.slice(0, index), member, ...list.slice(index)])) } });
  };
  // Invite people: one email field; a valid address joins the list as Invited and a toast confirms it.
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      const text = email.trim();
      const name = nameFromEmail(text);
      setMembers((list) => [...list, { id: text, name, theme: themeOf(name), caption: `${text} · Invited just now`, invited: true }]);
      setInviting(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${text}` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeInviting = (open: boolean) => { setInviting(open); if (!open) invite.reset(); };
  return (
    <>
      <AppShell
        sidebar={(
          <Sidebar
            logo={(
              <Stack direction="row" gap="xs" align="center">
                <Thumbnail src={studio.logo} alt="" size="2xs" />
                <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
              </Stack>
            )}
            logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
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
                        {member.invited ? <Badge size="sm" theme="yellow" background="subtle">Invited</Badge> : null}
                        <Menu align="end" trigger={<IconButton appearance="flat" level="secondary" size="md" icon="icon-dots-vertical-line" aria-label={`More for ${member.name}`} />} items={[
                          // Your own row offers your profile, not a message to yourself: a menu whose items are all disabled reaches nothing.
                          member.id === me.id
                            ? { id: "profile", label: "Edit your profile", icon: "icon-user-edit-line", onSelect: () => toast({ title: "Profile", children: "Name, photo and role in Đìzai Studio" }) }
                            : { id: "message", label: `Message ${member.name.split(" ")[0]}`, icon: "icon-message-chat-circle-line", onSelect: () => toast({ title: `Message to ${member.name}`, children: banking.name }) },
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
      <ModalForm open={inviting} onOpenChange={changeInviting} title={`Invite to ${banking.name}`}
        description="They can see the project's tasks, files and reviews." onSubmit={invite.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@dizai.studio" data-autofocus="" {...invite.field("email")} />
      </ModalForm>
    </>
  );
}
