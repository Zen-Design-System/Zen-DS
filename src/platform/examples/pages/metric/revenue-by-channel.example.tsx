import { Grid, MetricCard, Stack } from "@zen-ds/react";

// Revenue by channel: Metric-Color ties each metric to its chart series, the Counter says how many invoices it covers;
// the payout tile is Title-Highlight with a Label-Icon and a Hint (Figma Metric-Inline, 2026-10-07).
const channels = [
  { id: "projects", label: "Projects", value: "$18,240", invoices: 6, color: "var(--zen-color-background-support-blue-solid)" },
  { id: "retainers", label: "Retainers", value: "$9,600", invoices: 3, color: "var(--zen-color-background-support-green-solid)" },
  { id: "workshops", label: "Workshops", value: "$2,150", invoices: 2, color: "var(--zen-color-background-support-orange-solid)" },
];

export default function RevenueByChannel() {
  return (
    <Stack gap="lg">
      <Grid columns="repeat(auto-fit, minmax(min(100%, 200px), 1fr))" gap="md">
        {channels.map((channel) => (
          <MetricCard variant="icon-highlight" key={channel.id} theme="default" size="sm" icon={false} label={channel.label} value={channel.value}
            metricColor={channel.color} counter={channel.invoices} />
        ))}
      </Grid>
      <MetricCard theme="default" variant="title-highlight" size="md" label="Next payout" labelIcon="icon-wallet-02-line"
        hint="Paid invoices from the last 14 days, less the 2.9% card fee. Pays out every second Friday." value="$4,812.40"
        icon="icon-bank-line" iconTheme="green" trend={{ direction: "normal", label: "Friday, Oct 16" }} />
    </Stack>
  );
}
