/**
 * Template: detail page (an invoice). Copy it into your app and replace the sample data and handlers.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 * PageHeader with Back, a status Badge, one Primary and a More Menu; Tabs switch the sections; a main column (line items
 * + totals) sits next to an aside of facts (Grid "2fr 1fr"); Record payment opens a ModalForm, Void a confirm Dialog.
 */
import { useState } from "react";
import {
  AppShell,
  Badge,
  Box,
  Button,
  Container,
  DescriptionList,
  Dialog,
  Grid,
  Heading,
  Icon,
  IconButton,
  InlineMessage,
  InputField,
  List,
  ListItem,
  Menu,
  ModalForm,
  PageHeader,
  SelectField,
  Sidebar,
  Stack,
  Table,
  TabPanel,
  TableText,
  Tabs,
  Text,
  TextAreaField,
  useFormState,
  useToast,
  type IconName,
  type SidebarSection,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
type Line = { id: string; item: string; detail: string; qty: number; price: number };
const lines: Line[] = [
  { id: "identity", item: "Brand identity", detail: "Logo, colour and type system", qty: 1, price: 4800 },
  { id: "pages", item: "Website pages", detail: "Home, pricing and six content pages", qty: 8, price: 350 },
  { id: "support", item: "Launch support", detail: "Hours in September", qty: 12, price: 90 },
];
const TAX_RATE = 0.1;
const subtotal = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
const total = subtotal + tax;
const billingEmail = "billing@northwind.example";
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const methods = [{ label: "Bank transfer", value: "bank" }, { label: "Card", value: "card" }, { label: "Cash", value: "cash" }];
type Activity = { id: string; title: string; when: string; icon: IconName };
const history: Activity[] = [
  { id: "reminder", title: `Reminder sent to ${billingEmail}`, when: "16 Sep 2026, 09:00", icon: "icon-mail-01-line" },
  { id: "viewed", title: "Viewed by Northwind Traders", when: "3 Sep 2026, 10:24", icon: "icon-eye-line" },
  { id: "sent", title: `Sent to ${billingEmail}`, when: "1 Sep 2026, 09:05", icon: "icon-send-01-line" },
  { id: "created", title: "Created by Ava Chen", when: "1 Sep 2026, 08:52", icon: "icon-receipt-line" },
];
const nav: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: <Icon name="icon-home-03-line" /> },
  { id: "invoices", label: "Invoices", icon: <Icon name="icon-receipt-line" /> },
  { id: "clients", label: "Clients", icon: <Icon name="icon-users-line" /> },
] }];
const sections = [{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity" }];
const parseAmount = (text: string) => Number(text.replace(/[$,\s]/g, ""));

export function DetailTemplate() {
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [paid, setPaid] = useState(0);
  const [voided, setVoided] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [activity, setActivity] = useState(history);
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  const status: { label: string; theme: "neutral" | "green" | "yellow" | "red" } = voided ? { label: "Void", theme: "neutral" }
    : balance === 0 ? { label: "Paid", theme: "green" } : paid > 0 ? { label: "Partly paid", theme: "yellow" } : { label: "Overdue", theme: "red" };

  const log = (title: string, icon: IconName) => setActivity((list) => [{ id: `${list.length}-${title}`, title, when: "Just now", icon }, ...list]);
  const remind = () => { log(`Reminder sent to ${billingEmail}`, "icon-mail-01-line"); toast({ title: "Reminder sent" }); };

  const payment = useFormState({
    initialValues: { amount: "", method: "bank", note: "" },
    validate: (values) => {
      const amount = parseAmount(values.amount);
      if (!values.amount.trim() || !(amount > 0)) return { amount: "Enter the amount you received, like 1,200.00" };
      return amount > balance ? { amount: `Enter at most ${money(balance)}, the balance due` } : {};
    },
    onSubmit: (values, { reset }) => {
      const amount = parseAmount(values.amount);
      setPaid((current) => Math.round((current + amount) * 100) / 100);
      log(`Payment of ${money(amount)} recorded (${methods.find((method) => method.value === values.method)?.label})`, "icon-bank-note-01-line");
      setPaying(false);
      reset();
      toast({ type: "positive", title: `Payment of ${money(amount)} recorded` });
    },
  });
  // Prefill the balance each time the form opens.
  const recordPayment = () => { payment.reset({ amount: balance.toFixed(2), method: "bank", note: "" }); setPaying(true); };

  return (
    <AppShell sidebar={<Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} sections={nav} selectedId="invoices" />}>
      <Container>
        <Stack gap="lg" paddingY="lg">
          <PageHeader
            back={{ label: "Invoices", onClick: () => toast({ title: "Back to Invoices" }) /* your router: navigate("/invoices") */ }}
            title="Invoice INV-0142"
            meta={<Badge size="small" theme={status.theme} background="subtle">{status.label}</Badge>}
            description={`Northwind Traders · ${money(total)} · due 15 Sep 2026`}
            actions={<>
              <Button level="tertiary" startIcon={<Icon name="icon-download-01-line" decorative />} onClick={() => toast({ title: "Downloading INV-0142.pdf" })}>Download PDF</Button>
              <Button level="primary" startIcon={<Icon name="icon-bank-note-01-line" decorative />} disabled={voided || balance === 0} onClick={recordPayment}>Record payment</Button>
              <Menu align="end" trigger={<IconButton aria-label="More actions" icon={<Icon name="icon-dots-horizontal-line" />} />}
                items={[
                  { id: "duplicate", label: "Duplicate", icon: "icon-copy-line", onSelect: () => toast({ title: "Draft INV-0143 created from this invoice" }) },
                  { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", disabled: voided || balance === 0, onSelect: remind },
                  { type: "separator" },
                  { id: "void", label: "Void invoice", icon: "icon-slash-circle-01-line", danger: true, disabled: voided || paid > 0, caption: paid > 0 && !voided ? "Invoices with payments can’t be voided" : undefined, onSelect: () => setConfirmVoid(true) },
                ]} />
            </>}
            tabs={<Tabs aria-label="Invoice sections" idPrefix="invoice" items={sections} value={tab} onValueChange={setTab} />}
          />

          <TabPanel idPrefix="invoice" id="overview" hidden={tab !== "overview"}>
            <Stack gap="lg">
              {status.label === "Overdue" ? (
                <InlineMessage theme="warning" title="12 days overdue" action={{ label: "Send reminder", onClick: remind }}>
                  Northwind Traders hasn’t paid yet. Send a reminder, or record a payment you received.
                </InlineMessage>
              ) : null}
              {/* Main column + aside; on phones the aside moves under the main column. */}
              <Grid columns={{ mobile: 1, desktop: "2fr 1fr" }} gap="lg" align="start">
                <Box surface="surface" border="pale" radius="xl" padding="xl">
                  <Stack gap="md">
                    <Heading level={2} textStyle="Heading/4">Line items</Heading>
                    <Table aria-label="Line items" rows={lines} getRowId={(row) => row.id}
                      columns={[
                        { id: "item", header: "Item", cell: (row) => <TableText caption={row.detail}>{row.item}</TableText> },
                        { id: "qty", header: "Qty", align: "right", cell: (row) => <TableText>{row.qty}</TableText> },
                        { id: "rate", header: "Rate", align: "right", cell: (row) => <TableText>{money(row.price)}</TableText> },
                        { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{money(row.qty * row.price)}</TableText> },
                      ]} />
                    <DescriptionList items={[
                      { term: "Subtotal", description: money(subtotal) },
                      { term: `Tax (${TAX_RATE * 100}%)`, description: money(tax) },
                      { term: "Total", description: money(total), emphasis: true },
                    ]} />
                  </Stack>
                </Box>

                <Stack gap="lg">
                  <Box surface="surface" border="pale" radius="xl" padding="xl">
                    <Stack gap="md">
                      <Heading level={2} textStyle="Heading/4">Payment</Heading>
                      <DescriptionList items={[
                        { term: "Issued", description: "1 Sep 2026" },
                        { term: "Due", description: "15 Sep 2026" },
                        { term: "Paid", description: money(paid) },
                        { term: "Balance due", description: voided ? "None (void)" : money(balance), emphasis: true },
                      ]} />
                    </Stack>
                  </Box>
                  <Box surface="surface" border="pale" radius="xl" padding="xl">
                    <Stack gap="md">
                      <Heading level={2} textStyle="Heading/4">Billed to</Heading>
                      <DescriptionList layout="stacked" items={[
                        { term: "Client", description: "Northwind Traders" },
                        { term: "Email", description: billingEmail, action: (
                          <IconButton appearance="flat" level="primary" size="sm" aria-label="Copy billing email" icon={<Icon name="icon-copy-line" />}
                            onClick={() => { void navigator.clipboard?.writeText(billingEmail).catch(() => undefined); toast({ title: "Email copied" }); }} />
                        ) },
                        { term: "Address", description: "88 Le Loi, Ben Thanh Ward, District 1, Ho Chi Minh City" },
                      ]} />
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
            </Stack>
          </TabPanel>

          <TabPanel idPrefix="invoice" id="activity" hidden={tab !== "activity"}>
            <Box surface="surface" border="pale" radius="xl" padding="xl">
              <List aria-label="Invoice activity">
                {activity.map((event) => <ListItem key={event.id} title={event.title} caption={event.when} leading={<Icon name={event.icon} decorative />} />)}
              </List>
            </Box>
          </TabPanel>
        </Stack>
      </Container>

      <ModalForm open={paying} onOpenChange={setPaying} title="Record a payment" description={`Balance due: ${money(balance)}`} onSubmit={payment.handleSubmit}
        primaryAction={{ label: payment.isSubmitting ? "Recording…" : "Record payment" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Amount (USD)" inputMode="decimal" autoComplete="off" placeholder="1,200.00" {...payment.field("amount")} />
        <SelectField label="Method" options={methods} {...payment.selectField("method")} />
        <TextAreaField label="Note" labelOptional rows={2} maxLength={140} characterLimit placeholder="Transfer ref. 88213" {...payment.field("note")} />
      </ModalForm>

      <Dialog open={confirmVoid} onOpenChange={setConfirmVoid} theme="negative" title="Void invoice INV-0142?"
        description="Northwind Traders can no longer pay it, and it stays in your records as void. You can’t undo this."
        primaryAction={{ label: "Void invoice", level: "danger", onClick: () => { setVoided(true); setConfirmVoid(false); log("Invoice voided", "icon-slash-circle-01-line"); toast({ title: "INV-0142 was voided" }); } }}
        secondaryAction={{ label: "Cancel", onClick: () => setConfirmVoid(false) }} />
    </AppShell>
  );
}
