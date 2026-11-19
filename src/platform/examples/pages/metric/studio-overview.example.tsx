import { useId, useRef, useState } from "react";
import {
  Button, DockIcon, EmptyState, Grid, Heading, IconButton, List, ListItem, Menu, Metric, MetricCard, Segmented, SidePanel, Stack, Text, plural, useToast,
  type DockIconTheme, type IconName, type MetricTrendDirection,
} from "@zen-ds/react";
import { formatMoney, projectById, studio, studioMonths, studioTeamHours } from "../../data";

/** One line of a breakdown: a project, a team or a leave entry. */
type Row = { id: string; title: string; caption: string; icon: IconName; theme: DockIconTheme };

/** A project as a breakdown row (Dock Icon and client from the shared data). */
const projectRow = (projectId: string): Row => {
  const project = projectById(projectId);
  return { id: project.id, title: project.name, caption: project.client, icon: project.icon, theme: project.theme };
};

type Period = "month" | "quarter" | "year";
/** The overview's one comparison period: every tile, every trend and every breakdown follow it. */
const periods: Record<Period, { label: string; title: string; range: string; compared: string; versus: string }> = {
  month: { label: "Month", title: "September", range: "Sep 1 – Sep 30, 2026", compared: "August", versus: "August" },
  quarter: { label: "Quarter", title: "Q3 2026", range: "Jul 1 – Sep 30, 2026", compared: "Q2", versus: "Q2" },
  year: { label: "Year", title: "2026 so far", range: "Jan 1 – Sep 30, 2026", compared: "Jan 1 – Sep 30, 2025", versus: "2025" },
};
const periodOptions = (Object.keys(periods) as Period[]).map((id) => ({ id, label: periods[id].label }));

const team = (id: string, title: string, size: number, icon: IconName, theme: DockIconTheme): Row =>
  ({ id, title, caption: plural(size, "person", "people"), icon, theme });
const earlier = (id: string, caption: string): Row => ({ id, title: "Earlier projects", caption, icon: "icon-folder-line", theme: "neutral" });
/** What a tile can be broken down into: the studio's projects and its billable teams. */
const breakdownRows = {
  lumen: projectRow("lumen-banking"), phin: projectRow("phin-loyalty"), mekong: projectRow("mekong-tracking"),
  bookfair: projectRow("bookfair-site"), zen: projectRow("zen-ds"),
  handedOver: earlier("handed-over", "2 projects handed over in August"), ytd: earlier("ytd", "6 projects handed over Jan – Aug 2026"),
  design: team("design", "Design", 18, "icon-palette-line", "pink"), engineering: team("engineering", "Engineering", 14, "icon-code-02-line", "blue"),
  delivery: team("delivery", "Delivery", 6, "icon-briefcase-line", "orange"), clientServices: team("client-services", "Client Services", 5, "icon-message-chat-circle-line", "crimson"),
};
type RowKey = keyof typeof breakdownRows;
type KpiPeriod = { value: string; direction: MetricTrendDirection; change: string; rows: [RowKey, string][] };
type Kpi = { id: string; label: string; icon: IconName; theme: DockIconTheme; by: string } & Record<Period, KpiPeriod>;

/* Revenue and billable hours add up the studio's shared months (demo data), the series the Chart page draws, so the two
   pages never disagree. Utilisation matches the Chart page's Utilisation line; the rows of each period add up to its tile. */
const invoicedIn = (...ids: string[]) => studioMonths.filter((m) => ids.includes(m.id)).reduce((total, m) => total + m.invoiced, 0);
const hoursIn = (...labels: string[]) => studioTeamHours.filter((m) => labels.includes(m.label))
  .reduce((total, m) => total + m.design + m.engineering + m.delivery + m.clientServices, 0);
/** "9%": the change from one total to the next, in whole percent; the trend's arrow carries its sign (Figma Metric-Trend). */
const changeOf = (now: number, before: number) => `${Math.abs(Math.round((now / before - 1) * 100))}%`;
const hoursLabel = (value: number) => `${value.toLocaleString("en-US")} h`;
const revenue = { month: invoicedIn("sep"), august: invoicedIn("aug"), q3: invoicedIn("jul", "aug", "sep"), q2: invoicedIn("apr", "may", "jun"),
  year: invoicedIn("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep") };
