import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, BadgeCounter, Button, Card, DescriptionList, InputField, Menu, ModalForm, PageHeader,
  Sidebar, SidebarMenuItem, Stack, TabPanel, Table, TableMedia, TableText, Tabs, Text, Thumbnail, plural, useFormState, useToast, useZen,
  type SidebarItem, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { activity, daysFromToday, formatDate, formatMoney, initials, me, people, plans, studio, workspacePlan, type Person, type PersonId } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// ——— The app around the page ————————————————————————————————————————————————————————————————————————
/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "claims", label: "Expense claims", icon: "icon-wallet-02-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);
const firstUnread = unreadActivity[0];

/**
 * One page of the studio's app: the AppShell (Layout=Sidebar, the toggle at the start of the header's top row) with the
 * Sidebar on the current page, the top row's utilities (an optional Search at its start, Notifications, the account
 * last) and the page's PageHeader as the header's Main row. The Body pads the page margins itself. `onNavigate` takes the
 * Sidebar rows the example can show (true when it did); any other row says it is not part of this example.
 */
function StudioApp({ here, onNavigate, leading, main, children }: {
  here: string; onNavigate?: (id: string) => boolean; leading?: ReactNode; main: ReactNode; children: ReactNode;
}) {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const goTo = (id: string, label: string) => {
    if (onNavigate?.(id) || id === here) return;
    toast({ title: `${label} isn’t part of this example`, children: "Each example on this page is one page of the studio’s app." });
  };
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[firstUnread.actor].name} ${firstUnread.verb} “${firstUnread.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <AppShell
      sidebar={(
        // The logo slot is 24px tall: the mark is a 2xs Thumbnail that fits it at every density.
        <Sidebar logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => goTo(item.id, item.label)}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          // The top row: utilities only (the page's actions are in its PageHeader).
          leading={leading}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => goTo("settings", "Settings") },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          // The Main row: the page's own header, its h1.
          main={main}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

// ——— Settings, a page title inside a tab ————————————————————————————————————————————————————————————
type Member = { id: string; name: string; email: string; role: "Owner" | "Admin" | "Member"; team: string; person?: Person };
const firstMembers: Member[] = (["alex", "minhAnh", "mai", "chi", "bao", "duy", "hana", "ava"] as PersonId[]).map((id) => ({
  id, name: people[id].name, email: people[id].email, team: people[id].team, person: people[id],
  role: id === "alex" ? "Owner" : id === "minhAnh" || id === "mai" ? "Admin" : "Member",
}));
const studioPlan = plans.find((plan) => plan.id === workspacePlan.plan)!;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SettingsTabs() {
  const { toast } = useToast();
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState(firstMembers);
  const [inviting, setInviting] = useState(false);
  const tabsId = useId();
  // A phone-width page keeps the member and the role; the team column goes.
  const narrow = useZen()?.breakpoint === "mobile";
  // Invite member: one field; a submit checks it, adds the row, closes the dialog and confirms with a toast.
  const invite = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => ({
      email: !email.trim() ? "Enter an email address" : !emailPattern.test(email.trim()) ? "Enter a valid email address, like name@company.com" : undefined,
    }),
    onSubmit: ({ email }, { reset }) => {
      const address = email.trim();
      setMembers((list) => [...list, { id: address, name: "Invited", email: address, role: "Member", team: "Not set yet" }]);
      setInviting(false);
      reset();
      toast({ type: "positive", title: `Invite sent to ${address}` });
    },
  });
  const columns: TableColumn<Member>[] = [
    { id: "member", header: "Member", cell: (row) => (
      <TableMedia bold caption={row.email} media={row.person ? <Avatar size="small" {...avatarOf(row.person)} /> : <Avatar size="small" theme="neutral" alt="">{row.email.slice(0, 2).toUpperCase()}</Avatar>}>{row.name}</TableMedia>
    ) },
    { id: "role", header: "Role", width: narrow ? undefined : "112px", cell: (row) => <TableText>{row.role}</TableText> },
    ...(narrow ? [] : [{ id: "team", header: "Team", width: "176px", cell: (row: Member) => <TableText>{row.team}</TableText> }]),
  ];
  return (
    <StudioApp here="settings"
      // The page's h1 owns the tabs; each tab's own title is an h2 PageHeader (headingLevel 2, Heading/2).
      main={<PageHeader title="Settings" description={`${studio.name} workspace`}
        tabs={<Tabs idPrefix={tabsId} aria-label="Settings sections" value={tab} onValueChange={setTab}
          items={[{ id: "general", label: "General" }, { id: "members", label: "Members" }, { id: "billing", label: "Billing" }]} />} />}
    >
      <Stack gap="xl">
        <TabPanel idPrefix={tabsId} id="general" hidden={tab !== "general"}>
          <Stack gap="lg">
            <PageHeader headingLevel={2} title="General" description="The name, domain and working week everyone in the workspace sees." />
            <Card theme="shadow" width="fill" maxWidth={440}>
              <DescriptionList items={[
                { term: "Workspace", description: studio.name },
                { term: "Domain", description: studio.domain },
                { term: "Time zone", description: "Ho Chi Minh City (GMT+7)" },
                { term: "Week starts on", description: "Monday" },
              ]} />
            </Card>
          </Stack>
        </TabPanel>
        <TabPanel idPrefix={tabsId} id="members" hidden={tab !== "members"}>
          <Stack gap="lg">
            <PageHeader headingLevel={2} title="Members" meta={<BadgeCounter value={members.length} />}
              description="People who can sign in. Admins can invite people and change billing."
              actions={<Button level="primary" startIcon="icon-user-plus-line" onClick={() => setInviting(true)}>Invite member</Button>} />
            <Table aria-label="Members" rows={members} columns={columns} />
          </Stack>
        </TabPanel>
        <TabPanel idPrefix={tabsId} id="billing" hidden={tab !== "billing"}>
          <Stack gap="lg">
            <PageHeader headingLevel={2} title="Billing" description="Billed monthly to the card on file." />
            <Card theme="shadow" width="fill" maxWidth={440}>
              <DescriptionList items={[
                { term: "Plan", description: `${studioPlan.name} · ${plural(workspacePlan.seats, "seat")}` },
                { term: "Next invoice", description: `${formatMoney(studioPlan.seatMonthly * workspacePlan.seats)} on ${formatDate(daysFromToday(1))}` },
                { term: "Payment method", description: "Visa ending 4242" },
              ]} />
            </Card>
          </Stack>
        </TabPanel>
      </Stack>
      <ModalForm open={inviting} onOpenChange={(open) => { setInviting(open); if (!open) invite.reset(); }} title="Invite member"
        onSubmit={invite.handleSubmit} primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@dizai.studio" data-autofocus="" {...invite.field("email")} />
      </ModalForm>
    </StudioApp>
  );
}
