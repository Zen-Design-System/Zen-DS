import { useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, AvatarStack, Box, Breadcrumbs, Button, Card, DescriptionList, Dialog, DockIcon,
  EmptyState, Grid, Heading, InputField, List, ListBox, ListItem, Menu, ModalForm, PageHeader, Search, Sidebar, Stack, Table, TableMedia, TableText, Text,
  Thumbnail, plural, useFormState, useToast, useZen,
  type DockIconTheme, type IconName, type TableColumn,
} from "@zen-ds/react";
import { activity, formatRelative, initials, me, people, peopleList, studio, type Person, type Team } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");
const activityCaption = (item: { verb: string; object: string; at: Date }) => (
  <>{`${item.verb[0].toUpperCase()}${item.verb.slice(1)} ${item.object}`}{" "}{whole(`· ${formatRelative(item.at)}`)}</>
);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ——— The people directory ————————————————————————————————————————————————————————————————————————————————————
type Page = "people" | "teams" | "activity" | "profile" | "settings";
type Row = { id: string; name: string; role: string; team: Team | "Not set yet"; location: string; person?: Person };
const directory: Row[] = [...peopleList].sort((a, b) => a.name.localeCompare(b.name)).map((person) => ({ id: person.id, name: person.name, role: person.role, team: person.team, location: person.location, person }));
const teamList: { team: Team; icon: IconName; theme: DockIconTheme }[] = [
  { team: "Design", icon: "icon-palette-line", theme: "pink" },
  { team: "Engineering", icon: "icon-code-02-line", theme: "blue" },
  { team: "Delivery", icon: "icon-target-04-line", theme: "orange" },
  { team: "Client Services", icon: "icon-users-line", theme: "purple" },
  { team: "Operations", icon: "icon-briefcase-line", theme: "teal" },
];
const pageLabels: Record<Page, string> = { people: "People", teams: "Teams", activity: "Activity", profile: "Profile", settings: "Settings" };

/** Profile and Settings, the two pages the account menu opens: the page's own header is the AppShellHeader's Main row. */
function accountPage(id: "profile" | "settings") {
  return {
    main: id === "profile"
      ? <PageHeader title="Profile" description={`${me.role} · ${me.team} team`} />
      : <PageHeader title="Settings" description={`The ${studio.name} workspace`} />,
    body: (
      // A readable width keeps each term near its value.
      <Card theme="border" width="fill" maxWidth={440}>
        <DescriptionList items={id === "profile" ? [
          { term: "Name", description: me.name },
          { term: "Email", description: me.email },
          { term: "Office", description: me.location },
          { term: "Approves leave for", description: "Design team" },
        ] : [
          { term: "Workspace", description: studio.name },
          { term: "Domain", description: studio.domain },
          { term: "Plan", description: "Business · 48 seats" },
          { term: "Time zone", description: "Ho Chi Minh City (GMT+7)" },
        ]} />
      </Card>
    ),
  };
}

