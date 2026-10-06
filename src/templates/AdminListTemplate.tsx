/**
 * Template: admin list (the team members of a workspace). Copy it into your app and replace the sample data and handlers.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 *
 * - Top bar: Breadcrumbs, Notifications (a docked Side Panel) and the account menu.
 * - PageHeader: seat usage in the description, Export (Tertiary) and Invite members (Primary → a validated ModalForm).
 * - Toolbar: Search by name or email, Role and Status filter chips, and Clear all once both filters are on.
 * - Table: select rows, sort by member, role, status or last active; each row's Menu copies the email, resends or revokes an
 *   invite, changes the role, suspends or restores access and removes the member (negative Dialog). Undoable changes
 *   act at once and offer Undo in a Toast. Inline Pagination below.
 * - Selected rows bring up a sticky ActionBar: Change role and Remove members for the whole selection.
 * - Phone: the members are a List; a row opens its actions in a Bottom Sheet, and the filter chips open theirs in one.
 */
import { useMemo, useRef, useState } from "react";
import {
  ActionBar,
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Badge,
  BottomSheet,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Dialog,
  DockIcon,
  EmptyState,
  FormFieldset,
  Grid,
  Icon,
  IconButton,
  InputField,
  List,
  ListItem,
  Menu,
  ModalForm,
  PageHeader,
  Pagination,
  RadioButton,
  Search,
  SidePanel,
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
  useZen,
  type AvatarTheme,
  type BadgeTheme,
  type IconName,
  type MenuEntry,
  type MenuItemData,
  type SidebarSection,
  type TableColumn,
  type TableSort,
} from "@zen/design-system";
import alexPhoto from "./hr/assets/account-photo.jpg";

/* ── Sample data: replace with your own ─────────────────────────────── */
const workspace = { name: "Đìzai Studio", initial: "Đ", plan: "Pro", seats: 60, domain: "dizai.studio" };
/** "Now" for the sample timestamps: Wednesday, Sep 30, 2026 at 3:20 pm. */
const NOW = new Date(2026, 8, 30, 15, 20);
/** The signed-in admin. */
const ME = "linh.hoang@dizai.studio";

type Role = "Owner" | "Admin" | "Member" | "Guest";
type Status = "Active" | "Invited" | "Suspended";
type Member = { id: string; name: string; email: string; role: Role; status: Status; lastActive: string | null; theme: AvatarTheme; photo?: string };

const roles: Role[] = ["Owner", "Admin", "Member", "Guest"];
const statuses: Status[] = ["Active", "Invited", "Suspended"];
const statusTheme: Record<Status, BadgeTheme> = { Active: "green", Invited: "blue", Suspended: "neutral" };
const roleRank: Record<Role, number> = { Owner: 0, Admin: 1, Member: 2, Guest: 3 };
const statusRank: Record<Status, number> = { Active: 0, Invited: 1, Suspended: 2 };
/** The roles an admin can give; ownership moves through its own transfer flow. */
const roleChoices: Array<{ value: Exclude<Role, "Owner">; caption: string }> = [
  { value: "Admin", caption: "Manages members, billing and workspace settings" },
  { value: "Member", caption: "Works in every project and invites guests" },
  { value: "Guest", caption: "Sees only the projects they're added to, free of charge" },
];

/** "Minh Anh Vo" → "minhanh.vo@dizai.studio". */
const emailOf = (name: string) => {
  const parts = name.toLowerCase().split(" ");
  return `${parts.slice(0, -1).join("")}.${parts.at(-1)}@${workspace.domain}`;
};
const member = (name: string, role: Role, status: Status, lastActive: string | null, theme: AvatarTheme, email = emailOf(name)): Member =>
  ({ id: email, name, email, role, status, lastActive, theme });

