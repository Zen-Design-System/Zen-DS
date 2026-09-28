/**
 * Template: dashboard. Copy it into your app and replace the sample data.
 * Render it inside your app's <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 */
import { useState } from "react";
import {
  AppShell,
  Button,
  ChartCard,
  Container,
  Grid,
  Heading,
  Icon,
  IconButton,
  LineChart,
  List,
  ListItem,
  MetricCard,
  PageHeader,
  Search,
  Sidebar,
  Stack,
  Table,
  TableText,
  TableTrend,
  Text,
  type SidebarSection,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
const metrics = [
  { id: "revenue", label: "Revenue", value: "$48.2K", trend: { direction: "positive" as const, label: "+12% vs last month" }, icon: "icon-currency-dollar-circle-line" as const },
  { id: "customers", label: "Active customers", value: "1,284", trend: { direction: "positive" as const, label: "+86 this month" }, icon: "icon-users-line" as const },
  { id: "churn", label: "Churn", value: "2.1%", trend: { direction: "negative" as const, label: "+0.4 pts" }, icon: "icon-trend-down-01-line" as const },
  { id: "nps", label: "NPS", value: "54", trend: { direction: "normal" as const, label: "No change" }, icon: "icon-face-smile-line" as const },
];
const ranges = { Monthly: [["Jan", 32], ["Feb", 35], ["Mar", 34], ["Apr", 39], ["May", 42], ["Jun", 48]], Weekly: [["W1", 10], ["W2", 12], ["W3", 11], ["W4", 14]] } as const;
const activity = [
  { id: "1", title: "Ava Chen upgraded Zen Studio to Team", caption: "12 min ago" },
  { id: "2", title: "Invoice #1042 paid", caption: "1 h ago" },
  { id: "3", title: "Bao Nguyen invited 3 members", caption: "Yesterday" },
];
const projects = [
  { id: "web", name: "Marketing site", owner: "Ava Chen", visits: "12.4K", delta: "+8%", up: true },
  { id: "app", name: "Mobile app", owner: "Bao Nguyen", visits: "9.1K", delta: "+3%", up: true },
  { id: "docs", name: "Docs platform", owner: "Chi Tran", visits: "4.7K", delta: "−2%", up: false },
];
const sections = (active: string): SidebarSection[] => [
  { items: [
    { id: "dashboard", label: "Dashboard", icon: <Icon name="icon-home-03-line" />, active: active === "dashboard" },
    { id: "projects", label: "Projects", icon: <Icon name="icon-folder-line" />, active: active === "projects" },
    { id: "customers", label: "Customers", icon: <Icon name="icon-users-line" />, active: active === "customers" },
  ] },
];

export function DashboardTemplate() {
  const [page, setPage] = useState("dashboard");
  const [range, setRange] = useState<keyof typeof ranges>("Monthly");
  return (
    <AppShell
      sidebar={<Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} sections={sections(page)} onItemClick={(item) => setPage(item.id)} />}
      header={<Search aria-label="Search" placeholder="Search projects and customers" />}
      headerActions={<IconButton aria-label="Notifications" icon={<Icon name="icon-bell-01-line" />} onClick={() => setPage("dashboard")} />}
    >
      <Container>
        <Stack gap="xl" paddingY="lg">
          <PageHeader eyebrow="Good morning, Ava" title="Dashboard" description="How Acme is doing this month." actions={<><Button level="tertiary" startIcon={<Icon name="icon-download-01-line" decorative />}>Export</Button><Button level="primary">New project</Button></>} />

          <Grid minColumnWidth={160} gap="md">
            {metrics.map((metric) => <MetricCard key={metric.id} label={metric.label} value={metric.value} trend={metric.trend} icon={metric.icon} theme="border" />)}
          </Grid>

          <Grid columns={{ mobile: 1, tablet: 1, desktop: 2 }} gap="md">
            <ChartCard title="Revenue" headingLevel={2} ranges={Object.keys(ranges).map((id) => ({ id, label: id }))} range={range} onRangeChange={(id) => setRange(id as keyof typeof ranges)} onOpen={() => setPage("projects")}>
              <LineChart aria-label={`Revenue, ${range.toLowerCase()}`} data={ranges[range].map(([label, value]) => ({ label, value: value * 1000 }))} format={(value) => `$${Math.round(value / 100) / 10}K`} height={240} />
            </ChartCard>
            <Stack gap="sm">
              <Heading level={2} textStyle="Heading/4">Recent activity</Heading>
              <List aria-label="Recent activity">
                {activity.map((item) => <ListItem key={item.id} title={item.title} caption={item.caption} />)}
              </List>
            </Stack>
          </Grid>

          <Stack gap="sm">
            <Heading level={2} textStyle="Heading/4">Top projects</Heading>
            <Table aria-label="Top projects" rows={projects} getRowId={(row) => row.id}
              columns={[
                { id: "name", header: "Project", cell: (row) => <TableText>{row.name}</TableText> },
                { id: "owner", header: "Owner", cell: (row) => <TableText>{row.owner}</TableText> },
                { id: "visits", header: "Visits", align: "right", cell: (row) => <TableText>{row.visits}</TableText> },
                { id: "trend", header: "Trend", align: "right", cell: (row) => <TableTrend trend={row.up ? "up" : "down"}>{row.delta}</TableTrend> },
              ]} />
          </Stack>
          <Text textStyle="Caption/Regular" tone="light">Data refreshes every 15 minutes.</Text>
        </Stack>
      </Container>
    </AppShell>
  );
}
