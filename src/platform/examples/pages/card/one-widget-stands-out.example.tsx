import { useId, useState } from "react";
import { Badge, Button, Card, DescriptionList, Dialog, Grid, Heading, LineChart, ProgressBar, Stack, Text, plural, useToast } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, studioMonths } from "../../data";

/** Apr–Jun and Jul–Sep 2026 of the studio's months (Q2 $262,500 · Q3 $296,800 invoiced). */
const q2 = studioMonths.slice(6, 9);
const q3 = studioMonths.slice(9, 12);
const total = (months: typeof q3, key: "invoiced" | "collected") => months.reduce((sum, month) => sum + month[key], 0);
const percentChange = (now: number, before: number) => `${now >= before ? "+" : "−"}${Math.round(Math.abs(now / before - 1) * 100)}%`;
const q3Invoiced = total(q3, "invoiced");
const q3Collected = total(q3, "collected");
/** Q3's widget figures. */
const amounts = { invoiced: q3Invoiced, collected: q3Collected, outstanding: q3Invoiced - q3Collected };
const unpaidInvoices = 3;

/** Colour: one Solid widget per row stands out. */
export default function QuarterWidgets() {
  const { toast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const [reminded, setReminded] = useState(false);
  const invoicedId = useId();
  const collectedId = useId();
  const outstandingId = useId();
  const remind = () => {
    setReminded(true);
    toast({ title: `${plural(unpaidInvoices, "reminder")} sent`, action: { label: "Undo", onClick: () => setReminded(false) } });
  };
  return (
    <>
      {/* The row's widgets share a theme (Flat on Canvas/Default); the one that matters most stands out as Solid Neutral.
          Three share the row: each column at least 30% wide, one per row once 220px no longer fits. */}
      <Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
        <Card as="section" theme="solid" color="neutral" aria-labelledby={invoicedId}>
          <Stack gap="md">
            <Stack gap="xs" align="start">
              <Heading level={4} id={invoicedId} textStyle="Heading/Subheading">Invoiced in Q3</Heading>
              <Text as="span" textStyle="Heading/2">{formatMoney(amounts.invoiced)}</Text>
              <Badge theme="inverse" background="solid" size="sm" leading="icon-arrow-circle-up-solid">{`${percentChange(q3Invoiced, total(q2, "invoiced"))} vs. Q2`}</Badge>
            </Stack>
            <LineChart aria-label="Invoiced per month, July to September 2026" data={q3.map((month) => ({ label: month.label, value: month.invoiced }))}
              format={formatCompactMoney} height={120} />
            <Stack align="start">
              <Button appearance="overlay" level="inverse" size="sm" onClick={() => setReportOpen(true)}>View report</Button>
            </Stack>
          </Stack>
        </Card>
        <Card as="section" theme="default" aria-labelledby={collectedId}>
          <Stack gap="md">
            <Stack gap="xs" align="start">
              <Heading level={4} id={collectedId} textStyle="Heading/Subheading">Collected in Q3</Heading>
              <Text as="span" textStyle="Heading/2">{formatMoney(amounts.collected)}</Text>
              <Badge theme="green" background="subtle" size="sm">{`${percentChange(q3Collected, total(q2, "collected"))} vs. Q2`}</Badge>
            </Stack>
            <ProgressBar value={Math.round((q3Collected / q3Invoiced) * 100)} label layout="stacked" valueLabel={`${Math.round((q3Collected / q3Invoiced) * 100)}% of invoiced`} aria-label="Collected of invoiced" />
          </Stack>
        </Card>
        <Card as="section" theme="default" aria-labelledby={outstandingId}>
          <Stack gap="md">
            <Stack gap="xs" align="start">
              <Heading level={4} id={outstandingId} textStyle="Heading/Subheading">Outstanding</Heading>
              <Text as="span" textStyle="Heading/2">{formatMoney(amounts.outstanding)}</Text>
              <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{reminded ? "Reminders sent today" : `${plural(unpaidInvoices, "invoice")} past due`}</Text>
            </Stack>
            <Stack align="start">
              <Button level="tertiary" size="sm" startIcon="icon-mail-01-line" disabled={reminded} onClick={remind}>Send reminders</Button>
            </Stack>
          </Stack>
        </Card>
      </Grid>
      <Dialog open={reportOpen} onOpenChange={setReportOpen} title="Invoiced in Q3" description="July to September 2026">
        <DescriptionList items={[...q3.map((month) => ({ id: month.id, term: month.month, description: formatMoney(month.invoiced) })), { id: "total", term: "Total", description: formatMoney(q3Invoiced), emphasis: true }]} />
      </Dialog>
    </>
  );
}