const seed: Member[] = [
  member("Khoa Dang", "Owner", "Active", "2026-09-30T11:40", "neutral"),
  member("Linh Hoang", "Admin", "Active", "2026-09-30T15:20", "yellow"),
  member("Thu Bui", "Admin", "Active", "2026-09-30T09:05", "red"),
  member("Gia Pham", "Admin", "Active", "2026-09-29T18:12", "indigo"),
  { ...member("Alex Duong", "Member", "Active", "2026-09-30T15:07", "blue"), photo: alexPhoto },
  member("Bao Nguyen", "Member", "Active", "2026-09-30T14:52", "green"),
  member("Chi Tran", "Member", "Active", "2026-09-30T10:18", "pink"),
  member("Em Pham", "Member", "Active", "2026-09-28T10:30", "orange"),
  member("Minh Anh Vo", "Member", "Active", "2026-09-30T14:25", "violet"),
  member("Lena Fischer", "Member", "Active", "2026-09-30T08:02", "cyan"),
  member("Quynh Nhu Le", "Member", "Active", "2026-09-29T16:12", "plum"),
  member("Tuan Ho", "Member", "Active", "2026-09-25T17:45", "teal"),
  member("Mai Phan", "Member", "Active", "2026-09-30T13:36", "crimson"),
  member("Duy Le", "Member", "Active", "2026-09-30T15:11", "teal"),
  member("James Carter", "Member", "Active", "2026-09-30T06:48", "brown"),
  member("Hieu Tran", "Member", "Active", "2026-09-30T12:20", "blue"),
  member("Long Nguyen", "Member", "Active", "2026-09-29T21:05", "green"),
  member("Phuong Dao", "Member", "Active", "2026-09-30T14:02", "pink"),
  member("Nam Vu", "Member", "Active", "2026-09-26T11:30", "indigo"),
  member("Trang Ngo", "Member", "Active", "2026-09-30T10:47", "orange"),
  member("Khanh Ly", "Member", "Active", "2026-09-30T15:16", "purple"),
  member("Son Truong", "Member", "Active", "2026-09-29T10:55", "cyan"),
  member("Vy Huynh", "Member", "Active", "2026-09-30T09:40", "yellow"),
  member("Kenji Watanabe", "Member", "Active", "2026-09-30T13:05", "red"),
  member("Thanh Bui", "Member", "Active", "2026-09-24T15:20", "teal"),
  member("Hung Do", "Member", "Active", "2026-09-30T11:12", "brown"),
  member("An Mai", "Member", "Active", "2026-09-30T14:40", "violet"),
  member("Tam Nguyen", "Member", "Active", "2026-09-30T08:55", "plum"),
  member("Lucas Moreau", "Member", "Suspended", "2026-08-21T17:40", "blue"),
  member("Nhat Pham", "Member", "Active", "2026-09-30T12:48", "green"),
  member("Ha Vu", "Member", "Active", "2026-09-29T08:30", "crimson"),
  member("Quang Le", "Member", "Active", "2026-09-30T10:05", "indigo"),
  member("Hana Kim", "Member", "Active", "2026-09-30T14:58", "plum"),
  member("Tien Dang", "Member", "Active", "2026-09-30T09:26", "orange"),
  member("Ngoc Tran", "Member", "Active", "2026-09-27T20:14", "pink"),
  member("Olivia Grant", "Member", "Active", "2026-09-30T03:10", "cyan"),
  member("Vinh Ho", "Member", "Active", "2026-09-30T11:58", "teal"),
  member("Yen Chau", "Member", "Active", "2026-09-14T10:30", "yellow"),
  member("Priya Raman", "Member", "Active", "2026-09-30T13:50", "crimson"),
  member("Daniel Brooks", "Member", "Active", "2026-09-30T01:22", "purple"),
  member("Lan Vo", "Member", "Active", "2026-09-30T10:33", "green"),
  member("Kim Ngan Phan", "Member", "Active", "2026-09-29T14:44", "violet"),
  member("Diego Alvarez", "Member", "Suspended", "2026-07-31T18:05", "orange"),
  member("Thao Nguyen", "Member", "Active", "2026-09-30T15:02", "blue"),
  member("Huong Le", "Member", "Active", "2026-09-30T08:15", "pink"),
  member("Binh Tran", "Member", "Active", "2026-09-23T09:40", "brown"),
  member("Sarah Lim", "Member", "Active", "2026-09-30T12:05", "teal"),
  member("Phat Nguyen", "Member", "Active", "2026-09-30T07:50", "indigo"),
  member("Thu Ha Nguyen", "Guest", "Active", "2026-09-29T11:20", "orange", "thuha.nguyen@lotuscoffee.example"),
  member("Sofia Marin", "Guest", "Active", "2026-09-22T16:00", "pink", "sofia@studiomarin.example"),
  member("Ravi Menon", "Guest", "Suspended", "2025-12-18T10:00", "neutral", "ravi.menon@ledgerly.example"),
  member("Nhi Dang", "Member", "Invited", null, "violet"),
  member("Owen Clarke", "Member", "Invited", null, "cyan"),
  member("Bich Ngoc Ha", "Member", "Invited", null, "green"),
  member("Mei Lin Chua", "Guest", "Invited", null, "yellow", "meilin.chua@lotuscoffee.example"),
];
const inviteThemes: AvatarTheme[] = ["blue", "green", "orange", "pink", "violet", "teal", "cyan", "plum"];

