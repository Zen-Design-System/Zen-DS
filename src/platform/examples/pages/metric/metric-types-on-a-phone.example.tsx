import type { RefObject } from "react";
import { AppShell, MetricCard, Stack, TopNavigation, useToast } from "@zen-ds/react";
import { formatCompactMoney, formatMoney, invoices, studioMonths, type InvoiceStatus } from "../../data";

const usd = (value: number) => formatMoney(value);
const monthOf = (id: string) => studioMonths.find((m) => m.id === id)!;
/** "9%": the change from one total to the next, in whole percent; the trend's arrow carries its sign (Figma Metric-Trend). */
const changeOf = (now: number, before: number) => `${Math.abs(Math.round((now / before - 1) * 100))}%`;
/** The last twelve months the studio invoiced, oldest first (the sparkline's series). */
const invoicedSeries = studioMonths.map((m) => m.invoiced);
const statusOrder: InvoiceStatus[] = ["Paid", "Sent", "Overdue", "Draft"];
const byStatus = statusOrder.map((status) => ({ id: status.toLowerCase(), label: status, value: invoices.filter((row) => row.status === status).reduce((total, row) => total + row.amount, 0) }));
const statusTotal = byStatus.reduce((total, item) => total + item.value, 0);

/* The month on the studio's phone app: a screen pushed from Numbers, its typed cards stacked. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function PhoneMetricTypes({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  // Back on a pushed screen whose parent this example does not draw: the toast names where it goes.
  const back = { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => toast({ title: "Back to Numbers", children: "This example shows the one screen." }) };
  return (
    <AppShell topNavigation={<TopNavigation type="compact-alt" title="September" scrollRef={scrollRef} leading={back} />}>
      {/* The Body pads the screen; the cards sit md apart, flat on the grey Canvas (no bottom bar, no shadow). */}
      <Stack gap="md">
        <MetricCard theme="default" spacing="small" type="sparkline" label="Revenue" value={usd(monthOf("sep").invoiced)} series={invoicedSeries} format={formatCompactMoney}
          trend={{ direction: "positive", label: changeOf(monthOf("sep").invoiced, monthOf("aug").invoiced), subLabel: "vs. August" }} />
        <MetricCard theme="default" spacing="small" type="comparison" label="Cash flow" headingLevel={2} comparison={[
          { id: "invoiced", label: "Invoiced", value: usd(monthOf("sep").invoiced), trend: { direction: "positive", label: "9%", subLabel: "vs. August" } },
          { id: "collected", label: "Collected", value: usd(monthOf("sep").collected), trend: { direction: "negative", label: "8%", subLabel: "vs. August" } },
        ]} />
        <MetricCard theme="default" spacing="small" type="category-bar" label="Invoices by status" value={usd(statusTotal)} categories={byStatus} format={usd} />
      </Stack>
    </AppShell>
  );
}