export default function PeopleDirectory() {
  const { toast } = useToast();
  const breakpoint = useZen()?.breakpoint;
  const [page, setPage] = useState<Page>("people");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(directory);
  const [news, setNews] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const go = (next: Page) => { setPage(next); if (next === "activity") setNews(false); };
  // On a phone the table keeps Person and Team; the Office column comes back on a wider screen.
  const narrow = breakpoint === "mobile";
  const q = query.trim().toLowerCase();
  const shown = rows.filter((row) => !q || `${row.name} ${row.role} ${row.team} ${row.location}`.toLowerCase().includes(q));
  const columns: TableColumn<Row>[] = [
    { id: "person", header: "Person", cell: (row) => (
      <TableMedia bold caption={row.role} media={row.person ? <Avatar size="small" {...avatarOf(row.person)} /> : <Avatar size="small" theme="neutral" alt="">{row.name.slice(0, 2).toUpperCase()}</Avatar>}>{row.name}</TableMedia>
    ) },
    { id: "team", header: "Team", width: narrow ? undefined : "176px", cell: (row) => <TableText>{row.team}</TableText> },
    ...(narrow ? [] : [{ id: "office", header: "Office", width: "176px", cell: (row: Row) => <TableText>{row.location}</TableText> }]),
  ];
  // Invite person: one email field; the invite joins the table and a toast confirms it.
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => {
      const text = email.trim();
      if (!text) return { email: "Enter an email address" };
      return { email: emailPattern.test(text) ? undefined : "Enter a valid email address, like name@company.com" };
    },
    onSubmit: ({ email }, { reset }) => {
      const text = email.trim();
      setRows((list) => [{ id: text, name: text, role: "Invited", team: "Not set yet", location: "Not set yet" }, ...list]);
      setInviting(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${text}` });
    },
  });
  // Cancel, Escape and the scrim close the dialog and clear what was typed.
  const changeInviting = (next: boolean) => { setInviting(next); if (!next) invite.reset(); };

  let main: ReactNode;
  let body: ReactNode;
  if (page === "profile" || page === "settings") ({ main, body } = accountPage(page));
  else if (page === "teams") {
    main = <PageHeader title="Teams" description={plural(teamList.length, "team")} />;
    body = (
      // On a white Canvas the cards take a Pale border, never a shadow.
      <Grid as="ul" minColumnWidth={240} gap="md" aria-label="Teams">
        {teamList.map(({ team, icon, theme }) => {
          const members = peopleList.filter((person) => person.team === team);
          return (
            <Card as="li" key={team} theme="border">
              <Stack gap="md">
                <DockIcon icon={icon} theme={theme} background="subtle" />
                <Stack gap="xs">
                  <Heading level={2} textStyle="Heading/Subheading">{team}</Heading>
                  <Text textStyle="Body/Small/Regular" tone="base">{plural(members.length, "person", "people")}</Text>
                </Stack>
                <AvatarStack size="sm" items={members.map((person) => (person.photo ? { src: person.photo, alt: person.name, theme: "photo" as const } : { alt: person.name, theme: person.theme }))} />
                <Button level="tertiary" aria-label={`View people in ${team}`} onClick={() => { setQuery(team); go("people"); }}>View people</Button>
              </Stack>
            </Card>
          );
        })}
      </Grid>
    );
  } else if (page === "activity") {
    main = <PageHeader title="Activity" description="What changed in the studio this week" />;
    body = (
      <ListBox theme="border">
        <List aria-label="Activity">
          {activity.map((item) => (
            <ListItem key={item.id} title={people[item.actor].name} caption={activityCaption(item)} leading={<Avatar size="md" {...avatarOf(people[item.actor])} />} />
          ))}
        </List>
      </ListBox>
    );
  } else {
    main = <PageHeader title="People" description={q ? `${plural(shown.length, "person", "people")} match “${query.trim()}”` : `${plural(rows.length, "person", "people")} at ${studio.name}`}
      actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite person</Button>} />;
    body = (
      <Table aria-label="People" rows={shown} columns={columns}
        empty={<EmptyState headingLevel={2} icon="icon-search-medium-line" title="No people match" secondaryAction={{ label: "Show everyone", onClick: () => setQuery("") }}>Try a name, a role or a team.</EmptyState>} />
    );
  }

  return (
    <>
      {signedOut ? (
        <Box surface="canvas" height="fill"><Stack align="center" justify="center" gap="md" padding="xl" height="fill">
          <Stack align="center" gap="xs">
            <Heading level={1} textStyle="Heading/1" align="center">You’re signed out</Heading>
            <Text tone="base" align="center">{`Sign in to get back to ${studio.name}.`}</Text>
          </Stack>
          <Button level="primary" onClick={() => setSignedOut(false)}>Sign in</Button>
        </Stack></Box>
      ) : (
        // A white Canvas takes a Sidebar on the canvas (Surface/Default, no shadow, a divider) and bordered cards. The trail
        // starts with the workspace's Master crumb (its home icon), so the collapse toggle moves into the Sidebar's header
        // (Collapse=Sidebar): two icons side by side at the start of the header read as one control.
        <AppShell canvas="alt" collapse="sidebar"
          sidebar={<Sidebar shadow={false} divider selectedId={page} onItemClick={(item) => go(item.id as Page)}
            logo={(
              <Stack direction="row" gap="xs" align="center">
                <Thumbnail src={studio.logo} alt="" size="2xs" />
                <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
              </Stack>
            )}
            logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
            sections={[{ items: [
              { id: "people", label: "People", icon: "icon-users-line" },
              { id: "teams", label: "Teams", icon: "icon-grid-01-line" },
              { id: "activity", label: "Activity", icon: "icon-clock-line" },
            ] }]} />}
          header={(
            <AppShellHeader
              leading={<Breadcrumbs items={[{ id: "workspace", label: studio.name }, { id: page, label: pageLabels[page] }]}
                onNavigate={(_, event) => { event.preventDefault(); go("people"); }} />}
              // The Search sits in the top row's middle (Figma Center-Slots, up to 400px): it finds people from any page.
              center={<Search placeholder="Search people" aria-label="Search people" value={query}
                onValueChange={(value) => { setQuery(value); if (value.trim()) go("people"); }} />}
              actions={<>
                <AppShellAction icon="icon-bell-01-line" aria-label="Activity" dot={news} aria-current={page === "activity" ? "page" : undefined} onClick={() => go("activity")} />
                {/* The account menu at the end of the header's top row: Profile, Settings, Sign out. */}
                <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                  { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => go("profile") },
                  { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => go("settings") },
                  { type: "separator" },
                  { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => setConfirming(true) },
                ]} />
              </>}
              main={main}
            />
          )}
        >
          {body}
        </AppShell>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming} title={`Sign out of ${studio.name}?`} icon={false}
        description="You'll need your studio email to sign in again."
        primaryAction={{ label: "Sign out", onClick: () => { setConfirming(false); setSignedOut(true); } }} secondaryAction={{ label: "Cancel" }} />
      <ModalForm open={inviting} onOpenChange={changeInviting} title="Invite person" onSubmit={invite.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@dizai.studio" data-autofocus="" {...invite.field("email")} />
      </ModalForm>
    </>
  );
}
