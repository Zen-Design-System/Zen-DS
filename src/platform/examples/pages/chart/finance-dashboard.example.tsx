import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Badge, Button, ChartCard, DockIcon, Grid, Heading, LineChart, List, ListBox, ListItem, Menu,
  MetricCard, PageHeader, SidePanel, Sidebar, SidebarMenuItem, Stack, Table, TableText, Text, Thumbnail, plural, useToast,
  type ChartPoint, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { formatCompactMoney, formatDue, formatMoney, invoiceStatusTheme, invoices, me, studio, studioMonths } from "../../data";

const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "finance", label: "Finance", icon: "icon-coins-line" },
  { id: "analytics", label: "Analytics", icon: "icon-bar-chart-01-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];

/** "+9%" · "−8%": the change from one month to the next, in whole percent. */
// A trend badge's change: the arrow carries its sign (Figma Metric-Trend, 2026-10-26).
const changeOf = (now: number, before: number) => `${Math.abs(Math.round((now / before - 1) * 100))}%`;
// The tiles read the same shared months and invoices as the chart and the Metric page.
const [august, september] = studioMonths.slice(-2);
const overdue = invoices.filter((invoice) => invoice.status === "Overdue").sort((a, b) => a.due.getTime() - b.due.getTime());

const revenueRanges = [
  { id: "6m", label: "6 months", months: 6, span: "Apr – Sep 2026" },
  { id: "12m", label: "12 months", months: 12, span: "Oct 2025 – Sep 2026" },
];

type ReportRow = { id: string; month: string; invoiced: number; collected: number; total?: boolean };
const reportColumns: TableColumn<ReportRow>[] = [
  { id: "month", header: "Month", cell: (row) => <TableText bold={row.total}>{row.month}</TableText> },
  { id: "invoiced", header: "Invoiced", align: "right", cell: (row) => <TableText bold={row.total}>{formatMoney(row.invoiced)}</TableText> },
  { id: "collected", header: "Collected", align: "right", cell: (row) => <TableText bold={row.total}>{formatMoney(row.collected)}</TableText> },
];

const unpaid = invoices.filter((invoice) => invoice.status === "Sent" || invoice.status === "Overdue").sort((a, b) => a.due.getTime() - b.due.getTime());

/**
 * The studio's Finance page: AppShell pattern sidebar, the PageHeader in the header's Main row and the Body padding the
 * page. The Sidebar is Shadow=No (Surface, no shadow), so the dashboard's cards stay flat on the Canvas: one elevation for
 * the screen, none.
 */
export default function FinanceDashboard() {
  const { toast } = useToast();
  const openId = useId();
  const [unread, setUnread] = useState(2);
  const [rangeId, setRangeId] = useState("6m");
  const [reportOpen, setReportOpen] = useState(false);
  // A place this example does not draw: the toast says so, and the navigation keeps the current page.
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the charts." });
  const range = revenueRanges.find((r) => r.id === rangeId) ?? revenueRanges[0];
  // The studio's shared months (Oct 2025 – Sep 2026), the same series the Metric page adds up.
  const months = studioMonths.slice(-range.months);
  const points: ChartPoint[] = months.map((m) => ({ label: m.label, value: m.invoiced }));
  const sum = (key: "invoiced" | "collected") => months.reduce((total, m) => total + m[key], 0);
  const reportRows: ReportRow[] = [...months].reverse().map((m) => ({ id: m.id, month: m.month, invoiced: m.invoiced, collected: m.collected }));
  reportRows.push({ id: "total", month: "Total", invoiced: sum("invoiced"), collected: sum("collected"), total: true });
  return (
    <AppShell
      sidebar={(
        <Sidebar shadow={false}
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioPlaces} selectedId="finance" onItemClick={(item) => { if (item.id !== "finance") notHere(item.label); }}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
              setUnread(0);
              toast({ title: unread ? plural(unread, "new notification") : "You're all caught up", children: `Mai Ho marked ${invoices[1].number} as paid · Lumen Bank sent ${formatMoney(invoices[1].amount)}` });
            }} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
            ]} />
          </>}
          main={(
            <PageHeader title="Finance" description={`What ${studio.name} invoiced and collected from its clients.`}
              actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Revenue exported", children: `revenue-${range.id}.csv · ${range.span}` })}>Export</Button>} />
          )}
        />
      )}
      // The chevron opens the exact amounts behind the chart: docked beside the page when the window has room for both,
      // else as the modal panel.
      sidePanel={(
        <SidePanel type="standard" open={reportOpen} onOpenChange={setReportOpen} title="Revenue report" description={`Invoiced and collected per month, ${range.span}.`}>
          <Table aria-label={`Revenue per month, ${range.span}`} columns={reportColumns} rows={reportRows} />
        </SidePanel>
      )}
    >
      <Stack gap="md">
        {/* Three tiles share the row: each column at least 30% wide, one per row once 220px no longer fits. */}
        <Grid minColumnWidth="clamp(220px, 30%, 100%)" gap="md">
          <MetricCard iconBackground="solid" theme="default" label="Invoiced in September" value={formatMoney(september.invoiced)} icon="icon-currency-dollar-circle-line" iconTheme="green"
            trend={{ direction: september.invoiced >= august.invoiced ? "positive" : "negative", label: changeOf(september.invoiced, august.invoiced), subLabel: "vs. August" }} />
          <MetricCard iconBackground="solid" theme="default" label="Collected in September" value={formatMoney(september.collected)} icon="icon-bank-note-01-line" iconTheme="blue"
            trend={{ direction: september.collected >= august.collected ? "positive" : "negative", label: changeOf(september.collected, august.collected), subLabel: "vs. August" }} />
          <MetricCard iconBackground="solid" theme="default" label="Overdue" value={formatMoney(overdue.reduce((total, invoice) => total + invoice.amount, 0))} icon="icon-alert-triangle-line" iconTheme="red"
            trend={{ direction: "normal", label: String(overdue.length), subLabel: overdue.length ? `${overdue.length === 1 ? "invoice" : "invoices"} · ${formatDue(overdue[0].due)}` : "overdue" }} />
        </Grid>
        {/* Flat on the canvas, like the tiles. Right under the page h1: an h2. A wide card hugs its range switch. */}
        <ChartCard title="Revenue" headingLevel={2} onOpen={() => setReportOpen(true)} openLabel="Open revenue report"
          ranges={revenueRanges.map((r) => ({ id: r.id, label: r.label }))} range={rangeId} onRangeChange={setRangeId} rangesFullWidth={false}>
          {/* A new range starts on its latest month. */}
          <LineChart key={rangeId} aria-label={`Revenue invoiced per month, ${range.span}`} data={points} format={formatCompactMoney} height={260} />
        </ChartCard>
        {/* What is still open: the invoices the tiles add up, so the dashboard ends on the next thing to do. */}
        <ListBox as="section" aria-labelledby={openId} header={<Heading level={2} id={openId} textStyle="Heading/Subheading">Waiting for payment</Heading>}>
          <List aria-labelledby={openId}>
            {unpaid.map((invoice) => (
              <ListItem key={invoice.id} title={`${invoice.number} · ${invoice.client}`} caption={`${formatMoney(invoice.amount)} · ${formatDue(invoice.due)}`}
                leading={<DockIcon size="md" icon="icon-receipt-line" theme={invoice.status === "Overdue" ? "red" : "blue"} background="subtle" />}
                trailing={<Badge theme={invoiceStatusTheme[invoice.status]} background="subtle">{invoice.status}</Badge>}
                onClick={() => toast({ title: `Reminder sent to ${invoice.client}`, children: `${invoice.number} · ${formatMoney(invoice.amount)}` })} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </AppShell>
  );
}
