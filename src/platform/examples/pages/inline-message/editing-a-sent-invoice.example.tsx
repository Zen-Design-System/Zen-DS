import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, Breadcrumbs, Button, Card, DescriptionList, Form, FormActions, Grid, Heading,
  InlineMessage, InputField, List, ListBox, ListItem, Menu, PageHeader, SelectField, Sidebar, SidebarMenuItem, Stack, Text, TextAreaField, Thumbnail,
  useFormState, useToast, type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatMoney, formatRelative, initials, invoiceStatusTheme, invoices, me, people, projectById, studio, type PersonId } from "../../data";

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

const sentInvoice = invoices.find((invoice) => invoice.number === "INV-2026-0142")!;
const terms = [
  { value: "net15", label: `Net 15 · due ${formatDate(daysFromToday(10))}` },
  { value: "net30", label: `Net 30 · due ${formatDate(sentInvoice.due)}` },
  { value: "net45", label: `Net 45 · due ${formatDate(daysFromToday(40))}` },
];
type InvoiceEdit = { terms: string; po: string; note: string };
/** What the invoice bills: the September work on the Loyalty app, $120 an hour. */
const lineItems = [
  { id: "design", title: "Points history and rewards screens", caption: "Design · 96 h at $120", amount: 11520 },
  { id: "api", title: "Rewards API in checkout", caption: "Engineering · 64 h at $120", amount: 7680 },
  { id: "research", title: "Usability round with store staff", caption: "Research · fixed fee", amount: 1800 },
];
type HistoryEntry = { id: string; who: PersonId | "trang"; text: string; at: Date };
const firstHistory: HistoryEntry[] = [
  { id: "asked", who: "trang", text: "Asked for the purchase order number on it", at: daysFromToday(-1, 16, 40) },
  { id: "viewed", who: "trang", text: "Opened the invoice", at: daysFromToday(-4, 14, 12) },
  { id: "sent", who: "mai", text: "Sent it to Trang Le at Phin & Co", at: daysFromToday(-5, 9, 30) },
];
/** Trang Le, Phin & Co's product owner, is a client guest: initials on a steady theme. */
const historyAvatar = (who: HistoryEntry["who"]) => who === "trang"
  ? <Avatar size="md" theme="blue" alt="">TL</Avatar>
  : people[who].photo ? <Avatar size="md" theme="photo" src={people[who].photo} alt="" /> : <Avatar size="md" theme={people[who].theme} alt="">{initials(people[who].name)}</Avatar>;
const historyName = (who: HistoryEntry["who"]) => (who === "trang" ? "Trang Le" : people[who].name);

/**
 * One page of the studio's app: AppShell Layout=Sidebar, the trail and the utilities in the header's top row and the
 * page's PageHeader, its h1, as the Main row. The Body pads the page margins itself.
 */
function StudioApp({ here, leading, main, children }: { here: string; leading?: ReactNode; main: ReactNode; children: ReactNode }) {
  const { toast } = useToast();
  const [unread, setUnread] = useState(1);
  // A place this example does not draw: the toast says so, and the navigation keeps the current page.
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Inline Message." });
  return (
    <AppShell
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => { if (item.id !== here) notHere(item.label); }}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader leading={leading}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
              toast(unread ? { title: "Trang Le commented on INV-2026-0142", children: "“Could you add our PO number before Friday?”" } : { title: "No new notifications", children: "You’re all caught up." });
              setUnread(0);
            }} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          main={main}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

export default function SentInvoice() {
  const { toast } = useToast();
  const itemsId = useId();
  const historyId = useId();
  const [history, setHistory] = useState(firstHistory);
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Inline Message." });
  const form = useFormState<InvoiceEdit>({
    initialValues: { terms: "net30", po: "", note: "" },
    validate: ({ note }) => ({ note: note.trim() ? undefined : "Tell Phin & Co what changed" }),
    // The saved values become the new baseline for the next edit; the invoice's history records the new copy.
    onSubmit: (values, { reset }) => {
      reset(values);
      setHistory((list) => [{ id: `resent-${list.length}`, who: "alex", text: "Sent the updated copy to Trang Le", at: TODAY }, ...list]);
      toast({ title: "Updated invoice sent", children: "Phin & Co got the new copy by email" });
    },
  });
  return (
    <StudioApp here="invoices"
      leading={<Breadcrumbs master={false} items={[{ id: "invoices", label: "Invoices" }, { id: sentInvoice.id, label: sentInvoice.number }]}
        onNavigate={(item, event) => { event.preventDefault(); notHere(String(item.label)); }} />}
      main={<PageHeader title={`Edit ${sentInvoice.number}`}
        meta={<Badge theme={invoiceStatusTheme[sentInvoice.status]} background="subtle">{sentInvoice.status}</Badge>}
        description={`${sentInvoice.client} · ${projectById(sentInvoice.project).name} · Issued ${formatDate(sentInvoice.issued)}`} />}>
      {/* The form beside what it bills and what happened to it; under 880px the summary moves under the form. Beside the
          Sidebar every box takes its elevation (Shadow). */}
      <Grid columns="minmax(0, 1fr) minmax(0, 320px)" stackBelow={880} gap="md" align="start" maxWidth={1200}>
        <Card theme="shadow" as="section" aria-label="Invoice details">
          <Form form={form}>
            {/* Context for the whole form, above its first field. Essential, so it has no close button. */}
            <InlineMessage theme="warning" title="Phin & Co already has this invoice">
              Saving emails them the updated copy with your note about what changed.
            </InlineMessage>
            <Stack gap="md">
              <SelectField label="Payment terms" options={terms} {...form.selectField("terms")} />
              <InputField label="Purchase order" labelOptional helpText="Trang Le asked for PHIN-PO-0915 on Sep 29" {...form.field("po")} />
              <TextAreaField label="Note to Phin & Co" helpText="Shown at the top of the email" rows={3} {...form.field("note")} />
            </Stack>
            <FormActions>
              {/* Back to what Phin & Co already has. */}
              {form.isDirty ? <Button level="tertiary" onClick={() => form.reset()}>Undo changes</Button> : null}
              <Button level="primary" type="submit">Save and send</Button>
            </FormActions>
          </Form>
        </Card>
        <Stack gap="md">
          <Card theme="shadow" as="section" aria-labelledby={itemsId}>
            <Stack gap="md">
              <Heading level={2} id={itemsId} textStyle="Heading/Subheading">Line items</Heading>
              <List aria-labelledby={itemsId}>
                {lineItems.map((item) => (
                  <ListItem key={item.id} title={item.title} titleLines={2} caption={item.caption} value={formatMoney(item.amount)} />
                ))}
              </List>
              <DescriptionList items={[
                { term: "Total", description: formatMoney(sentInvoice.amount, true), emphasis: true },
              ]} />
            </Stack>
          </Card>
          <ListBox theme="shadow" as="section" aria-labelledby={historyId}
            header={<Heading level={2} id={historyId} textStyle="Heading/Subheading">History</Heading>}>
            <List aria-labelledby={historyId}>
              {history.map((entry) => (
                <ListItem key={entry.id} title={historyName(entry.who)} caption={`${entry.text} · ${formatRelative(entry.at)}`} leading={historyAvatar(entry.who)} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Grid>
    </StudioApp>
  );
}
