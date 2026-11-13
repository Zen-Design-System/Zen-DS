import { useRef, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Badge, Button, DateField, EmptyState, Grid, IconButton, InputField, Menu, MetricCard, ModalForm,
  PageHeader, SelectField, Sidebar, SidebarMenuItem, Stack, Table, TableActions, TableBadges, TableText, Text, Thumbnail, VisuallyHidden, plural, useToast,
  type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { TODAY, activity, daysFromToday, formatDate, formatDay, formatMoney, me, people, projectById, projects, studio } from "../../data";

/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "expenses", label: "Expenses", icon: "icon-wallet-02-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);

type Expense = { id: string; what: string; project: string; date: Date; amount: number };
const approver = people.mai;
const expenseProjects = projects.filter((project) => project.status !== "Completed").map((project) => ({ value: project.id, label: `${project.name} · ${project.client}` }));
/** "09/30/2026" (the DateField's typed format) → a Date, or null while it is incomplete. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && d.getDate() === Number(m?.[2]) && d <= TODAY ? d : null;
};
const todayText = "09/30/2026";
/** Mai Ho approves expenses every Friday: the next one is Oct 2. */
const nextFriday = daysFromToday(2);

/**
 * Alex's Expenses page in the studio's app: AppShell Layout=Sidebar, the toggle at the start of the header's top row, the
 * utilities (Notifications, the account) at its end, and the page's PageHeader, its h1, as the Main row. The Body pads
 * the page margins itself.
 */
export default function FirstRun() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const [rows, setRows] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [project, setProject] = useState(expenseProjects[0].value);
  const [date, setDate] = useState(todayText);
  const [errors, setErrors] = useState<{ what?: string; amount?: string; date?: string }>({});
  // After a delete, focus goes to the first Delete left, or to the Empty State's title once the last row is gone.
  const firstDeleteRef = useRef<HTMLButtonElement>(null);
  const emptyTitleRef = useRef<HTMLSpanElement>(null);
  const first = unreadActivity[0];
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Empty State." });
  const start = () => { setWhat(""); setAmount(""); setProject(expenseProjects[0].value); setDate(todayText); setErrors({}); setOpen(true); };
  const add = () => {
    const value = Number(amount.replace(/[$,\s]/g, ""));
    const day = parseDay(date);
    const next = {
      what: what.trim() ? undefined : "Say what the expense was for.",
      amount: value > 0 ? undefined : "Enter the amount on the receipt, like 42.50.",
      date: day ? undefined : "Enter the date on the receipt, today or earlier.",
    };
    setErrors(next);
    // A blocked submit: ModalForm moves focus to the first field in error, so its message is read out.
    if (next.what || next.amount || next.date || !day) return;
    setRows((list) => [{ id: `e${list.length}-${what.length}`, what: what.trim(), project, date: day, amount: value }, ...list]);
    setOpen(false);
    toast({ type: "positive", title: "Expense added", children: `${approver.name} approves it by ${formatDate(nextFriday)}.` });
  };
  // Deleting is undoable, so it acts at once and offers Undo; the last delete brings the Empty State back.
  const remove = (row: Expense) => {
    const index = rows.indexOf(row);
    setRows((list) => list.filter((item) => item.id !== row.id));
    toast({ title: "Expense deleted", action: { label: "Undo", onClick: () => setRows((list) => [...list.slice(0, index), row, ...list.slice(index)]) } });
    setTimeout(() => (firstDeleteRef.current ?? emptyTitleRef.current)?.focus());
  };
  const columns: TableColumn<Expense>[] = [
    { id: "what", header: "Expense", cell: (row) => <TableText bold caption={projectById(row.project).name}>{row.what}</TableText> },
    { id: "date", header: "Date", width: "140px", cell: (row) => <TableText>{formatDate(row.date)}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: () => <TableBadges><Badge size="medium" background="subtle" theme="yellow">Pending</Badge></TableBadges> },
    { id: "amount", header: "Amount", align: "right", width: "140px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
    {
      id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "72px",
      cell: (row) => (
        <TableActions>
          <IconButton ref={row.id === rows[0]?.id ? firstDeleteRef : undefined} appearance="flat" size="md" icon="icon-trash-line" aria-label={`Delete ${row.what}`} onClick={() => remove(row)} />
        </TableActions>
      ),
    },
  ];
  const pending = rows.reduce((sum, row) => sum + row.amount, 0);
  return (
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
          sections={studioNav} selectedId="expenses" onItemClick={(item) => { if (item.id !== "expenses") notHere(item.label); }}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
              toast(unread
                ? { title: plural(unread, "new notification"), children: `${people[first.actor].name} ${first.verb} “${first.object}”.` }
                : { title: "No new notifications", children: "You’re all caught up." });
              setUnread(0);
            }} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          // While the page is empty its only Primary is the Empty State's; the header takes it back once a row exists.
          main={<PageHeader title="Expenses" description={`What you paid for the studio. ${approver.name} approves them every Friday.`}
            actions={rows.length ? <Button level="primary" startIcon="icon-plus-line" onClick={start}>Add expense</Button> : undefined} />}
        />
      )}
    >
      <Stack gap="xl">
        {rows.length ? (
          <>
            {/* Beside the Sidebar every box takes its elevation (Shadow). */}
            <Grid minColumnWidth={240} gap="md">
              <MetricCard theme="shadow" size="md" icon="icon-clock-line" iconTheme="orange" label="Waiting for approval" value={formatMoney(pending, !Number.isInteger(pending))} />
              <MetricCard theme="shadow" size="md" icon="icon-receipt-line" iconTheme="blue" label="Expenses this month" value={String(rows.length)} />
              <MetricCard theme="shadow" size="md" icon="icon-calendar-check-line" iconTheme="green" label={`Next approval · ${approver.name}`} value={formatDay(nextFriday)} />
            </Grid>
            {/* The table is the page's content, so it lies on the page (no Card). */}
            <Table aria-label="Expenses" columns={columns} rows={rows} />
          </>
        ) : (
          // The first visit: the page has nothing yet, so the Empty State takes the page (size Medium).
          <EmptyState headingLevel={2} icon="icon-receipt-line" title={<span ref={emptyTitleRef} tabIndex={-1}>No expenses yet</span>}
            primaryAction={{ label: "Add expense", onClick: start }}>
            {`Add a receipt and ${approver.name} approves it by Friday.`}
          </EmptyState>
        )}
      </Stack>
      <ModalForm open={open} onOpenChange={setOpen} title="Add expense" description="Keep the receipt; Finance may ask for it."
        onSubmit={add} primaryAction={{ label: "Add expense" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Description" placeholder="Client lunch with Phin & Co" autoComplete="off" value={what}
          onValueChange={(value) => { setWhat(value); setErrors((e) => ({ ...e, what: undefined })); }} error={errors.what} />
        <InputField label="Amount (USD)" inputMode="decimal" autoComplete="off" value={amount}
          onValueChange={(value) => { setAmount(value); setErrors((e) => ({ ...e, amount: undefined })); }} error={errors.amount} />
        <SelectField label="Project" options={expenseProjects} value={project} onValueChange={setProject} />
        <DateField label="Date" today={TODAY} value={date} onValueChange={(value) => { setDate(value); setErrors((e) => ({ ...e, date: undefined })); }} error={errors.date} />
      </ModalForm>
    </AppShell>
  );
}
