import { useId, useState } from "react";
import { Card, DescriptionList, Heading, IconButton, Stack, Text, VisuallyHidden } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney } from "../../data";

type PaymentRow = { id: string; term: string; value: string; copy?: boolean };
const paymentRows: PaymentRow[] = [
  { id: "bank", term: "Bank", value: "Lumen Bank, Ho Chi Minh City", copy: true },
  { id: "name", term: "Account name", value: "Đìzai Studio JSC", copy: true },
  { id: "number", term: "Account number", value: "0071 0045 8823", copy: true },
  { id: "swift", term: "SWIFT code", value: "LUMBVNVX", copy: true },
  { id: "reference", term: "Reference", value: "INV-2026-0142", copy: true },
];
/** "Account number" → "account number", for names that follow a verb ("Copy account number"). */
const lower = (term: string) => term.charAt(0).toLowerCase() + term.slice(1);

/** Bank transfer details: every value people paste into their bank app has a Copy action named after its row. */
export default function PaymentDetails() {
  // The row copied last and when; null once its two seconds are over.
  const [copied, setCopied] = useState<{ id: string; at: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const titleId = useId();
  const copy = (row: PaymentRow) => {
    void navigator.clipboard?.writeText(row.value.replace(/\s/g, "")).catch(() => null);
    const at = Date.now();
    setCopied({ id: row.id, at });
    setAnnouncement(`${row.term} copied`);
    // Only the last copy's timer turns the check back, so copying again restarts the two seconds.
    setTimeout(() => setCopied((current) => (current?.at === at ? null : current)), 2000);
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Pay by bank transfer</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`INV-2026-0142 · ${formatMoney(21000, true)} due ${formatDate(daysFromToday(25))}`}</Text>
        </Stack>
        <DescriptionList divider items={paymentRows.map((row) => ({
          id: row.id, term: row.term, description: row.value,
          action: row.copy ? (
            <IconButton appearance="flat" level="primary" size="sm" icon={copied?.id === row.id ? "icon-check-line" : "icon-copy-line"}
              aria-label={`Copy ${lower(row.term)}`} onClick={() => copy(row)} />
          ) : undefined,
        }))} />
        {/* Rendered empty from the start, so the first copy is announced too. */}
        <VisuallyHidden role="status">{announcement}</VisuallyHidden>
      </Stack>
    </Card>
  );
}
