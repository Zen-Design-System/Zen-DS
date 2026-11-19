import { useState } from "react";
import { Badge, Box, Card, Heading, IconButton, InputField, Stack, Text, Tooltip, VisuallyHidden } from "@zen-ds/react";
import { formatDate, formatMoney, invoiceStatusTheme, invoices } from "../../data";

const invoice = invoices[0];
const link = `pay.dizai.studio/${invoice.number.slice(-4)}`;

/** An invoice's payment link: after Copy link, the tooltip stays open in Accent for 1.5 s and says it worked. */
export default function PaymentLink() {
  // When the last copy happened; null once its 1.5 s are over.
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const copied = copiedAt !== null;
  const copy = () => {
    void navigator.clipboard?.writeText(`https://${link}`).catch(() => undefined);
    const at = Date.now();
    setCopiedAt(at);
    // Only the last copy's timer hides it, so copying again restarts the 1.5 s.
    setTimeout(() => setCopiedAt((current) => (current === at ? null : current)), 1500);
  };
  return (
    <Card theme="default" width="fill">
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" align="center" gap="2xs">
            <Heading level={4} textStyle="Heading/Subheading">{invoice.number}</Heading>
            <Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge>
          </Stack>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${invoice.client} · ${formatMoney(invoice.amount, true)} · Due ${formatDate(invoice.due)}`}</Text>
        </Stack>
        <Stack direction="row" align="end" gap="xs">
          <Box width="fill"><InputField label="Payment link" value={link} readOnly /></Box>
          {/* Held open while copied; otherwise (undefined) it opens on hover and focus as usual. */}
          <Tooltip content={copied ? "Link copied" : "Copy link"} color={copied ? "accent" : "default"} open={copied || undefined}>
            <IconButton level="tertiary" size="md" icon="icon-copy-line" aria-label="Copy link" onClick={copy} />
          </Tooltip>
        </Stack>
        {/* The tooltip is a description, not an announcement: a status line tells screen readers the copy worked. */}
        <VisuallyHidden role="status">{copied ? "Link copied" : ""}</VisuallyHidden>
      </Stack>
    </Card>
  );
}
