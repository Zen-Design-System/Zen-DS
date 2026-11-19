import { useState } from "react";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, BarChart, Button, ChartCard, DonutChart, Grid, HeatmapChart, LineChart, Menu, PageHeader, RadialChart, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useToast, type ChartPoint, type ChartSlice, type SidebarSection } from "@zen-ds/react";
import { clientShares, clientSharesYtd, formatCompactMoney, formatMoney, invoices, me, projectById, studio, studioMonths, teamCapacity } from "../../data";

/** "1,540 h" — hours read in full, also on the axis. */
// A no-break space keeps the unit with its number when a figure wraps.
const hours = (value: number) => `${value.toLocaleString("en-US")} h`;

const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "finance", label: "Finance", icon: "icon-coins-line" },
  { id: "analytics", label: "Analytics", icon: "icon-bar-chart-01-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];

/** Invoiced per month in 2026: Jan – Sep from the shared months, Oct – Dec the finance team's forecast (hatched). */
const forecast = [["Oct", 108000], ["Nov", 112500], ["Dec", 104000]] as const;
const revenue2026: ChartPoint[] = [
  ...studioMonths.slice(-9).map((m) => ({ label: m.label, value: m.invoiced })),
  ...forecast.map(([label, value]) => ({ label, value, projected: true })),
];
const invoicedSoFar = studioMonths.slice(-9).reduce((total, m) => total + m.invoiced, 0);

/** Invoiced per month, Apr – Sep 2026, against what was collected (the dashed comparison). */
const cashMonths: ChartPoint[] = studioMonths.slice(-6).map((m) => ({ label: m.label, value: m.invoiced }));
const collected = { label: "Collected", values: studioMonths.slice(-6).map((m) => m.collected) };

const quarters = [{ id: "q3", label: "Q3" }, { id: "ytd", label: "Year to date" }];

/** Hours logged per hour of the day in September, by weekday (the studio's timesheets). */
const loggedHours = ["9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const loggedByHour = [
  [38, 41, 40, 39, 35, 4, 0], [62, 66, 64, 63, 55, 6, 2], [71, 74, 72, 70, 61, 7, 2], [34, 36, 35, 33, 30, 5, 1], [52, 55, 53, 51, 44, 6, 1],
  [68, 72, 70, 69, 52, 5, 2], [70, 75, 73, 71, 48, 4, 1], [61, 64, 63, 60, 39, 3, 0], [42, 44, 43, 41, 22, 2, 0], [12, 14, 13, 12, 5, 0, 0],
];

/** Budget used on the client projects under way (spent ÷ budget). */
const budgetRings: ChartSlice[] = ["lumen-banking", "phin-loyalty", "mekong-tracking"].map((id) => {
  const project = projectById(id);
  return { id, label: project.name, value: Math.round((project.spent / project.budget) * 100) };
});

/**
 * The studio's Analytics page: the whole chart family on one canvas. AppShell pattern sidebar, the PageHeader in the
 * header's Main row and the Body padding the page; the Sidebar is Shadow=No (Surface, no shadow), so every card stays flat
 * on the Canvas.
 */
export default function StudioAnalytics() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(2);
  const [quarter, setQuarter] = useState("q3");
  // A place this example does not draw: the toast says so, and the navigation keeps the current page.
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the charts." });
  return (
    <AppShell
      sidebar={(
        <Sidebar shadow={false}
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioPlaces} selectedId="analytics" onItemClick={(item) => { if (item.id !== "analytics") notHere(item.label); }}
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
            <PageHeader title="Analytics" description={`How ${studio.name} earns, bills and spends its time.`}
              actions={<Button level="tertiary" startIcon="icon-share-01-line" onClick={() => toast({ title: "Link copied", children: "Analytics · Jan – Sep 2026, view only" })}>Share</Button>} />
          )}
        />
      )}
    >
      {/* Three cards a row on a desktop, one per row once 300px no longer fits; every card is flat on the canvas. Right
          under the page h1, each card title is an h2. */}
      <Grid minColumnWidth="clamp(300px, 30%, 100%)" gap="md">
        <ChartCard title="Revenue" headingLevel={2} metricLabel="Invoiced so far in 2026" value={formatMoney(invoicedSoFar)}>
          <BarChart aria-label="Revenue invoiced per month, Jan – Dec 2026, Oct – Dec forecast" data={revenue2026} format={formatCompactMoney} height={240} showAverage />
        </ChartCard>
        <ChartCard title="Invoiced and collected" headingLevel={2} metricLabel="Apr – Sep 2026">
          <LineChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={cashMonths} label="Invoiced" compare={collected} legendPosition="top" format={formatCompactMoney} height={240} />
        </ChartCard>
        <ChartCard title="Revenue by client" headingLevel={2} ranges={quarters} range={quarter} onRangeChange={setQuarter}>
          <DonutChart key={quarter} aria-label={`Revenue by client, ${quarter === "q3" ? "Q3 2026" : "Jan – Sep 2026"}`} data={quarter === "q3" ? clientShares : clientSharesYtd}
            format={formatCompactMoney} legendPosition="start" />
        </ChartCard>
        <ChartCard title="When the studio logs time" headingLevel={2} metricLabel="Hours logged per hour, September">
          <HeatmapChart aria-label="Hours logged by weekday and hour of the day, September 2026" rows={loggedHours} columns={weekdays} values={loggedByHour} format={hours} />
        </ChartCard>
        <ChartCard title="Hours against capacity" headingLevel={2} metricLabel="Billable hours in September" value={hours(teamCapacity.reduce((total, team) => total + team.value, 0))}>
          <BarChart orientation="horizontal" aria-label="Billable hours per team against capacity, September 2026" data={teamCapacity} format={hours} showAverage />
        </ChartCard>
        <ChartCard title="Budget used" headingLevel={2} metricLabel="Client projects, spent of budget">
          <RadialChart aria-label="Budget used on client projects, September 30, 2026" data={budgetRings} legendPosition="end" />
        </ChartCard>
      </Grid>
    </AppShell>
  );
}
