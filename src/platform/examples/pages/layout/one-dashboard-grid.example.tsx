import { useId } from "react";
import { BarList, BulletChart, ChartCard, DockIcon, DonutChart, Heading, Grid, LineChart, List, ListBox, ListItem, MetricCard, useZen } from "@zen-ds/react";

// One dashboard grid: every widget of the overview in one 12-column Grid, sized by importance with span — four KPIs over
// 3 columns each, the revenue trend (the hero) over 8 beside the list to act on over 4 (five rows: as tall as the hero),
// then three breakdowns over 4. Tablet lays out 6 columns, a phone 2; each widget says what it takes there, so no row
// leaves a hole and the reading order stays the same.
const studioKpis = [
  { id: "revenue", label: "Revenue this month", value: "$48,260", icon: "icon-currency-dollar-line", trend: { direction: "positive", label: "+12% vs. Sep" } },
  { id: "invoices", label: "Open invoices", value: "7", icon: "icon-receipt-line", trend: { direction: "negative", label: "2 overdue" } },
  { id: "hours", label: "Hours logged", value: "1,284 h", icon: "icon-clock-line", trend: { direction: "positive", label: "+6% vs. Sep" } },
  { id: "projects", label: "Active projects", value: "12", icon: "icon-folder-line", trend: { direction: "normal", label: "Same as Sep" } },
] as const;
const studioRevenue = [
  { label: "May", value: 31200 }, { label: "Jun", value: 35800 }, { label: "Jul", value: 33900 },
  { label: "Aug", value: 39400 }, { label: "Sep", value: 43100 }, { label: "Oct", value: 48260 },
];
const studioHours = [
  { id: "design", label: "Design", value: 512 }, { id: "research", label: "Research", value: 268 },
  { id: "engineering", label: "Engineering", value: 344 }, { id: "brand", label: "Brand", value: 160 },
];
const studioClients = [
  { label: "Lumen Bank", value: 14200 }, { label: "Saola Coffee", value: 9800 }, { label: "Phin Loyalty", value: 8600 },
  { label: "Mekong Freight", value: 7400 }, { label: "Other", value: 8260 },
];
const studioGoals = [
  { label: "Revenue", value: 128400, target: 150000 },
  { label: "Billable hours", value: 3640, target: 4000 },
  { label: "New clients", value: 4, target: 6 },
  { label: "Utilisation", value: 78, target: 85, max: 100 },
];
const goalValue = (value: number, row: { label: string }) =>
  row.label === "Revenue" ? `$${Math.round(value / 1000)}K` : row.label === "Billable hours" ? `${value.toLocaleString("en-US")} h` : row.label === "Utilisation" ? `${value}%` : String(value);
const studioAttention = [
  { id: "inv-139", title: "INV-2026-0139 is overdue", caption: "Mekong Freight · $12,880 · 9 days", icon: "icon-receipt-line", theme: "red" },
  { id: "inv-141", title: "INV-2026-0141 is overdue", caption: "Saola Coffee · $3,420 · 2 days", icon: "icon-receipt-line", theme: "red" },
  { id: "lum-091", title: "WCAG audit due today", caption: "LUM-091 · Lumen Banking", icon: "icon-check-square-line", theme: "orange" },
  { id: "lum-088", title: "Usability sessions in 3 days", caption: "LUM-088 · 5 participants booked", icon: "icon-users-line", theme: "blue" },
  { id: "brand", title: "Brand refresh review on Friday", caption: "Saola · moodboards round 2", icon: "icon-calendar-line", theme: "violet" },
] as const;

export default function DashboardGrid() {
  const attentionId = useId();
  const phone = useZen()?.breakpoint === "mobile";
  return (
    // 12 columns on desktop, 6 on tablet, 2 on a phone: one grid, rows md apart like the columns.
    <Grid columns={{ desktop: 12, tablet: 6, mobile: 2 }} gap="md">
      {studioKpis.map((kpi) => phone
        // A phone's figures are stat tiles, two up; Small, so an amount like "$48,260" stays on one line.
        ? <MetricCard key={kpi.id} type="tile" size="sm" theme="default" span={1} label={kpi.label} value={kpi.value} icon={kpi.icon} trend={kpi.trend} />
        : <MetricCard key={kpi.id} theme="default" span={3} label={kpi.label} value={kpi.value} icon={kpi.icon} trend={kpi.trend} />)}
      {/* The hero: the trend the overview is for, two thirds of the row; the whole row from tablet down. */}
      <ChartCard theme="default" span={{ desktop: 8, tablet: "full" }} headingLevel={4} title="Revenue" description="Invoiced per month, May to October" value="$48,260">
        <LineChart aria-label="Revenue invoiced per month, May to October 2026" label="Revenue" data={studioRevenue} format="currency" height={phone ? 200 : 280} />
      </ChartCard>
      {/* What to act on beside it: five rows, as tall as the hero; on tablet it pairs with the first breakdown. Its title
          takes the chart cards' style (Body/Extra/Medium): sibling widget titles look alike. */}
      <ListBox as="section" theme="default" span={{ desktop: 4, tablet: 3, mobile: "full" }} aria-labelledby={attentionId}
        header={<Heading level={4} id={attentionId} textStyle="Body/Extra/Medium">Needs attention</Heading>}>
        <List aria-labelledby={attentionId}>
          {studioAttention.map((item) => <ListItem key={item.id} title={item.title} caption={item.caption} leading={<DockIcon icon={item.icon} theme={item.theme} size="md" background="subtle" />} />)}
        </List>
      </ListBox>
      <ChartCard theme="default" span={{ desktop: 4, tablet: 3, mobile: "full" }} headingLevel={4} title="Hours by team" description="October, all projects">
        <DonutChart aria-label="Hours logged by team in October 2026" data={studioHours} format={(value) => `${value.toLocaleString("en-US")} h`} />
      </ChartCard>
      <ChartCard theme="default" span={{ desktop: 4, tablet: 3, mobile: "full" }} headingLevel={4} title="Top clients" description="Invoiced in October">
        <BarList aria-label="Revenue by client in October 2026" data={studioClients} format="currency" />
      </ChartCard>
      <ChartCard theme="default" span={{ desktop: 4, tablet: 3, mobile: "full" }} headingLevel={4} title="Quarter goals" description="Q4 so far">
        <BulletChart aria-label="Q4 goals so far: revenue, billable hours, new clients and utilisation" data={studioGoals} format={goalValue} />
      </ChartCard>
    </Grid>
  );
}
