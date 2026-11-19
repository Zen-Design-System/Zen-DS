import { useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, Box, Button, EmptyState, IconButton, Menu, ModalForm, NumberField, PageHeader,
  Search, SelectField, Sidebar, SidebarMenuItem, Stack, Table, TableText, Text, Thumbnail, plural, useFormState, useToast, useZen,
  type SidebarItem, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { TODAY, activity, daysFromToday, formatDate, formatMoney, invoiceStatusTheme, invoices, me, people, projects, studio, type Invoice } from "../../data";

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

// ——— The invoices page ——————————————————————————————————————————————————————————————————————————————
const clientNames = ["Phin & Co", "Lumen Bank", "Mekong Freight", "Hanoi Book Fair", "Saola Outdoor"];
const outstanding = (rows: Invoice[]) => rows.filter((row) => row.status === "Sent" || row.status === "Overdue").reduce((sum, row) => sum + row.amount, 0);
const invoiceBadge = (invoice: Invoice) => <Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge>;
const projectName = (id: string) => projects.find((project) => project.id === id)?.name ?? "";

export default function InvoicesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState(invoices);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const form = useFormState<{ client: string; amount: number | null }>({
    initialValues: { client: "", amount: null },
    validate: (values) => ({
      client: values.client ? undefined : "Choose a client",
      amount: values.amount && values.amount > 0 ? undefined : "Enter an amount",
    }),
    onSubmit: (values, { reset }) => {
      const number = `INV-2026-${String(144 + rows.length - invoices.length).padStart(4, "0")}`;
      setRows((list) => [{ id: number, number, client: values.client, project: "", amount: values.amount ?? 0, status: "Draft", issued: TODAY, due: daysFromToday(30) }, ...list]);
      setCreating(false);
      setQuery("");
      reset();
      toast({ type: "positive", title: "Invoice created", children: number });
    },
  });
  const needle = query.trim().toLowerCase();
  const shown = rows.filter((row) => !needle || `${row.number} ${row.client} ${projectName(row.project)}`.toLowerCase().includes(needle));
  // A phone-width page keeps the invoice and its status; client and amount move into the caption.
  const narrow = useZen()?.breakpoint === "mobile";
  const columns: TableColumn<Invoice>[] = narrow ? [
    { id: "invoice", header: "Invoice", cell: (row) => <TableText bold caption={`${row.client} · ${formatMoney(row.amount, true)}`}>{row.number}</TableText> },
    // No fixed widths on a phone: the columns share the room instead of scrolling sideways.
    { id: "status", header: "Status", cell: invoiceBadge },
  ] : [
    { id: "invoice", header: "Invoice", width: "176px", cell: (row) => <TableText bold>{row.number}</TableText> },
    { id: "client", header: "Client", cell: (row) => <TableText caption={projectName(row.project) || undefined}>{row.client}</TableText> },
    { id: "status", header: "Status", width: "120px", cell: invoiceBadge },
    { id: "due", header: "Due", width: "152px", cell: (row) => <TableText>{formatDate(row.due)}</TableText> },
    { id: "amount", header: "Amount", align: "right", width: "136px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  ];
  return (
    <StudioApp here="invoices"
      // The top row's Search finds an invoice by its number, client or project; on a narrow window it takes a row of its own.
      leading={<Box width="fill" maxWidth={400}><Search placeholder="Search invoices" value={query} onValueChange={setQuery} /></Box>}
      main={(
        // The h1 with its eyebrow and description; Tertiary first, the page's one Primary last.
        <PageHeader eyebrow="Finance" title="Invoices"
          description={`${plural(rows.length, "invoice")} this quarter · ${formatMoney(outstanding(rows))} outstanding`}
          actions={<>
            <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Export started", children: "invoices-2026-q3.csv" })}>Export</Button>
            <Button level="primary" onClick={() => setCreating(true)}>New invoice</Button>
          </>}
          // Figma Trailing-Slots: the page's icon actions after its buttons.
          trailing={<Menu align="end" trigger={<IconButton level="tertiary" icon="icon-settings-01-line" aria-label="Invoice settings" />} items={[
            { id: "numbering", label: "Numbering: INV-YYYY-NNNN", icon: "icon-hash-02-line", onSelect: () => toast({ title: "Numbering kept", children: "INV-2026-0143 is next" }) },
            { id: "reminders", label: "Payment reminders", icon: "icon-bell-01-line", onSelect: () => toast({ title: "Reminders on", children: "3 days before each due date" }) },
          ]} />} />
      )}
    >
      {/* The Body pads the page: the table lies on the Canvas, no Card. */}
      <Stack gap="md">
        <Table aria-label="Invoices" rows={shown} columns={columns}
          empty={<EmptyState size="sm" headingLevel={2} icon="icon-search-medium-line" title="No invoices match" secondaryAction={{ label: "Show all invoices", onClick: () => setQuery("") }}>Try an invoice number, a client or a project.</EmptyState>} />
      </Stack>
      <ModalForm open={creating} onOpenChange={(open) => { setCreating(open); if (!open) form.reset(); }} title="New invoice" description="It stays a draft until you send it."
        onSubmit={form.handleSubmit} primaryAction={{ label: "Create invoice" }} secondaryAction={{ label: "Cancel" }}>
        <SelectField label="Client" placeholder="Choose a client" options={clientNames.map((name) => ({ value: name, label: name }))} data-autofocus="" {...form.selectField("client")} />
        <NumberField label="Amount (USD)" min={0.01} step={100} {...form.numberField("amount")} />
      </ModalForm>
    </StudioApp>
  );
}
