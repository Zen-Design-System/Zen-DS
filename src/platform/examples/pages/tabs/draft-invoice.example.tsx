import { useId, useState } from "react";
import {
  Avatar, Badge, Button, Card, DescriptionList, DockIcon, EmptyState, Heading, List, ListItem, Stack, TabPanel, Tabs, Text, useToast,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate, formatMoney, formatRelative, initials, invoiceStatusTheme, people, projectById, type InvoiceStatus, type Person } from "../../data";

const draftInvoice = { number: "INV-2026-0143", client: "Saola Outdoor", project: projectById("saola-brand").name, amount: 12000, issued: daysFromToday(0), due: daysFromToday(30) };
type InvoiceEvent = { id: string; title: string; at: Date };
/** A person as an Avatar: their photo, or initials on their steady theme. */
const avatar = (p: Person) => p.photo
  ? <Avatar size="medium" theme="photo" src={p.photo} alt="" />
  : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;

export default function DraftInvoice() {
  // One idPrefix per rendered example, so tab and panel ids stay unique when the page shows it twice.
  const prefix = `invoice-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { toast } = useToast();
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const [tab, setTab] = useState("details");
  const [events, setEvents] = useState<InvoiceEvent[]>([{ id: "created", title: `Created by ${people.alex.name}`, at: daysFromToday(0, 9, 5) }]);
  const draft = status === "Draft";

  const log = (id: string, title: string) => setEvents((list) => [{ id, title, at: TODAY }, ...list.filter((e) => e.id !== id)]);
  const unlog = (id: string) => setEvents((list) => list.filter((e) => e.id !== id));
  const send = () => {
    setStatus("Sent");
    log("sent", `Sent to ${draftInvoice.client}`);
    toast({ title: "Invoice sent", action: { label: "Undo", onClick: () => { setStatus("Draft"); unlog("sent"); setTab((t) => (t === "payments" ? "details" : t)); } } });
  };
  const recordPayment = () => {
    setStatus("Paid");
    log("paid", `Payment of ${formatMoney(draftInvoice.amount, true)} recorded`);
    // A payment going through is news worth the Positive colour; sending stays a neutral confirmation.
    toast({ type: "positive", title: "Payment recorded", action: { label: "Undo", onClick: () => { setStatus("Sent"); unlog("paid"); } } });
  };

  return (
    <Stack><Card theme="default" width="fill" maxWidth={480} alignSelf="center">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm">
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{draftInvoice.number}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${draftInvoice.client} · ${draftInvoice.project}`}</Text>
          </Stack>
          <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge>
        </Stack>
        <Stack gap="xs">
          {/* ←/→ skip the disabled tab; the line under the bar says why it is off. */}
          <Tabs idPrefix={prefix} aria-label="Invoice sections" value={tab} onValueChange={setTab} items={[
            { id: "details", label: "Details" },
            { id: "payments", label: "Payments", disabled: draft },
            { id: "history", label: "History" },
          ]} />
          {draft ? <Text textStyle="Body/Small/Regular" tone="base">Payments open once the invoice is sent.</Text> : null}
        </Stack>

        <TabPanel idPrefix={prefix} id="details" hidden={tab !== "details"}>
          <DescriptionList items={[
            { term: "Amount", description: formatMoney(draftInvoice.amount, true) },
            { term: "Issued", description: formatDate(draftInvoice.issued) },
            { term: "Due", description: formatDate(draftInvoice.due) },
            { term: "Bill to", description: "finance@saolaoutdoor.vn" },
          ]} />
        </TabPanel>
        <TabPanel idPrefix={prefix} id="payments" hidden={tab !== "payments"}>
          {status === "Paid" ? (
            <List aria-label="Payments">
              <ListItem title="Bank transfer" caption="Received just now"
                leading={<DockIcon icon="icon-bank-line" theme="neutral" background="subtle" size="medium" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(draftInvoice.amount, true)}</Text>} />
            </List>
          ) : (
            <EmptyState headingLevel={5} size="sm" icon="icon-credit-card-line" title="No payments yet">Payments from {draftInvoice.client} show up here.</EmptyState>
          )}
        </TabPanel>
        <TabPanel idPrefix={prefix} id="history" hidden={tab !== "history"}>
          <List aria-label="Invoice history">
            {events.map((e) => <ListItem key={e.id} title={e.title} caption={formatRelative(e.at)} leading={avatar(people.alex)} />)}
          </List>
        </TabPanel>

        {status !== "Paid" ? (
          <Stack direction="row" justify="end">
            {draft ? <Button level="primary" onClick={send}>Send invoice</Button> : <Button level="primary" onClick={recordPayment}>Record payment</Button>}
          </Stack>
        ) : null}
      </Stack>
    </Card></Stack>
  );
}