type Notice = { id: string; title: string; caption: string; icon: IconName };
const notices: Notice[] = [
  { id: "joined", title: "Quynh Nhu Le joined the workspace", caption: "Yesterday at 4:12 pm", icon: "icon-user-check-line" },
  { id: "pending", title: "Owen Clarke hasn't joined yet", caption: "The invite expires Friday", icon: "icon-mail-01-line" },
  { id: "seats", title: "Your plan is almost full", caption: "Monday at 9:00 am", icon: "icon-users-line" },
];

const nav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line" },
  ] },
  { label: "Admin", items: [
    { id: "members", label: "Team members", icon: "icon-users-line" },
    { id: "billing", label: "Billing", icon: "icon-credit-card-line" },
    { id: "security", label: "Security", icon: "icon-shield-tick-line" },
    { id: "settings", label: "Settings", icon: "icon-settings-01-line" },
  ] },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
/** Avatar text: two initials ("Minh Anh Vo" → "MV"). */
const initials = (name: string) => { const parts = name.split(" "); return `${parts[0][0]}${parts.length > 1 ? parts.at(-1)![0] : ""}`.toUpperCase(); };
/** "chi.tran@dizai.studio" → "Chi Tran", until the person sets their own name. */
const nameFromEmail = (email: string) => email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
/** "Bao Nguyen", "Bao Nguyen and Chi Tran", "Bao Nguyen, Chi Tran and 3 others". */
const listOf = (names: string[]) => {
  if (names.length <= 2) return names.join(" and ");
  return names.length === 3 ? `${names[0]}, ${names[1]} and ${names[2]}` : `${names[0]}, ${names[1]} and ${plural(names.length - 2, "other")}`;
};
const nameList = (people: Member[]) => listOf(people.map((person) => person.name));
const roleNoun = (role: Role, count: number) => (count === 1 ? `${role === "Admin" ? "an" : "a"} ${role.toLowerCase()}` : `${role.toLowerCase()}s`);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const parseEmails = (text: string) => [...new Set(text.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];

/** Timestamps follow one ladder: Just now · 13 minutes ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am ·
 * Sep 14 at 10:30 am · Dec 18, 2025. */
const clock = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
function lastSeen(iso: string) {
  const date = new Date(iso);
  const minutes = Math.floor((NOW.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${plural(minutes, "minute")} ago`;
  const days = Math.round((dayStart(NOW) - dayStart(date)) / 86400000);
  if (days === 0) return clock(date);
  if (days === 1) return `Yesterday at ${clock(date)}`;
  if (days < 7) return `${date.toLocaleDateString("en-US", { weekday: "long" })} at ${clock(date)}`;
  if (date.getFullYear() === NOW.getFullYear()) return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${clock(date)}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const compare: Record<string, (a: Member, b: Member) => number> = {
  member: (a, b) => a.name.localeCompare(b.name),
  role: (a, b) => roleRank[a.role] - roleRank[b.role] || a.name.localeCompare(b.name),
  status: (a, b) => statusRank[a.status] - statusRank[b.status] || a.name.localeCompare(b.name),
  active: (a, b) => (a.lastActive ?? "").localeCompare(b.lastActive ?? ""),
};
/** The owner and your own account are changed elsewhere (ownership transfer, another admin). */
const editable = (person: Member) => person.role !== "Owner" && person.id !== ME;

export function AdminListTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const [members, setMembers] = useState(seed);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "member", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleTargets, setRoleTargets] = useState<Member[]>([]);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState<Member[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unread, setUnread] = useState(notices.length);
  // Phone: the open filter's Bottom Sheet, and the member whose actions are open.
  const [sheet, setSheet] = useState<"Role" | "Status" | null>(null);
  const [acting, setActing] = useState<Member | null>(null);
  // A new page brings the top of the members back into view (the Table, or the List on a phone).
  const tableRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Clearing the search or the filters removes the button that did it, so focus goes back to Search.
  const searchRef = useRef<HTMLInputElement>(null);

  const seatsUsed = members.filter((person) => person.role !== "Guest").length;
  const seatsLeft = Math.max(0, workspace.seats - seatsUsed);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members.filter((person) =>
      (!q || person.name.toLowerCase().includes(q) || person.email.includes(q))
      && (!roleFilter.length || roleFilter.includes(person.role))
      && (!statusFilter.length || statusFilter.includes(person.status)));
    if (!sort) return list;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      // People who never signed in stay at the end of Last active, whichever way it sorts.
      if (sort.columnId === "active" && (!a.lastActive || !b.lastActive)) return Number(!a.lastActive) - Number(!b.lastActive);
      return compare[sort.columnId](a, b) * direction;
    });
  }, [members, query, roleFilter, statusFilter, sort]);
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = shown.slice((current - 1) * pageSize, current * pageSize);

  // In the order the table shows them, so names read the same in the Dialog.
  const picked = shown.filter((person) => selected.includes(person.id));
  const pickedEditable = picked.filter(editable);
  const skipped = picked.filter((person) => !editable(person)).map((person) => (person.id === ME ? "you" : "the owner"));

  /* ── Actions ── */
  const notInDemo = (label: string) => toast({ title: `${label} isn't part of this demo` });
  /** Filters and search start again from page 1 with nothing selected, so bulk actions never reach hidden rows. */
  const refine = (apply: () => void) => { apply(); setPage(1); setSelected([]); };
  const clearFilters = () => { refine(() => { setQuery(""); setRoleFilter([]); setStatusFilter([]); }); searchRef.current?.focus(); };
  /** Undoable changes act at once; Undo puts the touched rows back as they were, in their old places. */
  const changeWithUndo = (targets: Member[], change: (person: Member) => Member | null, title: string, detail: string) => {
    const ids = new Set(targets.map((person) => person.id));
    const places = targets.map((person) => ({ person, index: members.findIndex((row) => row.id === person.id) })).sort((a, b) => a.index - b.index);
    setMembers((list) => list.flatMap((person) => (ids.has(person.id) ? change(person) ?? [] : [person])));
    const undo = () => setMembers((list) => {
      const next = list.filter((person) => !ids.has(person.id));
      places.forEach(({ person, index }) => next.splice(index, 0, person));
      return next;
    });
    const id = toast({ title, children: detail, action: { label: "Undo", onClick: () => { undo(); dismiss(id); } } });
  };
  const copyEmail = (person: Member) => {
    void navigator.clipboard?.writeText(person.email).catch(() => undefined);
    toast({ title: "Email copied", children: person.email });
  };
  const resend = (person: Member) => toast({ title: "Invite resent", children: `To ${person.email}` });
  const setAccess = (person: Member, status: Status) => changeWithUndo([person], (row) => ({ ...row, status }),
    status === "Suspended" ? "Access suspended" : "Access restored",
    status === "Suspended" ? `${person.name} can't sign in until you restore it` : `${person.name} can sign in again`);
  const revoke = (person: Member) => changeWithUndo([person], () => null, "Invite revoked", `The link sent to ${person.email} no longer works`);
  const openRemove = (targets: Member[]) => { setRemoving(targets); setRemoveOpen(true); };
  const confirmRemove = () => {
    const ids = new Set(removing.map((person) => person.id));
    setMembers((list) => list.filter((person) => !ids.has(person.id)));
    setSelected((list) => list.filter((id) => !ids.has(id)));
    setRemoveOpen(false);
    toast({ title: removing.length === 1 ? `${removing[0].name} removed` : `${plural(removing.length, "member")} removed` });
  };

  const invite = useFormState({
    initialValues: { emails: "", role: "Member", message: "" },
    validate: (values) => {
      const emails = parseEmails(values.emails);
      const bad = emails.find((email) => !EMAIL.test(email));
      const taken = emails.find((email) => members.some((person) => person.email === email));
      const seatsNeeded = values.role === "Guest" ? 0 : emails.length;
      return {
        emails: !emails.length ? "Enter at least one email address, like name@dizai.studio"
          : bad ? `“${bad}” isn't an email address. Use the form name@dizai.studio`
          : taken ? `${taken} is already in the workspace`
          : seatsNeeded > seatsLeft ? `Only ${plural(seatsLeft, "seat")} left. Invite fewer people or invite them as guests`
          : undefined,
      };
    },
    onSubmit: (values, { reset }) => {
      const emails = parseEmails(values.emails);
      const role = values.role as Role;
      setMembers((list) => [...list, ...emails.map((email, index) => ({ id: email, name: nameFromEmail(email), email, role, status: "Invited" as const, lastActive: null, theme: inviteThemes[(list.length + index) % inviteThemes.length] }))]);
      setInviting(false);
      reset();
      const id = toast({ title: emails.length === 1 ? "Invite sent" : `${plural(emails.length, "invite")} sent`, children: `To ${listOf(emails)}`,
        action: { label: "View", onClick: () => { dismiss(id); refine(() => { setQuery(""); setRoleFilter([]); setStatusFilter(["Invited"]); }); } } });
    },
  });
  const startInvite = () => { invite.reset(); setInviting(true); };

  const roleForm = useFormState({
    initialValues: { role: "Member" },
    onSubmit: (values) => {
      const role = values.role as Role;
      const changing = roleTargets.filter((person) => person.role !== role);
      setRoleOpen(false);
      setSelected([]);
      if (!changing.length) return;
      changeWithUndo(changing, (person) => ({ ...person, role }), "Role changed",
        changing.length === 1 ? `${changing[0].name} is now ${roleNoun(role, 1)}` : `${plural(changing.length, "member")} are now ${roleNoun(role, 2)}`);
    },
  });
  const openRole = (targets: Member[]) => {
    setRoleTargets(targets);
    roleForm.reset({ role: targets.length === 1 ? targets[0].role : "Member" });
    setRoleOpen(true);
  };

  /** Row menu: what an admin can do to this person right now; unavailable steps stay visible with the reason. */
  const rowActions = (person: Member): MenuEntry[] => {
    const locked = person.role === "Owner" ? "The owner always has full access" : person.id === ME ? "Another admin can change your role" : undefined;
    const entries: Array<MenuEntry | false> = [
      { id: "copy", label: "Copy email", icon: "icon-copy-line", onSelect: () => copyEmail(person) },
      person.status === "Invited" && { id: "resend", label: "Resend invite", icon: "icon-send-01-line", onSelect: () => resend(person) },
      { id: "role", label: "Change role…", icon: "icon-user-edit-line", disabled: Boolean(locked), caption: locked, onSelect: () => openRole([person]) },
      person.status === "Active" && !locked && { id: "suspend", label: "Suspend access", icon: "icon-slash-circle-01-line", onSelect: () => setAccess(person, "Suspended") },
      person.status === "Suspended" && { id: "restore", label: "Restore access", icon: "icon-refresh-cw-01-line", onSelect: () => setAccess(person, "Active") },
      { type: "separator" },
      person.status === "Invited"
        ? { id: "revoke", label: "Revoke invite", icon: "icon-user-x-line", danger: true, onSelect: () => revoke(person) }
        : { id: "remove", label: "Remove member", icon: "icon-user-x-line", danger: true, disabled: Boolean(locked),
          caption: person.role === "Owner" ? "Transfer ownership first" : person.id === ME ? "You can't remove yourself" : undefined, onSelect: () => openRemove([person]) },
    ];
    return entries.filter((entry): entry is MenuEntry => Boolean(entry));
  };

  const columns: TableColumn<Member>[] = [
    { id: "member", header: "Member", sortable: true, cell: (row) => (
      <TableMedia caption={row.email} media={<Avatar size="sm" theme={row.theme} background="subtle" src={row.photo} alt="">{initials(row.name)}</Avatar>}>
        {row.id === ME ? `${row.name} (you)` : row.name}
      </TableMedia>
    ) },
    { id: "role", header: "Role", width: "120px", sortable: true, cell: (row) => <TableText>{row.role}</TableText> },
    { id: "status", header: "Status", width: "136px", sortable: true, cell: (row) => <TableBadges><Badge theme={statusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
    { id: "active", header: "Last active", width: "200px", sortable: true, cell: (row) => (
      <TableText>{row.lastActive ? lastSeen(row.lastActive) : <><Text as="span" aria-hidden="true">—</Text><VisuallyHidden>Not signed in yet</VisuallyHidden></>}</TableText>
    ) },
    { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, width: "64px", align: "right", cell: (row) => (
      <TableActions>
        <Menu align="end" items={rowActions(row)} trigger={<IconButton appearance="flat" level="primary" aria-label={`Actions for ${row.name}`} icon="icon-dots-horizontal-line" />} />
      </TableActions>
    ) },
  ];

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const filters = {
    Role: { options: roles as readonly string[], values: roleFilter, setValues: setRoleFilter },
    Status: { options: statuses as readonly string[], values: statusFilter, setValues: setStatusFilter },
  };
  // Desktop: the chip's Popover. Phone: the chip opens a Bottom Sheet with the same choices (popovers are for pointers).
  const filterChip = (label: keyof typeof filters) => {
    const { options, values, setValues } = filters[label];
    const shared = { variant: "advanced", size: "md", dropdown: true, selectionMode: "multiple", selected: values.length > 0, selectionCount: values.length, onClearSelection: () => refine(() => setValues([])) } as const;
    return phone
      ? <Chip {...shared} aria-haspopup="dialog" aria-expanded={sheet === label} onClick={() => setSheet(label)}>{values.length === 1 ? values[0] : label}</Chip>
      : (
        <Chip {...shared} popoverMultiple popoverLabel={label} popoverItems={options.map((option) => ({ id: option, label: option, selected: values.includes(option) }))}
          onPopoverSelect={(item) => refine(() => setValues(toggle(values, item.id)))}>
          {values.length === 1 ? values[0] : label}
        </Chip>
      );
  };
  const filtered = roleFilter.length > 0 || statusFilter.length > 0;
  const empty = filtered || !query.trim()
    ? <EmptyState title="No members match" headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another role or status.</EmptyState>
    : <EmptyState title={`No results for “${query.trim()}”`} headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => { refine(() => setQuery("")); searchRef.current?.focus(); } }}>Search by name or email address.</EmptyState>;
  /** Phone: a member's actions in a Bottom Sheet (the Menu's items, without the ones that are locked). */
  const sheetActions = (person: Member) => rowActions(person).filter((entry): entry is MenuItemData => entry.type !== "separator" && entry.type !== "group" && !entry.disabled);

  return (
    <AppShell
      sidebar={(
        <Sidebar
          // The workspace mark and name head the Sidebar (brand grows with density; the logo slot is for a logo image).
          brand={<Stack direction="row" gap="xs" align="center"><Avatar size="sm" shape="square" theme="violet" alt="">{workspace.initial}</Avatar><Text as="span" textStyle="Body/Base/Bold">{workspace.name}</Text></Stack>}
          sections={nav}
          selectedId="members"
          // Your router goes here: navigate(`/${item.id}`).
          onItemClick={(item) => { if (item.id !== "members") notInDemo(item.label); }}
        />
      )}
      header={<Breadcrumbs master={false} items={[{ id: "admin", label: "Admin" }, { id: "members", label: "Team members" }]} onNavigate={(item, event) => { event.preventDefault(); if (item.id !== "members") notInDemo(String(item.label)); }} />}
      headerActions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-expanded={inboxOpen} onClick={() => { setUnread(0); setInboxOpen((open) => !open); }} />
        <Menu align="end" trigger={<AppShellAccount name="Linh Hoang" theme="yellow" />} items={[
          { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => notInDemo("Profile") },
          { type: "separator" },
          { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notInDemo("Signing out") },
        ]} />
      </>}
      aside={inboxOpen ? (
        <SidePanel type="standard" title="Notifications" open onOpenChange={setInboxOpen}>
          <List aria-label="Notifications">
            {notices.map((notice) => {
              const owen = notice.id === "pending" ? members.find((person) => person.name === "Owen Clarke" && person.status === "Invited") : undefined;
              return (
                <ListItem key={notice.id} title={notice.title} caption={notice.id === "seats" ? `${seatsUsed} of ${workspace.seats} seats in use · ${notice.caption}` : notice.caption}
                  leading={<DockIcon icon={notice.icon} background="subtle" size="md" />}
                  trailing={owen ? <IconButton appearance="flat" level="primary" size="md" icon="icon-send-01-line" aria-label={`Resend invite to ${owen.name}`} onClick={() => resend(owen)} /> : undefined} />
              );
            })}
          </List>
        </SidePanel>
      ) : undefined}
    >
      <Container maxWidth="full">
        <Stack gap="lg" paddingY="lg">
          <PageHeader
            title="Team members"
            description={`Everyone with access to the ${workspace.name} workspace. ${seatsUsed} of ${workspace.seats} seats are in use.`}
            actions={<>
              <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Member list exported", children: `${plural(shown.length, "member")} · dizai-studio-members.csv` })}>Export</Button>
              <Button level="primary" startIcon="icon-user-plus-line" onClick={startInvite}>Invite members</Button>
            </>}
          />

          <Stack gap="md">
            {/* Search fills its column; the filter chips (and Clear all, once both are on) share the rest. */}
            <Grid columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }} gap="sm" align="center">
              <Search ref={searchRef} aria-label="Search members" placeholder="Search members" value={query} onValueChange={(value) => refine(() => setQuery(value))} />
              <Stack direction="row" gap="xs" align="center" wrap>
                {filterChip("Role")}
                {filterChip("Status")}
                {roleFilter.length > 0 && statusFilter.length > 0 ? <Button level="tertiary" onClick={() => { refine(() => { setRoleFilter([]); setStatusFilter([]); }); searchRef.current?.focus(); }}>Clear all</Button> : null}
              </Stack>
            </Grid>

            {phone ? (
              // Phone: the same page of members as a List (role over the status at the end); a row opens its actions.
              rows.length ? (
                <List ref={listRef} aria-label="Team members">
                  {rows.map((row) => (
                    <ListItem key={row.id} title={row.id === ME ? `${row.name} (you)` : row.name} selected={acting?.id === row.id} onClick={() => setActing(row)}
                      // A long email breaks onto a second line instead of running out of the row (it is the member's only ID here).
                      caption={<Text as="span" textStyle="Body/Small/Regular" tone="light" style={{ overflowWrap: "anywhere" }}>{row.email}</Text>}
                      leading={<Avatar size="md" theme={row.theme} background="subtle" src={row.photo} alt="">{initials(row.name)}</Avatar>}
                      trailing={(
                        <Stack gap="2xs" align="end">
                          <Text as="span" textStyle="Body/Small/Regular" tone="base">{row.role}</Text>
                          <Badge size="sm" theme={statusTheme[row.status]} background="subtle">{row.status}</Badge>
                        </Stack>
                      )} />
                  ))}
                </List>
              ) : empty
            ) : (
              <Table ref={tableRef} aria-label="Team members" rows={rows} getRowId={(row) => row.id} columns={columns}
                sort={sort} onSortChange={(next) => { setSort(next); setPage(1); }}
                selectable selectedIds={selected} onSelectionChange={setSelected} empty={empty} />
            )}

            {shown.length > 10 ? (
              <Stack direction="row" justify="end">
                <Pagination theme="inline" aria-label="Team members pages" page={current} total={shown.length} pageSize={pageSize} pageSizeOptions={[10, 25, 50]}
                  onPageChange={(next) => { setPage(next); (tableRef.current ?? listRef.current)?.scrollIntoView({ block: "nearest" }); }}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Container>

      {picked.length ? (
        <ActionBar direction="horizontal" aria-label="Selected members"
          summary={(
            <Stack direction="row" gap="xs" align="center">
              <IconButton appearance="flat" level="primary" aria-label="Clear selection" icon="icon-x-line" onClick={() => setSelected([])} />
              <Text as="span" role="status" textStyle="Body/Base/Medium">
                {plural(picked.length, "member")} selected{skipped.length ? ` · Actions skip ${skipped.join(" and ")}` : ""}
              </Text>
            </Stack>
          )}
          secondaryAction={{ label: "Change role", disabled: !pickedEditable.length, onClick: () => openRole(pickedEditable) }}
          primaryAction={{ label: pickedEditable.length === 1 ? "Remove member" : "Remove members", level: "danger", disabled: !pickedEditable.length, onClick: () => openRemove(pickedEditable) }} />
      ) : null}

      {/* Phone filters: picks keep the sheet open; Show closes it on the filtered list. */}
      <BottomSheet open={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheet ?? "Filter"}
        primaryAction={{ label: `Show ${plural(shown.length, "member")}` }}>
        {sheet ? (
          <List aria-label={sheet}>
            {filters[sheet].options.map((option) => {
              const { values, setValues } = filters[sheet];
              const on = values.includes(option);
              return <ListItem key={option} title={option} selected={on} trailing={on ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
                onClick={() => refine(() => setValues(toggle(values, option)))} />;
            })}
          </List>
        ) : null}
      </BottomSheet>
      <BottomSheet type="action" open={acting !== null} onOpenChange={(open) => { if (!open) setActing(null); }} title={acting?.name ?? "Member"}
        items={acting ? sheetActions(acting).map(({ id, label, icon, danger }) => ({ id, label, icon, destructive: danger })) : []}
        onSelect={(item) => { const entry = acting ? sheetActions(acting).find((action) => action.id === item.id) : undefined; setActing(null); entry?.onSelect?.(); }} />

      <ModalForm open={inviting} onOpenChange={setInviting} title="Invite members" onSubmit={invite.handleSubmit}
        description={`${plural(seatsLeft, "seat")} left on the ${workspace.plan} plan. Guests don't need one.`}
        primaryAction={{ label: "Send invites" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email addresses" autoComplete="off" inputMode="email" placeholder="nhi.dang@dizai.studio"
          helpText="Separate addresses with commas" data-autofocus="" {...invite.field("emails")} />
        <FormFieldset legend="Role" kind="radio">
          {roleChoices.map((choice) => <RadioButton key={choice.value} label={choice.value} caption={choice.caption} {...invite.radioField("role", choice.value)} />)}
        </FormFieldset>
        <TextAreaField label="Personal message" labelOptional rows={3} maxLength={200} characterLimit placeholder="Welcome to the studio! Your first projects are waiting in Lumen." {...invite.field("message")} />
      </ModalForm>

      <ModalForm open={roleOpen} onOpenChange={setRoleOpen} title="Change role" onSubmit={roleForm.handleSubmit}
        description={roleTargets.length === 1 ? `${roleTargets[0].name} · ${roleTargets[0].email}` : `For ${nameList(roleTargets)}`}
        primaryAction={{ label: "Change role" }} secondaryAction={{ label: "Cancel" }}>
        <FormFieldset legend="Role" kind="radio">
          {roleChoices.map((choice) => <RadioButton key={choice.value} label={choice.value} caption={choice.caption} {...roleForm.radioField("role", choice.value)} />)}
        </FormFieldset>
      </ModalForm>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen} theme="negative"
        title={removing.length === 1 ? `Remove ${removing[0].name}?` : `Remove ${plural(removing.length, "member")}?`}
        description={`${nameList(removing)} ${removing.length === 1 ? "loses" : "lose"} access to ${workspace.name} right away. Their files and comments stay in the workspace.`}
        primaryAction={{ label: removing.length === 1 ? "Remove member" : "Remove members", level: "danger", onClick: confirmRemove }}
        // Cancel takes the first focus, so a stray Enter can't remove anyone.
        secondaryAction={{ label: "Cancel", autoFocus: true, onClick: () => setRemoveOpen(false) }} />
    </AppShell>
  );
}
