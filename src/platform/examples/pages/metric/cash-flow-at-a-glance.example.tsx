import { Grid, MetricCard } from "@zen-ds/react";
import { formatMoney, invoices, studioMonths, type InvoiceStatus } from "../../data";

const usd = (value: number) => formatMoney(value);
const monthOf = (id: string) => studioMonths.find((m) => m.id === id)!;
/** "9%": the change from one total to the next, in whole percent; the trend's arrow carries its sign (Figma Metric-Trend). */
const changeOf = (now: number, before: number) => `${Math.abs(Math.round((now / before - 1) * 100))}%`;
const statusOrder: InvoiceStatus[] = ["Paid", "Sent", "Overdue", "Draft"];
const byStatus = statusOrder.map((status) => ({ id: status.toLowerCase(), label: status, value: invoices.filter((row) => row.status === status).reduce((total, row) => total + row.amount, 0) }));
const statusTotal = byStatus.reduce((total, item) => total + item.value, 0);
const overdueCount = invoices.filter((row) => row.status === "Overdue").length;

/** A comparison of three numbers and the split of one total, side by side (stacked on a narrow screen). */
export default function CashFlowRow() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 420px), 1fr))" gap="md">
      <MetricCard theme="default" type="comparison" label="Cash flow · September" comparison={[
        { id: "invoiced", label: "Invoiced", value: usd(monthOf("sep").invoiced), trend: { direction: "positive", label: changeOf(monthOf("sep").invoiced, monthOf("aug").invoiced), subLabel: "vs. August" } },
        { id: "collected", label: "Collected", value: usd(monthOf("sep").collected), trend: { direction: "negative", label: changeOf(monthOf("sep").collected, monthOf("aug").collected), subLabel: "vs. August" } },
        { id: "overdue", label: "Overdue", value: usd(byStatus.find((item) => item.id === "overdue")!.value), trend: { direction: "normal", label: String(overdueCount), subLabel: overdueCount === 1 ? "invoice" : "invoices" } },
      ]} />
      <MetricCard theme="default" type="category-bar" label="Open and paid invoices" value={usd(statusTotal)} categories={byStatus} format={usd} />
    </Grid>
  );
}
