import { useId, useState } from "react";
import { Badge, DockIcon, EmptyState, Heading, List, ListBox, ListItem, Stack, Text, useToast } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, invoiceStatusTheme } from "../../data";

const saolaDraft = { number: "INV-2026-0143", amount: 12000, due: daysFromToday(30) };

export default function ClientInvoices() {
  const { toast } = useToast();
  const [created, setCreated] = useState(false);
  const titleId = useId();
  const create = () => {
    setCreated(true);
    toast({ title: "Invoice created", children: saolaDraft.number, action: { label: "Undo", onClick: () => setCreated(false) } });
  };
  return (
    // Header at the top, footnote at the bottom; the ListBox body grows. Empty, it centres the empty state; with an
    // invoice the list starts at the top. The panel's fixed height is in rem, so it follows the type scale.
    <Stack><ListBox as="section" style={{ minHeight: "26rem" }} width="fill" maxWidth={440} alignSelf="center" aria-labelledby={titleId}
      header={<Stack gap="xs">
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">Invoices</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Brand refresh</Text>
      </Stack>}
      footer={<Text textStyle="Caption/Regular" tone="light">Synced with Payments 2 minutes ago</Text>}>
      <Stack justify={created ? "start" : "center"} height="fill">
        {created ? (
          <List aria-labelledby={titleId}>
            <ListItem title={saolaDraft.number} caption={`${formatMoney(saolaDraft.amount)} · Due ${formatDate(saolaDraft.due)}`}
              leading={<DockIcon icon="icon-receipt-line" theme="neutral" background="subtle" />}
              trailing={<Badge theme={invoiceStatusTheme.Draft} background="subtle">Draft</Badge>} />
          </List>
        ) : (
          <EmptyState size="sm" headingLevel={5} compactTitle title="No invoices yet" primaryAction={{ label: "Create invoice", onClick: create }} icon="icon-receipt-line">
            Bill Saola Outdoor for approved hours. Paid invoices stay here.
          </EmptyState>
        )}
      </Stack>
    </ListBox></Stack>
  );
}
