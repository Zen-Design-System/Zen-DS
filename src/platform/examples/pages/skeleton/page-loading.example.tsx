import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Badge, Button, Grid, Heading, InputField, Menu, MetricCard, ModalForm, PageHeader, Sidebar,
  SidebarMenuItem, SkeletonHeading, SkeletonShape, SkeletonText, Stack, Table, TableBadges, TableText, Text, Thumbnail, VisuallyHidden, plural,
  useFormState, useToast, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import {
  TODAY, activity, daysFromToday, formatDate, formatMoney, invoiceStatusTheme, invoices, me, people, projectById, studio, studioMonths, type Invoice,
} from "../../data";

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

// The same columns as the invoice tables on the other pages: status last, widths for the cells that never wrap.
const invoiceColumns: TableColumn<Invoice>[] = [
  { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={projectById(row.project)?.name ?? "New draft"}>{row.number}</TableText> },
  { id: "client", header: "Client", width: "170px", cell: (row) => <TableText>{row.client}</TableText> },
  { id: "due", header: "Due", width: "150px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "150px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: (row) => <TableBadges><Badge background="subtle" theme={invoiceStatusTheme[row.status]}>{row.status}</Badge></TableBadges> },
];

/* A placeholder in a text slot stays on the text's line, so the slot keeps the height of the text that replaces it and
   the content swaps in without a jump. Its width is the usual length of that text, in characters. */
const lengths = { short: "6ch", medium: "11ch", long: "18ch" };
const line = (length: keyof typeof lengths) => (
  <SkeletonText lines={1} style={{ display: "inline-flex", width: lengths[length], maxWidth: "100%", verticalAlign: "middle" }} />
);

// The same columns while loading: one placeholder per cell, shaped like its content.
const loadingColumns: TableColumn<number>[] = [
  { id: "invoice", header: "Invoice", cell: () => <TableText bold caption={line("long")}>{line("medium")}</TableText> },
  { id: "client", header: "Client", width: "170px", cell: () => <TableText>{line("medium")}</TableText> },
  { id: "due", header: "Due", width: "150px", cell: () => <TableText>{line("medium")}</TableText> },
  { id: "amount", header: "Amount", align: "right", width: "150px", cell: () => <TableText>{line("short")}</TableText> },
  { id: "status", header: "Status", width: "120px", cell: () => <SkeletonShape shape="pill" size="xs" /> },
];

/** The latest invoices, newest first. */
const recentInvoices = [...invoices].sort((a, b) => b.number.localeCompare(a.number));
/** What clients paid in Jul – Sep: the same figures as the studio's revenue charts. */
const paidInQ3 = studioMonths.slice(-3).reduce((total, month) => total + month.collected, 0);

/**
 * The studio's Invoices page: AppShell Layout=Sidebar. The chrome (the Sidebar, the header's top row and the PageHeader
 * in its Main row) renders at once; only the Body waits for data. The Body pads the page itself.
 */
export default function InvoicesPage() {
  const { toast } = useToast();
  const tableTitleId = useId();
  const [unread, setUnread] = useState(unreadActivity.length);
  const [rows, setRows] = useState<Invoice[]>(recentInvoices);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const first = unreadActivity[0];
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Skeleton." });
  // Refresh loads the invoices again: placeholders while the request runs (1.6 s here), then the data in one step.
  const reload = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1600);
  };
  const due = rows.filter((row) => row.status === "Sent" || row.status === "Overdue");
  const overdue = rows.filter((row) => row.status === "Overdue");
  const sum = (list: Invoice[]) => formatMoney(list.reduce((total, row) => total + row.amount, 0), false);
  // Labels and icons are known up front; only the numbers wait for the data.
  const value = (text: string) => (loading
    ? <SkeletonHeading size="md" style={{ display: "inline-flex", maxWidth: "100%", verticalAlign: "middle" }} />
    : text);
  // A new draft takes the next number after the newest invoice (INV-2026-0144, then 0145…).
  const addDraft = (client: string) => setRows((list) => {
    const number = `INV-2026-${String(Number(list[0].number.slice(-4)) + 1).padStart(4, "0")}`;
    return [{ id: number, number, client, project: "", amount: 0, status: "Draft", issued: TODAY, due: daysFromToday(30) }, ...list];
  });
  // New invoice: one field, checked on submit; Cancel, Escape and the scrim close it and clear what was typed.
  const draft = useFormState<{ client: string }>({
    initialValues: { client: "" },
    validate: ({ client }) => ({ client: client.trim() ? undefined : "Enter a client" }),
    onSubmit: ({ client }, { reset }) => {
      const name = client.trim();
      addDraft(name);
      setCreating(false);
      reset();
      toast({ type: "positive", title: `Draft invoice for ${name} created` });
    },
  });
  const changeCreating = (open: boolean) => { setCreating(open); if (!open) draft.reset(); };
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
          sections={studioNav} selectedId="invoices" onItemClick={(item) => { if (item.id !== "invoices") notHere(item.label); }}
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
          main={<PageHeader title="Invoices" description="Bill clients and see what they owe the studio."
            actions={<>
              <Button level="tertiary" startIcon="icon-refresh-cw-01-line" onClick={reload}>Refresh</Button>
              <Button level="primary" startIcon="icon-plus-line" onClick={() => setCreating(true)}>New invoice</Button>
            </>} />}
        />
      )}
    >
      {/* Metrics → table: sections of a page (xl); a section heading keeps its table close (md). Beside the Sidebar every
          box takes its elevation (Shadow); the table lies on the page. */}
      <Stack gap="xl" aria-busy={loading}>
        <Grid minColumnWidth={240} gap="md">
          <MetricCard iconBackground="solid" theme="shadow" size="md" icon="icon-clock-line" iconTheme="blue" label="Outstanding" value={value(sum(due))} />
          <MetricCard iconBackground="solid" theme="shadow" size="md" icon="icon-alert-circle-line" iconTheme="red" label="Overdue" value={value(sum(overdue))} />
          <MetricCard iconBackground="solid" theme="shadow" size="md" icon="icon-check-circle-line" iconTheme="green" label="Paid in Q3" value={value(formatMoney(paidInQ3, false))} />
        </Grid>
        <Stack gap="md">
          <Heading level={2} id={tableTitleId}>Recent invoices</Heading>
          {loading
            ? <Table aria-labelledby={tableTitleId} rows={[1, 2, 3, 4, 5]} getRowId={String} columns={loadingColumns} />
            : <Table aria-labelledby={tableTitleId} rows={rows} columns={invoiceColumns} />}
        </Stack>
      </Stack>
      <VisuallyHidden role="status">{loading ? "Loading invoices…" : `${plural(rows.length, "invoice")} loaded`}</VisuallyHidden>
      <ModalForm open={creating} onOpenChange={changeCreating} title="New invoice" description="Start a draft; you can add line items next."
        onSubmit={draft.handleSubmit} primaryAction={{ label: "Create draft" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Client" autoComplete="off" placeholder="Saola Outdoor" data-autofocus="" {...draft.field("client")} />
      </ModalForm>
    </AppShell>
  );
}
