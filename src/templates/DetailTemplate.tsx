/**
 * Template: detail page (an invoice in a billing app). Copy it into your app, then replace the sample data and handlers.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 *
 * - Top bar: Breadcrumbs back to Invoices, Notifications (a docked Side Panel) and the account menu.
 * - PageHeader: the invoice number with its status Badge and what is due, a More Menu (Download PDF, Duplicate,
 *   Void → negative Dialog) and one Primary, Record payment → ModalForm; Tabs Overview / Activity.
 * - Main column + aside: Overview shows the line items Table with DescriptionList totals and the notes, Activity the
 *   invoice's timeline. The aside stays beside both tabs: the amount due, an overdue InlineMessage and the client.
 * - Recording a payment updates the status, the amounts and the timeline, and its Toast offers Undo.
 * - Phone: the More actions open in a Bottom Sheet instead of a Menu.
 */
import { useState } from "react";
import {
  AppShell,
  AppShellAccount,
  AppShellAction,
  Avatar,
  Badge,
  BottomSheet,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Container,
  DateField,
  DescriptionList,
  Dialog,
  DockIcon,
  Grid,
  Heading,
  Icon,
  IconButton,
  InlineMessage,
  InputField,
  List, ListBox,
  ListItem,
  Menu,
  Metric,
  ModalForm,
  PageHeader,
  SelectField,
  SidePanel,
  Sidebar,
  Stack,
  Table,
  TabPanel,
  TableText,
  Tabs,
  Text,
  useFormState,
  useToast,
  useZen,
  type BadgeTheme,
  type DockIconTheme,
  type IconName,
  type MenuEntry,
  type MenuItemData,
  type SidebarSection,
  type TableColumn,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
const round = (value: number) => Math.round(value * 100) / 100;
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const amountText = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseAmount = (text: string) => Number(text.replace(/[$,\s]/g, ""));
/** DateField values are MM/DD/YYYY; people read "Sep 30, 2026". */
const readDate = (value: string) => {
  const [month, day, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const workspace = { name: "Đìzai Studio", initial: "Đ" };
const signedIn = "Linh Tran";
const invoice = { number: "INV-0142", issued: "Aug 31, 2026", due: "Sep 15, 2026", terms: "Net 15", daysOverdue: 15, today: "09/30/2026" };
const client = {
  name: "Lotus Coffee Co.",
  initials: "LC",
  since: "Client since Mar 2024",
  contact: "Thu Ha Nguyen, Head of marketing",
  email: "accounts@lotuscoffee.example",
  address: "25 Ly Tu Trong, Ben Nghe Ward, District 1, Ho Chi Minh City, Vietnam",
};

type Line = { id: string; item: string; detail: string; qty: number; price: number };
const lines: Line[] = [
  { id: "workshop", item: "Discovery workshop", detail: "On site, Aug 4 – Aug 5", qty: 2, price: 1800 },
  { id: "design", item: "UX and UI design", detail: "Rewards and checkout flows", qty: 64, price: 95 },
  { id: "system", item: "Design system", detail: "Tokens and 24 components", qty: 1, price: 4200 },
  { id: "testing", item: "Usability testing", detail: "Moderated sessions", qty: 5, price: 320 },
];
const DISCOUNT_RATE = 0.05;
const TAX_RATE = 0.1;
const subtotal = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
const discount = round(subtotal * DISCOUNT_RATE);
const tax = round((subtotal - discount) * TAX_RATE);
const total = round(subtotal - discount + tax);

/** Timeline events, newest first; timestamps follow the ladder (today is Wednesday, Sep 30, 2026). */
type Activity = { id: string; title: string; caption: string; icon: IconName; theme?: DockIconTheme };
const history: Activity[] = [
  { id: "viewed-2", title: "Viewed by Thu Ha Nguyen", caption: "Monday at 9:12 am", icon: "icon-eye-line" },
  { id: "reminder", title: "Automatic reminder sent", caption: `To ${client.email} · Sep 22 at 9:00 am`, icon: "icon-mail-01-line" },
  { id: "viewed", title: "Viewed by Thu Ha Nguyen", caption: "Sep 1 at 10:24 am", icon: "icon-eye-line" },
  { id: "sent", title: "Invoice sent", caption: `To ${client.email} · Aug 31 at 4:05 pm`, icon: "icon-send-01-line" },
  { id: "created", title: "Invoice created", caption: `By ${signedIn} · Aug 31 at 3:52 pm`, icon: "icon-receipt-line" },
];
const notifications: Activity[] = [
  { id: "due-0145", title: "Invoice due tomorrow", caption: "INV-0145 · Hanoi Rail Studio · 8:00 am", icon: "icon-clock-line" },
  { id: "paid-0139", title: "Payment received", caption: "INV-0139 · Mekong Travel · Yesterday at 4:12 pm", icon: "icon-bank-note-01-line" },
  { id: "quote-0031", title: "Quote accepted", caption: "Q-0031 · Saigon Bloom · Monday at 11:20 am", icon: "icon-file-check-line" },
];
const methods = [{ label: "Bank transfer", value: "bank" }, { label: "Card", value: "card" }, { label: "Cash", value: "cash" }];
type Payment = { id: string; amount: number; date: string };

const nav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "quotes", label: "Quotes", icon: "icon-file-doc-line" },
    { id: "clients", label: "Clients", icon: "icon-users-line" },
    { id: "payments", label: "Payments", icon: "icon-bank-note-01-line" },
    { id: "reports", label: "Reports", icon: "icon-bar-chart-01-line" },
    { id: "settings", label: "Settings", icon: "icon-settings-01-line" },
  ] },
];

