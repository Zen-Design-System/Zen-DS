/* Avatar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Avatar decision: the 5-avatar stack, presence with text,
   square workspaces, the initials fallback and a profile photo on a phone. */
import { useId, useRef, useState } from "react";
import { Avatar, AvatarStack, type AvatarTheme } from "../../../components/Avatar";
import { BottomSheet } from "../../../components/BottomSheet";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { Form, FormActions } from "../../../components/Form";
import { InputField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { daysFromToday, formatRelative, initials, me, people, peopleList, projectById, studio, TODAY, workspacePlan, type Person, type PersonId } from "../data";
import type { ExampleDef } from "../types";

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

// ——— 1. Project people: the stack in a page header ——————————————————————————————————————————
type Member = Pick<Person, "name" | "photo" | "theme"> & { id: string; caption: string };
/** Online banking redesign: the studio team, lead first, then the two Lumen Bank people who joined as client guests. */
const banking = projectById("lumen-banking");
const teamMembers: Member[] = [
  ...banking.members.map((id) => people[id]).map((person) => ({ ...person, caption: person.id === banking.lead ? `${person.role} · Project lead` : person.role })),
  ...["Lena Park", "Minh Do"].map((name) => ({ id: name, name, theme: themeOf(name), caption: `${banking.client} · Client guest` })),
];
const nameFromEmail = (email: string) => email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

function ProjectPeople() {
  const { toast } = useToast();
  const membersId = useId();
  const [members, setMembers] = useState(teamMembers);
  const [inviting, setInviting] = useState(false);
  const shown = members.slice(0, 5);
  const rest = members.length - shown.length;
  // The stack is one picture with one name: every member, so initials Avatars are named too.
  const everyone = `${plural(members.length, "member")}: ${shown.map((member) => member.name).join(", ")}${rest > 0 ? ` and ${rest} more` : ""}`;
  return (
    <>
      <Stack gap="xl" padding="xl">
        <PageHeader eyebrow="Lumen Bank" title="Online banking redesign"
          description="Web and mobile banking for Lumen Bank customers, from research to hand-off."
          meta={
            <Stack direction="row" gap="xs" align="center" role="img" aria-label={everyone}>
              <AvatarStack size="sm" items={shown.map(avatarItem)} />
              {rest > 0 ? <Text as="span" textStyle="Body/Small/Medium" tone="base">{`+${rest} more`}</Text> : null}
            </Stack>
          }
          actions={<>
            <Button level="tertiary" startIcon="icon-link-01-line" onClick={() => toast({ title: "Link copied" })}>Copy link</Button>
            <Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite people</Button>
          </>} />
        {/* The full team lives in its own section; the header only summarises it. */}
        <Stack as="section" gap="xs" aria-labelledby={membersId}>
          <Heading level={2} id={membersId}>Members</Heading>
          <List aria-labelledby={membersId}>
            {members.map((member) => <ListItem key={member.id} leading={<RowAvatar person={member} />} title={member.name} caption={member.caption} />)}
          </List>
        </Stack>
      </Stack>
      <DemoFieldDialog open={inviting} onOpenChange={setInviting} title="Invite to Online banking redesign"
        description="They can see the project's tasks, files and reviews."
        field={{ kind: "email", label: "Email address", placeholder: "name@dizai.studio" }} submitLabel="Send invite"
        confirm={(email) => `Invite sent to ${email}`}
        onSubmit={(email) => setMembers((list) => [...list, { id: email, name: nameFromEmail(email), theme: themeOf(nameFromEmail(email)), caption: "Invited just now" }])} />
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
              caption={isOnline ? "Online" : `Away · ${formatRelative(lastActive!)}`}
              selected={false} />
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
function ProfilePhoto() {
  const { toast } = useToast();
  const screenRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<string | undefined>(me.photo);
  const [sheet, setSheet] = useState(false);
  const previewId = useId();
  const detailsId = useId();
  const avatar = (size: "md" | "3xl", status = false) => photo
    ? <Avatar size={size} theme="photo" src={photo} alt="" status={status} />
    : <Avatar size={size} theme={me.theme} alt="" status={status}>{initials(me.name)}</Avatar>;
  const remove = () => {
    setPhoto(undefined);
    toast({ title: "Photo removed", action: { label: "Undo", onClick: () => setPhoto(me.photo) } });
  };
  return (
    // Profile is a tab root: a large title that folds into the bar as the screen scrolls. Its groups read as a grouped
    // list: the screen is Surface-Alt and each group a white block under the kicker that names it.
    <PlatformPhone label="Profile" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" scrollRef={screenRef} />}>
      <Stack gap="xl" padding="lg" align="stretch">
        <Stack gap="md" align="center" direction="column">
          {avatar("3xl")}
          <Stack gap="2xs" align="center" width="fill">
            <Heading level={2} textStyle="Heading/1">{me.name}</Heading>
            <Text tone="base">{me.role}</Text>
          </Stack>
          <Button level="tertiary" startIcon="icon-camera-line" onClick={() => setSheet(true)}>{photo ? "Change photo" : "Add photo"}</Button>
        </Stack>
        {/* Each group is a ListBox (Card-padding-medium, 20px on a phone): the row has no side padding of its own, so its text
            sits 20px from every edge and the kicker lines up with it (lg). Details is not a list of rows: a flat Card. */}
        <Stack as="section" gap="xs" align="stretch" aria-labelledby={previewId}>
          <Box paddingX="lg"><Heading level={3} id={previewId} textStyle="Body/Small/Bold" tone="light">How others see you</Heading></Box>
          <ListBox>
            <List aria-labelledby={previewId}>
              <ListItem leading={avatar("md", true)} title={me.name} caption="Online" />
            </List>
          </ListBox>
        </Stack>
        <Stack as="section" gap="xs" align="stretch" aria-labelledby={detailsId}>
          <Box paddingX="lg"><Heading level={3} id={detailsId} textStyle="Body/Small/Bold" tone="light">Details</Heading></Box>
          <Card theme="flat">
            <DescriptionList divider items={[
              { term: "Email", description: me.email },
              { term: "Team", description: me.team },
              { term: "Office", description: me.location },
              { term: "Workspace", description: studio.name },
            ]} />
          </Card>
        </Stack>
      </Stack>
      <BottomSheet inline type="action" open={sheet} onOpenChange={setSheet} title="Profile photo"
        items={photo
          ? [{ id: "library", label: "Choose from library", icon: "icon-image-line" }, { id: "remove", label: "Remove photo", icon: "icon-trash-line", destructive: true }]
          : [{ id: "library", label: "Choose from library", icon: "icon-image-line" }]}
        onSelect={(item) => {
          if (item.id === "remove") remove();
          else { setPhoto(me.photo); toast({ title: "Photo updated" }); }
        }} />
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Project people",
    wide: true,
    screen: true,
    description: "A page header shows who is on the project: at most 5 Avatars in the stack and the rest summarised in text, with the whole team listed under Members. The stack is named once, with everyone in it; inviting someone adds them to the count and the list.",
    render: () => <ProjectPeople />,
    code: `const shown = members.slice(0, 5);
const rest = members.length - shown.length;
const everyone = \`\${plural(members.length, "member")}: \${shown.map((m) => m.name).join(", ")}\${rest > 0 ? \` and \${rest} more\` : ""}\`;

<Stack gap="xl" padding="xl">
  <PageHeader eyebrow="Lumen Bank" title="Online banking redesign"
    meta={<Stack direction="row" gap="xs" align="center" role="img" aria-label={everyone}>
      <AvatarStack size="sm" items={shown.map((m) => m.photo
        ? { src: m.photo, alt: m.name, theme: "photo" }
        : { alt: m.name, theme: m.theme })} />
      {rest > 0 ? <Text as="span" textStyle="Body/Small/Medium" tone="base">{\`+\${rest} more\`}</Text> : null}
    </Stack>}
    actions={<>
      <Button level="tertiary" startIcon="icon-link-01-line" onClick={copyLink}>Copy link</Button>
      <Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite people</Button>
    </>} />
  <Stack as="section" gap="xs" aria-labelledby={membersId}>
    <Heading level={2} id={membersId}>Members</Heading>
    <List aria-labelledby={membersId}>
      {members.map((m) => (
        <ListItem key={m.id} title={m.name} caption={m.caption}
          leading={m.photo
            ? <Avatar size="md" theme="photo" src={m.photo} alt="" />
            : <Avatar size="md" theme={m.theme} alt="">{initials(m.name)}</Avatar>} />
      ))}
    </List>
  </Stack>
</Stack>`,
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
    description: "On a phone, the profile shows the photo at 3XLarge. Removing it falls back to initials on the person's own colour everywhere they appear, with Undo in the toast. The profile's groups are a grouped list: white blocks on the Surface-Alt screen, each under the kicker that names it.",
    render: () => <ProfilePhoto />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const avatar = (size) => photo
  ? <Avatar size={size} theme="photo" src={photo} alt="" />
  : <Avatar size={size} theme="indigo" alt="">{initials("Alex Duong")}</Avatar>;

<PlatformPhone canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" scrollRef={screenRef} />}>
  <Stack gap="lg" padding="lg">
    {avatar("3xl")}
    <Button level="tertiary" startIcon="icon-camera-line" onClick={() => setSheet(true)}>Change photo</Button>
    <Stack as="section" gap="xs" aria-labelledby="preview">
      {/* The kicker lines up with the row text inside the group */}
      <Box paddingX="lg"><Heading level={3} id="preview" textStyle="Body/Small/Bold" tone="light">How others see you</Heading></Box>
      {/* One ListBox per group on the Surface-Alt screen; the row has no padding, the ListBox pads it */}
      <ListBox>
        <List aria-labelledby="preview">
          <ListItem leading={avatar("md")} title="Alex Duong" caption="Online" />
        </List>
      </ListBox>
    </Stack>
    {/* Details is not rows: <Card theme="flat"><DescriptionList divider … /></Card> */}
  </Stack>
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
];
