import { useId } from "react";
import { Button, Card, Heading, Stack, Text, useToast } from "@zen-ds/react";
import { formatDate, formatMoney, invoices } from "../../data";

// Stack, Grid and Box take { desktop, tablet, mobile } for their structure props, resolved at the nearest ZenProvider's
// breakpoint (the window's). A breakpoint without its own value takes the next wider one's, so { desktop, mobile }
// covers tablet too.
const overdueInvoice = invoices.find((invoice) => invoice.status === "Overdue") ?? invoices[0];

// headingLevel: the card title's level, one below the heading above it: 4 under a section's heading, 2 right under the
// screen's title (h1), as on the phone.
export default function InvoiceSummary({ headingLevel = 4 }: { headingLevel?: 2 | 4 }) {
  const { toast } = useToast();
  const titleId = useId();
  const invoice = overdueInvoice;
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      {/* One row on desktop and tablet; on a phone the parts go under each other and the button takes the width. */}
      <Stack direction={{ desktop: "row", mobile: "column" }} align={{ desktop: "center", mobile: "stretch" }} gap="md">
        <Stack gap="2xs" width="fill">
          <Heading level={headingLevel} id={titleId} textStyle="Heading/Subheading">{invoice.number}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${invoice.client} · Overdue since ${formatDate(invoice.due)}`}</Text>
        </Stack>
        <Text textStyle="Body/Extra/Bold">{formatMoney(invoice.amount)}</Text>
        <Button level="primary" onClick={() => toast({ title: "Reminder sent", children: `${invoice.client} · ${invoice.number}` })}>Send reminder</Button>
      </Stack>
    </Card>
  );
}