export function DetailTemplate() {
  const { toast, dismiss } = useToast();
  // Phones drop the Qty and Unit price columns (the item's caption carries "2 × $1,800.00" instead) and open More in a
  // Bottom Sheet.
  const compact = useZen()?.breakpoint === "mobile";
  const [tab, setTab] = useState("overview");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [voided, setVoided] = useState(false);
  const [activity, setActivity] = useState(history);
  const [lastReminder, setLastReminder] = useState("Sep 22");
  const [recording, setRecording] = useState(false);
  // The amount due when the form opened: its description keeps it while the form closes after a payment.
  const [dueAtOpen, setDueAtOpen] = useState(total);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unread, setUnread] = useState(notifications.length);

  const paid = round(payments.reduce((sum, item) => sum + item.amount, 0));
  const balance = voided ? 0 : round(total - paid);
  const status: { label: string; theme: BadgeTheme } = voided ? { label: "Void", theme: "neutral" }
    : balance === 0 ? { label: "Paid", theme: "green" }
    : paid > 0 ? { label: "Partially paid", theme: "yellow" }
    : { label: "Overdue", theme: "red" };
  const summary = voided ? "Voided Sep 30, 2026" : balance === 0 ? "Paid in full" : `${money(balance)} due ${invoice.due}`;

  // Your router goes here: navigate to the list, the client or another section.
  const notInDemo = (label: string) => toast({ title: `${label} isn't part of this demo` });
  const log = (event: Activity) => setActivity((list) => [event, ...list]);
  const remind = () => {
    setLastReminder("today");
    log({ id: `reminder-${Date.now()}`, title: "Reminder sent", caption: `To ${client.email} · Just now`, icon: "icon-mail-01-line" });
    toast({ title: "Reminder sent", children: `To ${client.email}` });
  };
  const duplicate = () => toast({ title: "Invoice duplicated", children: "INV-0143 is saved as a draft" });

  const payment = useFormState({
    initialValues: { amount: "", date: invoice.today, method: "bank", reference: "" },
    validate: (values) => {
      const amount = parseAmount(values.amount);
      return {
        amount: !values.amount.trim() || !(amount > 0) ? "Enter the amount you received, like 5,000.00"
          : amount > balance ? `Enter at most ${money(balance)}, the amount due` : undefined,
        date: /^\d{2}\/\d{2}\/\d{4}$/.test(values.date) ? undefined : "Enter the date the payment arrived",
      };
    },
    onSubmit: (values, { reset }) => {
      const amount = parseAmount(values.amount);
      const id = `payment-${Date.now()}`;
      const method = (methods.find((item) => item.value === values.method)?.label ?? "Bank transfer").toLowerCase();
      const reference = values.reference.trim() ? ` · Ref. ${values.reference.trim()}` : "";
      setPayments((list) => [...list, { id, amount, date: readDate(values.date) }]);
      log({ id, title: "Payment recorded", caption: `${money(amount)} by ${method}${reference} · Just now`, icon: "icon-bank-note-01-line", theme: "green" });
      setRecording(false);
      reset();
      // Recording is undoable, so it acts first and offers Undo instead of asking to confirm.
      const toastId = toast({ type: "positive", title: "Payment recorded", children: `${money(amount)} by ${method}`, action: { label: "Undo", onClick: () => {
        setPayments((list) => list.filter((item) => item.id !== id));
        setActivity((list) => list.filter((event) => event.id !== id));
        dismiss(toastId);
      } } });
    },
  });
  // Prefill the amount due each time the form opens.
  const recordPayment = () => {
    payment.reset({ amount: amountText(balance), date: invoice.today, method: "bank", reference: "" });
    setDueAtOpen(balance);
    setRecording(true);
  };

  const moreItems: MenuEntry[] = [
    { id: "download", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => toast({ title: "PDF downloaded", children: `${invoice.number}.pdf` }) },
    { id: "duplicate", label: "Duplicate", icon: "icon-copy-line", onSelect: duplicate },
    { type: "separator" },
    { id: "void", label: "Void invoice", icon: "icon-slash-circle-01-line", danger: true, disabled: voided || paid > 0,
      caption: voided ? "This invoice is void" : paid > 0 ? "Invoices with payments can't be voided" : undefined, onSelect: () => setConfirmVoid(true) },
  ];
  /** Phone: the same actions in a Bottom Sheet (the ones that are off stay out). */
  const sheetItems = moreItems.filter((entry): entry is MenuItemData => entry.type !== "separator" && entry.type !== "group" && !entry.disabled);

  const columns: TableColumn<Line>[] = compact ? [
    { id: "item", header: "Item", cell: (row) => <TableText bold caption={`${row.qty} × ${money(row.price)}`}>{row.item}</TableText> },
    { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{money(row.qty * row.price)}</TableText> },
  ] : [
    { id: "item", header: "Item", cell: (row) => <TableText bold caption={row.detail}>{row.item}</TableText> },
    { id: "qty", header: "Qty", align: "right", cell: (row) => <TableText>{row.qty}</TableText> },
    { id: "price", header: "Unit price", align: "right", cell: (row) => <TableText>{money(row.price)}</TableText> },
    { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{money(row.qty * row.price)}</TableText> },
  ];

  return (
    <AppShell
      sidebar={(
        <Sidebar
          // The workspace mark and name head the Sidebar (brand grows with density; the logo slot is for a logo image).
          brand={<Stack direction="row" gap="xs" align="center"><Avatar size="sm" shape="square" theme="violet" alt="">{workspace.initial}</Avatar><Text as="span" textStyle="Body/Base/Bold">{workspace.name}</Text></Stack>}
          sections={nav}
          selectedId="invoices"
          onItemClick={(item) => notInDemo(item.label)}
        />
      )}
      header={<Breadcrumbs master={false} items={[{ id: "invoices", label: "Invoices" }, { id: invoice.number, label: invoice.number }]} onNavigate={(item, event) => { event.preventDefault(); notInDemo(String(item.label)); }} />}
      headerActions={<>
        <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} aria-expanded={inboxOpen} onClick={() => { setUnread(0); setInboxOpen((open) => !open); }} />
        <Menu align="end" trigger={<AppShellAccount name={signedIn} theme="teal" />} items={[
          { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => notInDemo("Profile") },
          { type: "separator" },
          { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => notInDemo("Signing out") },
        ]} />
      </>}
      aside={inboxOpen ? (
        <SidePanel type="standard" title="Notifications" open onOpenChange={setInboxOpen}>
          <List aria-label="Notifications">
            {notifications.map((item) => <ListItem key={item.id} title={item.title} caption={item.caption} leading={<DockIcon icon={item.icon} background="subtle" size="md" />} />)}
          </List>
        </SidePanel>
      ) : undefined}
    >
      <Container>
        <Stack gap="lg" paddingY="lg">
          <PageHeader
            title={`Invoice ${invoice.number}`}
            meta={<Badge theme={status.theme} background="subtle">{status.label}</Badge>}
            description={`${client.name} · ${summary}`}
            actions={<>
              {compact
                ? <IconButton aria-label={`Actions for ${invoice.number}`} icon="icon-dots-horizontal-line" aria-haspopup="dialog" aria-expanded={moreSheet} onClick={() => setMoreSheet(true)} />
                : <Menu align="end" trigger={<IconButton aria-label={`Actions for ${invoice.number}`} icon="icon-dots-horizontal-line" />} items={moreItems} />}
              {balance > 0 ? <Button level="primary" startIcon="icon-bank-note-01-line" onClick={recordPayment}>Record payment</Button> : null}
            </>}
            tabs={<Tabs aria-label="Invoice sections" idPrefix="invoice" value={tab} onValueChange={setTab}
              items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity", badge: activity.length }]} />}
          />

          {/* Main column + aside; the aside stays beside both tabs. Tablets put its two cards side by side under the
              main column, phones stack everything. */}
          <Grid columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 2fr) minmax(300px, 1fr)" }} gap="lg" align="start">
            <Stack gap="lg">
              <TabPanel idPrefix="invoice" id="overview" hidden={tab !== "overview"}>
                <Stack gap="lg">
                  <Card as="section" aria-labelledby="invoice-lines-title">
                    <Stack gap="md">
                      {/* zen-allow-table-title: the table is the body of the Line items card, titled in Heading/Subheading like its sibling cards (card-title rule). */}
                      <Heading level={2} textStyle="Heading/Subheading" id="invoice-lines-title">Line items</Heading>
                      <Table aria-labelledby="invoice-lines-title" rows={lines} getRowId={(row) => row.id} columns={columns} />
                      {/* The same inset as the table cells, so terms and amounts line up with the columns above; the
                          short totals stay on one line at every width. */}
                      <Box paddingX="md">
                        <DescriptionList stackBelow={0} items={[
                          { term: "Subtotal", description: money(subtotal) },
                          { term: `Discount (${DISCOUNT_RATE * 100}%)`, description: `−${money(discount)}` },
                          { term: `Tax (${TAX_RATE * 100}%)`, description: money(tax) },
                          { term: "Total", description: money(total), emphasis: true },
                        ]} />
                      </Box>
                    </Stack>
                  </Card>

                  <Card as="section" aria-labelledby="invoice-notes-title">
                    <Stack gap="md">
                      <Heading level={2} textStyle="Heading/Subheading" id="invoice-notes-title">Notes</Heading>
                      <DescriptionList layout="stacked" items={[
                        { term: "Message to client", description: "Thanks for trusting us with phase 2 of the Lotus Rewards app. This invoice covers the work we delivered in August." },
                        { term: "Payment instructions", description: `Bank transfer to ${workspace.name} JSC, Vietcombank account ending 3456. Use ${invoice.number} as the reference.` },
                      ]} />
                    </Stack>
                  </Card>
                </Stack>
              </TabPanel>

              <TabPanel idPrefix="invoice" id="activity" hidden={tab !== "activity"}>
                <ListBox theme="shadow">
                  <List aria-label="Invoice activity">
                    {activity.map((event) => <ListItem key={event.id} title={event.title} caption={event.caption} leading={<DockIcon icon={event.icon} theme={event.theme ?? "neutral"} background="subtle" size="md" />} />)}
                  </List>
                </ListBox>
              </TabPanel>
            </Stack>

            <Grid as="aside" aria-label="Payment and client" columns={{ mobile: 1, tablet: 2, desktop: 1 }} gap="lg" align="start">
              <Card as="section" aria-labelledby="invoice-payment-title">
                <Stack gap="md">
                  <Heading level={2} textStyle="Heading/Subheading" id="invoice-payment-title">Payment</Heading>
                  <Metric size="md" label="Amount due" value={money(balance)} icon="icon-bank-note-01-line" />
                  {voided ? (
                    <InlineMessage theme="neutral" title="Invoice voided" action={{ label: "Duplicate", onClick: duplicate }}>
                      It can't be paid and stays in your records. Duplicate it to bill the work again.
                    </InlineMessage>
                  ) : balance === 0 ? (
                    <InlineMessage theme="positive" title="Paid in full">The last payment arrived {payments.at(-1)?.date}.</InlineMessage>
                  ) : (
                    <InlineMessage theme="warning" title={`${invoice.daysOverdue} days overdue`} action={{ label: "Send reminder", onClick: remind }}>
                      {paid > 0 ? `${money(balance)} is still unpaid.` : `${client.name} hasn't paid yet.`} The last reminder went out {lastReminder}.
                    </InlineMessage>
                  )}
                  <DescriptionList stackBelow={0} items={[
                    { term: "Issued", description: invoice.issued },
                    { term: "Due", description: invoice.due },
                    { term: "Terms", description: invoice.terms },
                    { term: "Invoice total", description: money(total) },
                    { term: "Paid", description: money(paid) },
                  ]} />
                </Stack>
              </Card>

              <Card as="section" aria-labelledby="invoice-client-title">
                <Stack gap="md">
                  <Heading level={2} textStyle="Heading/Subheading" id="invoice-client-title">Client</Heading>
                  {/* The row pads 0 at the sides, so its text lines up with the heading; its fill hangs 12px outside, inside the card padding. */}
                  <List aria-labelledby="invoice-client-title">
                    <ListItem title={client.name} caption={client.since} onClick={() => notInDemo(client.name)}
                      leading={<Avatar size="md" shape="square" theme="orange" background="subtle" alt="">{client.initials}</Avatar>}
                      trailing={<Icon name="icon-chevron-right-line" decorative />} />
                  </List>
                  <DescriptionList layout="stacked" items={[
                    { term: "Contact", description: client.contact },
                    { term: "Email", description: client.email, action: (
                      <IconButton appearance="flat" level="primary" size="sm" aria-label="Copy email" icon="icon-copy-line"
                        onClick={() => { void navigator.clipboard?.writeText(client.email).catch(() => undefined); toast({ title: "Email copied" }); }} />
                    ) },
                    { term: "Billing address", description: client.address },
                  ]} />
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>

      <ModalForm open={recording} onOpenChange={setRecording} title="Record payment" description={`${client.name} · ${money(dueAtOpen)} due`} onSubmit={payment.handleSubmit}
        primaryAction={{ label: "Record payment" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Amount (USD)" inputMode="decimal" autoComplete="off" placeholder="5,000.00" {...payment.field("amount")} />
        <DateField label="Payment date" {...payment.dateField("date")} />
        <SelectField label="Method" options={methods} {...payment.selectField("method")} />
        <InputField label="Reference" labelOptional autoComplete="off" placeholder="FT26273018" {...payment.field("reference")} />
      </ModalForm>

      <BottomSheet type="action" open={moreSheet} onOpenChange={setMoreSheet} title={`Invoice ${invoice.number}`}
        items={sheetItems.map(({ id, label, icon, danger }) => ({ id, label, icon, destructive: danger }))}
        onSelect={(item) => { setMoreSheet(false); sheetItems.find((entry) => entry.id === item.id)?.onSelect?.(); }} />

      <Dialog open={confirmVoid} onOpenChange={setConfirmVoid} theme="negative" title={`Void invoice ${invoice.number}?`}
        description={`${client.name} can no longer pay it, and it stays in your records as void. You can't undo this.`}
        primaryAction={{ label: "Void invoice", level: "danger", onClick: () => {
          setVoided(true);
          setConfirmVoid(false);
          log({ id: "void", title: "Invoice voided", caption: `By ${signedIn} · Just now`, icon: "icon-slash-circle-01-line", theme: "red" });
          toast({ title: "Invoice voided" });
        } }}
        // Cancel takes the first focus, so a stray Enter can't void the invoice.
        secondaryAction={{ label: "Cancel", autoFocus: true, onClick: () => setConfirmVoid(false) }} />
    </AppShell>
  );
}