const billable = { month: hoursIn("Sep"), august: hoursIn("Aug"), q3: hoursIn("Jul", "Aug", "Sep"), q2: hoursIn("Apr", "May", "Jun") };

const studioKpis: Kpi[] = [
  {
    id: "revenue", label: "Revenue", icon: "icon-currency-dollar-circle-line", theme: "green", by: "By project",
    month: { value: formatMoney(revenue.month), direction: "positive", change: changeOf(revenue.month, revenue.august), rows: [["lumen", "$52,400"], ["phin", "$38,600"], ["mekong", "$8,300"], ["bookfair", "$6,400"]] },
    quarter: { value: formatMoney(revenue.q3), direction: "positive", change: changeOf(revenue.q3, revenue.q2), rows: [["phin", "$87,200"], ["handedOver", "$78,100"], ["lumen", "$70,600"], ["bookfair", "$52,600"], ["mekong", "$8,300"]] },
    year: { value: formatMoney(revenue.year), direction: "positive", change: "12%", rows: [["ytd", "$560,700"], ["phin", "$87,200"], ["bookfair", "$71,500"], ["lumen", "$70,600"], ["mekong", "$8,300"]] },
  },
  {
    id: "hours", label: "Billable hours", icon: "icon-clock-line", theme: "blue", by: "By project",
    month: { value: hoursLabel(billable.month), direction: "positive", change: changeOf(billable.month, billable.august), rows: [["lumen", "2,560 h"], ["phin", "2,230 h"], ["mekong", "680 h"], ["bookfair", "430 h"]] },
    quarter: { value: hoursLabel(billable.q3), direction: "positive", change: changeOf(billable.q3, billable.q2), rows: [["handedOver", "5,380 h"], ["phin", "5,050 h"], ["bookfair", "3,490 h"], ["lumen", "3,460 h"], ["mekong", "680 h"]] },
    year: { value: "50,040 h", direction: "positive", change: "5%", rows: [["ytd", "36,110 h"], ["phin", "5,050 h"], ["bookfair", "4,740 h"], ["lumen", "3,460 h"], ["mekong", "680 h"]] },
  },
  {
    id: "utilisation", label: "Utilisation", icon: "icon-pie-chart-01-line", theme: "violet", by: "By team",
    month: { value: "78%", direction: "negative", change: "2 pts", rows: [["design", "84%"], ["engineering", "81%"], ["delivery", "72%"], ["clientServices", "58%"]] },
    quarter: { value: "80%", direction: "positive", change: "1 pt", rows: [["design", "86%"], ["engineering", "83%"], ["delivery", "74%"], ["clientServices", "60%"]] },
    year: { value: "77%", direction: "positive", change: "3 pts", rows: [["design", "82%"], ["engineering", "80%"], ["delivery", "70%"], ["clientServices", "59%"]] },
  },
  {
    id: "projects", label: "Active projects", icon: "icon-folder-check-line", theme: "indigo", by: "By project",
    month: { value: "3", direction: "normal", change: "−2", rows: [["zen", "81% done"], ["phin", "64% done"], ["lumen", "38% done"]] },
    quarter: { value: "7", direction: "normal", change: "+1", rows: [["zen", "81% done"], ["phin", "64% done"], ["lumen", "38% done"], ["mekong", "22% done"], ["bookfair", "Delivered"], ["handedOver", plural(2, "project")]] },
    year: { value: "11", direction: "normal", change: "+2", rows: [["zen", "81% done"], ["phin", "64% done"], ["lumen", "38% done"], ["mekong", "22% done"], ["bookfair", "Delivered"], ["ytd", plural(6, "project")]] },
  },
];

