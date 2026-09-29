/**
 * Template: admin list ("Team members"). Copy it into your app and replace the sample data and handlers.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 * Search + filter chips narrow a sortable Table with row actions; Invite opens a ModalForm; success shows a toast.
 */
import { useMemo, useState } from "react";
import {
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Badge,
  BadgeCounter,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Dialog,
  EmptyState,
  Grid,
  Icon,
  IconButton,
  InputField,
  Menu,
  ModalForm,
  PageHeader,
  Pagination,
  Search,
  SelectField,
  Sidebar,
  Stack,
  Table,
  TableActions,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  TextAreaField,
  VisuallyHidden,
  plural,
  useFormState,
  useToast,
  type MenuEntry,
  type SidebarSection,
  type TableSort,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
type Member = { id: string; name: string; email: string; role: "Owner" | "Admin" | "Member"; status: "Active" | "Invited" | "Suspended"; lastActive: string; order: number };
const seed: Member[] = [
  { id: "ava", name: "Ava Chen", email: "ava@zen.studio", role: "Owner", status: "Active", lastActive: "Now", order: 0 },
  { id: "bao", name: "Bao Nguyen", email: "bao@zen.studio", role: "Admin", status: "Active", lastActive: "12 min ago", order: 1 },
  { id: "chi", name: "Chi Tran", email: "chi@zen.studio", role: "Member", status: "Active", lastActive: "2 h ago", order: 2 },
  { id: "duy", name: "Duy Le", email: "duy@zen.studio", role: "Member", status: "Invited", lastActive: "—", order: 3 },
  { id: "em", name: "Em Pham", email: "em@zen.studio", role: "Member", status: "Suspended", lastActive: "3 weeks ago", order: 4 },
];
const roles = ["Owner", "Admin", "Member"] as const;
const statuses = ["Active", "Invited", "Suspended"] as const;
const statusTheme = { Active: "green", Invited: "blue", Suspended: "neutral" } as const;
/** The account menu at the end of the top bar (Figma HR-Platform): replace the handlers with your routes. */
const accountItems: MenuEntry[] = [
  { id: "profile", label: "Profile", icon: "icon-user-circle-line" },
  { id: "preferences", label: "Preferences", icon: "icon-settings-01-line" },
  { type: "separator" },
  { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line" },
];
const nav: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: <Icon name="icon-home-03-line" /> },
  { id: "members", label: "Members", icon: <Icon name="icon-users-line" /> },
  { id: "billing", label: "Billing", icon: <Icon name="icon-credit-card-line" /> },
] }];
const PAGE_SIZE = 10;
/** Avatar text: two initials ("Ava Chen" → "AC"). */
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export function AdminListTemplate() {
  const { toast } = useToast();
  const [members, setMembers] = useState(seed);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [navId, setNavId] = useState("members");
  const [unseen, setUnseen] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members.filter((member) =>
      (!q || member.name.toLowerCase().includes(q) || member.email.includes(q))
      && (!roleFilter.length || roleFilter.includes(member.role))
      && (!statusFilter.length || statusFilter.includes(member.status)));
    if (!sort) return list;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => (sort.columnId === "name" ? a.name.localeCompare(b.name) : a.order - b.order) * dir);
  }, [members, query, roleFilter, statusFilter, sort]);

  const invite = useFormState({
    initialValues: { email: "", role: "Member", message: "" },
    validate: (values) => ({
      ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email) ? {} : { email: "Enter a valid email address, like name@company.com" }),
      ...(members.some((member) => member.email === values.email.trim()) ? { email: "This person is already in the workspace" } : {}),
    }),
    onSubmit: (values, { reset }) => {
      const name = values.email.split("@")[0];
      setMembers((list) => [...list, { id: values.email, name: name[0].toUpperCase() + name.slice(1), email: values.email.trim(), role: values.role as Member["role"], status: "Invited", lastActive: "—", order: list.length }]);
      setInviteOpen(false);
      reset();
      toast({ title: "Invite sent", children: `We emailed ${values.email} a link to join.` });
    },
  });

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const filterChip = (label: string, options: readonly string[], picked: string[], setPicked: (next: string[]) => void) => (
    <Chip variant="advanced" dropdown selectionMode="multiple" selected={picked.length > 0} selectionCount={picked.length} popoverMultiple
      popoverItems={options.map((option) => ({ id: option, label: option, selected: picked.includes(option) }))}
      onPopoverSelect={(item) => { setPicked(toggle(picked, item.id)); setPage(1); }} onClearSelection={() => setPicked([])}>
      {picked.length === 1 ? picked[0] : label}
    </Chip>
  );

  return (
    <AppShell
      sidebar={<Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} logoCollapsed={<Avatar shape="square" size="xs" theme="indigo" background="subtle" alt="Acme" />} sections={nav} selectedId={navId} onItemClick={(item) => { setNavId(item.id); setPage(1); }} />}
      header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: "members", label: "Team members" }]} onNavigate={(item, event) => { event.preventDefault(); setNavId(item.id); /* your router: navigate(item.href) */ }} />}
      headerActions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot={unseen} onClick={() => { setUnseen(false); toast({ title: unseen ? "Duy Le accepted the invite" : "No new notifications" }); }} />
        <Menu align="end" trigger={<AppShellAccount name="Ava Chen" />} items={accountItems} onSelect={(item) => toast({ title: item.id === "sign-out" ? "Signed out" : `${item.label} opened` })} />
      </>}
    >
      <Container>
        <Stack gap="lg" paddingY="lg">
          <PageHeader title="Team members" meta={<BadgeCounter value={members.length} />} description="People who can access the Design workspace."
            actions={<><Button level="tertiary" startIcon={<Icon name="icon-download-01-line" decorative />} onClick={() => toast({ title: `Exported ${plural(shown.length, "member")}` })}>Export</Button><Button level="primary" startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => setInviteOpen(true)}>Invite member</Button></>} />

          {/* Toolbar: Search fills its column; the filter chips share the rest of the row. */}
          <Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} gap="sm" align="center">
            <Search aria-label="Search members" placeholder="Search by name or email" value={query} onValueChange={(value) => { setQuery(value); setPage(1); }} />
            <Stack direction="row" gap="xs" wrap>
              {filterChip("Role", roles, roleFilter, setRoleFilter)}
              {filterChip("Status", statuses, statusFilter, setStatusFilter)}
            </Stack>
          </Grid>

          <Table aria-label="Team members" rows={shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} getRowId={(row) => row.id} sort={sort} onSortChange={setSort}
            empty={<EmptyState title="No members match" illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: () => { setQuery(""); setRoleFilter([]); setStatusFilter([]); } }}>Try another name, role or status.</EmptyState>}
            columns={[
              { id: "name", header: "Name", sortable: true, cell: (row) => (
                <TableMedia media={<Avatar size="small" theme="blue" background="subtle" alt="">{initials(row.name)}</Avatar>} caption={row.email}>{row.name}</TableMedia>
              ) },
              { id: "role", header: "Role", cell: (row) => <TableBadges><Badge theme={row.role === "Owner" ? "accent" : "neutral"} background="subtle" leadingIcon={false}>{row.role}</Badge></TableBadges> },
              { id: "status", header: "Status", cell: (row) => <TableBadges><Badge theme={statusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
              { id: "active", header: "Last active", cell: (row) => <TableText>{row.lastActive}</TableText> },
              { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => (
                <TableActions>
                  <Menu align="end" trigger={<IconButton appearance="flat" level="primary" aria-label={`Actions for ${row.name}`} icon={<Icon name="icon-dots-horizontal-line" />} />}
                    items={[
                      // Always one enabled action, so every row's menu takes keyboard focus (the Owner's other items are disabled).
                      { id: "copy", label: "Copy email", icon: "icon-copy-line", onSelect: () => { void navigator.clipboard?.writeText(row.email).catch(() => undefined); toast({ title: `Copied ${row.email}` }); } },
                      { id: "role", label: row.role === "Admin" ? "Make member" : "Make admin", icon: "icon-shield-tick-line", disabled: row.role === "Owner", caption: row.role === "Owner" ? "The owner keeps full access" : undefined, onSelect: () => setMembers((list) => list.map((member) => member.id === row.id ? { ...member, role: member.role === "Admin" ? "Member" : "Admin" } : member)) },
                      { id: "resend", label: "Resend invite", icon: "icon-mail-01-line", disabled: row.status !== "Invited", onSelect: () => toast({ title: `Invite resent to ${row.email}` }) },
                      { type: "separator" },
                      { id: "remove", label: "Remove from workspace", icon: "icon-trash-line", danger: true, disabled: row.role === "Owner", onSelect: () => setRemoving(row) },
                    ]} />
                </TableActions>
              ) },
            ]} />

          {shown.length > PAGE_SIZE * 2 ? <Pagination page={page} onPageChange={setPage} pageCount={Math.ceil(shown.length / PAGE_SIZE)} /> : null}
          <Text textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "member")} shown</Text>
        </Stack>
      </Container>

      <ModalForm open={inviteOpen} onOpenChange={setInviteOpen} title="Invite to Design workspace" description="They get an email with a link to join." onSubmit={invite.handleSubmit}
        primaryAction={{ label: invite.isSubmitting ? "Sending invite…" : "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email address" type="email" autoComplete="off" placeholder="name@company.com" {...invite.field("email")} />
        <SelectField label="Role" options={roles.filter((role) => role !== "Owner").map((role) => ({ label: role, value: role }))} {...invite.selectField("role")} />
        <TextAreaField label="Personal message" labelOptional rows={3} maxLength={200} characterLimit placeholder="Join us to review the Q4 roadmap." {...invite.field("message")} />
      </ModalForm>

      <Dialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }} theme="negative" title={`Remove ${removing?.name ?? "member"}?`}
        description="They lose access to every project in the workspace right away. You can invite them again later."
        primaryAction={{ label: "Remove member", level: "danger", onClick: () => { if (removing) { setMembers((list) => list.filter((member) => member.id !== removing.id)); toast({ title: `${removing.name} was removed` }); } setRemoving(null); } }}
        secondaryAction={{ label: "Cancel", onClick: () => setRemoving(null) }} />
    </AppShell>
  );
}