/** Four MetricCards on one comparison period; the ⋮ Sub-Action opens a tile's breakdown or hides it with Undo. */
export default function StudioOverview() {
  const { toast } = useToast();
  const headingId = useId();
  const breakdownId = useId();
  const showAllRef = useRef<HTMLButtonElement>(null);
  const emptyTitleRef = useRef<HTMLSpanElement>(null);
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [period, setPeriod] = useState<Period>("month");
  const [hidden, setHidden] = useState<string[]>([]);
  const [panelKpi, setPanelKpi] = useState(studioKpis[0]);
  const [panelOpen, setPanelOpen] = useState(false);
  const at = periods[period];
  const shown = studioKpis.filter((kpi) => !hidden.includes(kpi.id));
  const trendOf = (kpi: Kpi) => ({ direction: kpi[period].direction, label: kpi[period].change, subLabel: `vs. ${at.versus}` });
  const openBreakdown = (kpi: Kpi) => { setPanelKpi(kpi); setPanelOpen(true); };
  const hide = (kpi: Kpi) => {
    setHidden((ids) => [...ids, kpi.id]);
    toast({ title: `${kpi.label} hidden`, action: { label: "Undo", onClick: () => setHidden((ids) => ids.filter((id) => id !== kpi.id)) } });
    // The tile took its ⋮ button with it: focus moves to Show all metrics (after the Menu hands focus back), not <body>.
    // With every tile hidden, the empty state's title takes it.
    setTimeout(() => (showAllRef.current ?? emptyTitleRef.current)?.focus());
  };
  // Show all metrics leaves once every tile is back: focus moves to the first tile's ⋮ button.
  const showAll = () => {
    setHidden([]);
    setTimeout(() => actionRefs.current[studioKpis[0].id]?.focus());
  };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack direction="row" justify="between" align="center" gap="sm" wrap>
        <Stack gap="xs">
          <Heading level={4} id={headingId} textStyle="Heading/4">{at.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">All projects · {at.range} · compared with {at.compared}</Text>
        </Stack>
        <Stack direction="row" align="center" gap="xs" wrap>
          {hidden.length && shown.length ? <Button ref={showAllRef} level="tertiary" onClick={showAll}>Show all metrics</Button> : null}
          <Segmented aria-label="Period" options={periodOptions} value={period} onValueChange={(id) => setPeriod(id as Period)} />
        </Stack>
      </Stack>
      {shown.length ? (
        <Grid minColumnWidth="220px" gap="md">
          {shown.map((kpi) => (
            <MetricCard key={kpi.id} theme="default" label={kpi.label} value={kpi[period].value} trend={trendOf(kpi)} icon={kpi.icon} iconTheme={kpi.theme}
              subAction={
                <Menu align="end" trigger={<IconButton ref={(button) => { actionRefs.current[kpi.id] = button; }} appearance="flat" level="secondary" size="sm"
                  icon="icon-dots-vertical-line" aria-label={`Actions for ${kpi.label}`} />}
                  items={[
                    { id: "breakdown", label: "View breakdown", onSelect: () => openBreakdown(kpi) },
                    { id: "hide", label: "Hide from overview", onSelect: () => hide(kpi) },
                  ]} />
              } />
          ))}
        </Grid>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-bar-chart-up-line" title={<span ref={emptyTitleRef} tabIndex={-1}>No metrics on the overview</span>}
          secondaryAction={{ label: "Show all metrics", onClick: showAll }}>Every metric is hidden from the overview.</EmptyState>
      )}
      <SidePanel type="modal" open={panelOpen} onOpenChange={setPanelOpen} title={panelKpi.label} description={`${studio.name} · ${at.range}`}>
        <Stack gap="lg">
          <Metric size="lg" icon={false} label={at.title} value={panelKpi[period].value} trend={trendOf(panelKpi)} />
          <Stack gap="xs">
            <Heading level={3} id={breakdownId} textStyle="Body/Small/Bold" tone="light">{panelKpi.by}</Heading>
            <List aria-labelledby={breakdownId}>
              {panelKpi[period].rows.map(([key, value]) => {
                const row = breakdownRows[key];
                return (
                  <ListItem key={key} title={row.title} caption={row.caption} leading={<DockIcon size="md" icon={row.icon} theme={row.theme} background="subtle" />}
                    trailing={<Text as="span" textStyle="Body/Base/Medium">{value}</Text>} />
                );
              })}
            </List>
          </Stack>
        </Stack>
      </SidePanel>
    </Stack>
  );
}
