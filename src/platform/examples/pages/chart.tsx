/* Chart examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio reads its revenue, its billable
   hours and a project's budget through ChartCard, LineChart and StackBarChart; the phone examples are Alex's own hours in
   the studio app. Charts and KPI tiles may abbreviate ("$105.7K"); the report behind a chart never does. The screens sit
   in the studio's AppShell: Finance and Analytics in the sidebar pattern, the phones in its mobile parts (Hours is a
   root with the bottom bar; the screens pushed from it have Back).
   Each example is its own file in chart/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import FinanceDashboard from "./chart/finance-dashboard.example";
import financeDashboardRaw from "./chart/finance-dashboard.example.tsx?raw";
import StudioAnalytics from "./chart/studio-analytics.example";
import studioAnalyticsRaw from "./chart/studio-analytics.example.tsx?raw";
import HoursByTeam from "./chart/hours-by-team.example";
import hoursByTeamRaw from "./chart/hours-by-team.example.tsx?raw";
import RevenueForecast from "./chart/revenue-with-a-forecast.example";
import revenueForecastRaw from "./chart/revenue-with-a-forecast.example.tsx?raw";
import CashFlow from "./chart/a-line-and-its-comparison.example";
import cashFlowRaw from "./chart/a-line-and-its-comparison.example.tsx?raw";
import ClientShare from "./chart/shares-of-a-total.example";
import clientShareRaw from "./chart/shares-of-a-total.example.tsx?raw";
import ClientShareSplit from "./chart/total-beside-the-ring.example";
import clientShareSplitRaw from "./chart/total-beside-the-ring.example.tsx?raw";
import Capacity from "./chart/against-a-target.example";
import capacityRaw from "./chart/against-a-target.example.tsx?raw";
import BudgetRings from "./chart/ring-gauges.example";
import budgetRingsRaw from "./chart/ring-gauges.example.tsx?raw";
import Activity from "./chart/activity-by-hour.example";
import activityRaw from "./chart/activity-by-hour.example.tsx?raw";
import TrendInSection from "./chart/trend-in-a-section.example";
import trendInSectionRaw from "./chart/trend-in-a-section.example.tsx?raw";
import NoData from "./chart/no-data-yet.example";
import noDataRaw from "./chart/no-data-yet.example.tsx?raw";
import LoadFailed from "./chart/data-didnt-load.example";
import loadFailedRaw from "./chart/data-didnt-load.example.tsx?raw";
import PhoneHours from "./chart/hours-on-a-phone.example";
import phoneHoursRaw from "./chart/hours-on-a-phone.example.tsx?raw";
import TopClients from "./chart/top-clients.example";
import topClientsRaw from "./chart/top-clients.example.tsx?raw";
import PhoneProjects from "./chart/ranking-on-a-phone.example";
import phoneProjectsRaw from "./chart/ranking-on-a-phone.example.tsx?raw";
import QuarterGoals from "./chart/goals-against-targets.example";
import quarterGoalsRaw from "./chart/goals-against-targets.example.tsx?raw";
import CollectedGoal from "./chart/one-goal.example";
import collectedGoalRaw from "./chart/one-goal.example.tsx?raw";
import UtilisationGauge from "./chart/utilisation-against-a-target.example";
import utilisationGaugeRaw from "./chart/utilisation-against-a-target.example.tsx?raw";
import PhoneWeekGauge from "./chart/hours-this-week-on-a-phone.example";
import phoneWeekGaugeRaw from "./chart/hours-this-week-on-a-phone.example.tsx?raw";
import ProposalFunnel from "./chart/proposal-funnel.example";
import proposalFunnelRaw from "./chart/proposal-funnel.example.tsx?raw";
import HiringFunnel from "./chart/six-stages-with-the-keyboard.example";
import hiringFunnelRaw from "./chart/six-stages-with-the-keyboard.example.tsx?raw";
import HoursArea from "./chart/hours-over-time.example";
import hoursAreaRaw from "./chart/hours-over-time.example.tsx?raw";
import HoursByTeamArea from "./chart/stacked-by-team.example";
import hoursByTeamAreaRaw from "./chart/stacked-by-team.example.tsx?raw";
import InvoicedCollected from "./chart/invoiced-vs-collected.example";
import invoicedCollectedRaw from "./chart/invoiced-vs-collected.example.tsx?raw";
import PhoneTimeSplit from "./chart/grouped-bars-on-a-phone.example";
import phoneTimeSplitRaw from "./chart/grouped-bars-on-a-phone.example.tsx?raw";
import RevenueMargin from "./chart/revenue-and-margin.example";
import revenueMarginRaw from "./chart/revenue-and-margin.example.tsx?raw";
import HoursUtilisation from "./chart/a-share-on-a-fixed-axis.example";
import hoursUtilisationRaw from "./chart/a-share-on-a-fixed-axis.example.tsx?raw";
import CurrencyPreset from "./chart/money-as-a-preset.example";
import currencyPresetRaw from "./chart/money-as-a-preset.example.tsx?raw";
import NeutralLed from "./chart/led-by-the-neutral-colour.example";
import neutralLedRaw from "./chart/led-by-the-neutral-colour.example.tsx?raw";

export const page: PlatformPage = "chart";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Finance dashboard",
    screen: true,
    description: "The studio's Finance page: the Chart Card sits on the page canvas with three Metric Cards, all flat (Surface on the canvas, no border or shadow) beside a Sidebar without a shadow, and its title is an h2 right under the PageHeader in the header's Main row. On the wide card the range switch hugs its labels; the chevron opens the exact amounts in a Side Panel that docks beside the page when the window has room and floats over it when not.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><FinanceDashboard /></PreviewAppFrame>,
    code: exampleCode(financeDashboardRaw),
  },
  {
    title: "Studio analytics",
    screen: true,
    description: "The whole chart family on the studio's Analytics page, every card flat on the canvas beside a Sidebar without a shadow, its title an h2 under the PageHeader in the header's Main row: bars with a hatched forecast, a line with a dashed comparison, a donut, a heatmap, bars against capacity and ring gauges. Each chart draws itself in as it mounts.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><StudioAnalytics /></PreviewAppFrame>,
    code: exampleCode(studioAnalyticsRaw),
  },
  {
    title: "Hours by team",
    description: "A Stack Bar shows how each month's billable hours split across the four teams. The legend names every colour, the Tooltip gives the month's total, and the range switch fills the card.",
    render: () => <HoursByTeam />,
    code: exampleCode(hoursByTeamRaw),
  },
  {
    title: "Revenue with a forecast",
    description: "Bars compare months; the months not closed yet are projected and hatched, so the forecast never reads as earned. The card leads with the year's figure, the bars fill the plot 8px apart, the month under the pointer takes the Secondary colour with its Tooltip (none until then), and showAverage draws the closed months' mean as a dotted line with its Avg tag.",
    render: () => <RevenueForecast />,
    code: exampleCode(revenueForecastRaw),
  },
  {
    title: "A line and its comparison",
    description: "The line chart with one dashed comparison: what was invoiced keeps its Accent line and area, what was collected runs as a dashed neutral reference line, and the legend above names both. The Tooltip reads both values for the active month.",
    render: () => <CashFlow />,
    code: exampleCode(cashFlowRaw),
  },
  {
    title: "Shares of a total",
    description: "A donut splits one quarter's revenue across clients: a % pill on every slice of 6% or more, the total in the hole, the legend beside the ring. Hover or ←/→ pick a client and the centre shows its amount.",
    render: () => <ClientShare />,
    code: exampleCode(clientShareRaw),
  },
  {
    title: "Total beside the ring",
    wide: true,
    description: "On a half-width dashboard card the total leads in a column of its own, the legend lists down under it and the ring stands at the end with an empty hole (totalPosition=\"start\"). Picking a slice puts its amount in the total's place; on a narrow card the column comes first and the ring under it.",
    render: () => <ClientShareSplit />,
    code: exampleCode(clientShareSplitRaw),
  },
  {
    title: "Against a target",
    description: "Horizontal bars suit long category names. Each team's capacity is a hatched track behind its bar, every row ends with its value (the active one in Strongest, nothing floats over the bars), and the average runs down the plot under its tag. ↑/↓ move between teams; the summary reads \"1,990 h of 2,240 h\".",
    render: () => <Capacity />,
    code: exampleCode(capacityRaw),
  },
  {
    title: "Ring gauges",
    description: "Up to four measures against the same maximum, as concentric rings over dotted tracks: here the share of budget each client project has spent. The centre shows the outer ring, or the ring you pick.",
    render: () => <BudgetRings />,
    code: exampleCode(budgetRingsRaw),
  },
  {
    title: "Activity by hour",
    description: "A heatmap reads a value per weekday and hour on five Brand steps, from Pale to Deep, with the Less → More scale under it. The arrow keys move through the cells; the row and column labels of the active cell light up.",
    render: () => <Activity />,
    code: exampleCode(activityRaw),
  },
  {
    title: "Trend in a section",
    description: "Inside a page section the LineChart goes without a card, under the section heading and the metric it explains. Tab reaches the chart; ←/→ and Home/End move the point, and the Tooltip and a live summary read its value.",
    render: () => <TrendInSection />,
    code: exampleCode(trendInSectionRaw),
  },
  {
    title: "No data yet",
    description: "Before any time is logged the card keeps its title and shows an Empty State with the action that brings data in, never an empty grid. Import timesheets draws the first two weeks, and Undo in the Toast goes back.",
    render: () => <NoData />,
    code: exampleCode(noDataRaw),
  },
  {
    title: "Data didn't load",
    description: "When the data fails, the card keeps its title and shows a Negative Inline Message with Try again, not an Empty State. The retry puts a Skeleton in the chart's place until the months arrive, and a hidden status line tells screen readers.",
    render: () => <LoadFailed />,
    code: exampleCode(loadFailedRaw),
  },
  {
    title: "Hours on a phone",
    description: "On a phone a screen's one main chart goes straight on the screen — no Chart Card, whose padding would cost the plot its width: its title, the range switch split into equal halves and the chart share the margin the AppShell's Body pads, and six short labels keep every point tappable. Hours is a root of the studio app, so the bottom bar holds its roots; the bar casts a shadow, so the entry groups below are Shadow blocks on the grey Canvas, and they scroll the large title into the bar.",
    render: () => <PlatformPhoneApp label="Hours" app={PhoneHours} />,
    code: exampleCode(phoneHoursRaw),
  },
  {
    title: "Top clients",
    description: "A bar list ranks a few items with their values: each bar is its share of the leader, the name sits in the bar and the values line up at the end under their column label. The active row is stronger (48%); ↑/↓ and Home/End move it and the summary reads \"Lumen Bank: $89,000 (1 of 5)\". The range switch redraws the list.",
    render: () => <TopClients />,
    code: exampleCode(topClientsRaw),
  },
  {
    title: "Ranking on a phone",
    description: "On a phone the screen's one ranking goes straight on the screen, no Chart Card: a heading with its total, then the list at full width. Project names sit inside the bars (a short bar lets its name run past its end, a name too long for the column ends in an ellipsis) and the values keep their own column. The screen is pushed from Hours: Back in the compact bar, no bottom bar, and the budgets left close it as an open list on the Canvas (no box: the list ends the phone page).",
    render: () => <PlatformPhoneApp label="Hours by project" app={PhoneProjects} />,
    code: exampleCode(phoneProjectsRaw),
  },
  {
    title: "Goals against targets",
    description: "A bullet chart sets 1–4 goals against their targets, each on its own scale, so money, counts and percentages share one card: the bar is where a goal stands, the tick where it should be, and a bar past its tick is a goal met. ↑/↓ pick a goal (the others dim) and the summary reads \"New clients: 5 of 4 (2 of 3)\".",
    render: () => <QuarterGoals />,
    code: exampleCode(quarterGoalsRaw),
  },
  {
    title: "One goal",
    description: "One goal is enough for a bullet chart when its target matters: the tick shows the plan, which a progress bar can't. The legend takes the card's words (actualLabel, targetLabel) and max sets the scale.",
    render: () => <CollectedGoal />,
    code: exampleCode(collectedGoalRaw),
  },
  {
    title: "Utilisation against a target",
    description: "One measure against its maximum as a half ring: billable hours of the hours logged, the 85% target as a tick across the ring. Pass max (here the hours logged) and the gauge reads the share; the legend names the value and the target. Screen readers hear a meter: \"Billable 78%, Target 85%\".",
    render: () => <UtilisationGauge />,
    code: exampleCode(utilisationGaugeRaw),
  },
  {
    title: "Hours this week on a phone",
    description: "A gauge with no target: the week's 40 hours are the scale, format reads hours at the figure and both ends, and the caption says what is left. On a phone the screen's one main chart goes straight on the screen, without a Chart Card; the week's entries close it as an open list on the grey Canvas (no box: the list ends the phone page). Log time in the Action bar adds an entry from a Bottom Sheet, and the gauge moves with it (Undo in the toast).",
    render: () => <PlatformPhoneApp label="This week" app={PhoneWeekGauge} />,
    code: exampleCode(phoneWeekGaugeRaw),
  },
  {
    title: "Proposal funnel",
    description: "Stages from first contact to a signed project, each bar centred and as wide as its share of the first stage; the last stage takes Sector/Secondary. Every row shows its count under the name and its share at the end, so nothing floats over the bars. Hover or ↑/↓ pick a stage and dim the others.",
    render: () => <ProposalFunnel />,
    code: exampleCode(proposalFunnelRaw),
  },
  {
    title: "Six stages with the keyboard",
    description: "Six stages, the most a funnel takes: a long stage name widens the name column for every row, and the small last stages keep a visible bar. Tab to the funnel, then ↑/↓ move between stages and Home/End jump to the first and last; the summary reads \"Interview: 18 people, 8% of Applications (4 of 6)\".",
    render: () => <HiringFunnel />,
    code: exampleCode(hiringFunnelRaw),
  },
  {
    title: "Hours over time",
    description: "An area chart reads one measure over time as a straight line over its fading area, from the first month to the last. The active month shows its dot, a rule down to the baseline and the Tooltip beside the dot; with one series the card title names the measure, so there is no legend.",
    render: () => <HoursArea />,
    code: exampleCode(hoursAreaRaw),
  },
  {
    title: "Stacked by team",
    description: "type=\"stacked\" piles two to four series as bands, so the top line is the month's total and each band shows how one team moves. The legend names every band. Tab to the chart, then ←/→ move between months and Home/End jump to April and September; the Tooltip gives the total and the summary reads \"Sep: total 5,900 h; Design 2,650 h, Engineering 1,990 h, Delivery 750 h, Client Services 510 h (6 of 6)\".",
    render: () => <HoursByTeamArea />,
    code: exampleCode(hoursByTeamAreaRaw),
  },
  {
    title: "Invoiced vs. collected",
    description: "Grouped bars put two or three measures side by side in each month, here what was invoiced next to what came in. The legend names both colours and the Tooltip reads each value after its dot. For a trend against a reference, the line with its comparison reads better; for parts of one total, a Stack Bar.",
    render: () => <InvoicedCollected />,
    code: exampleCode(invoicedCollectedRaw),
  },
  {
    title: "Grouped bars on a phone",
    description: "On a phone the chart goes straight on the screen under its heading, without a Chart Card. Six weeks of two bars still fit 390px: each bar narrows with its column. Touching a week shows its Tooltip; the totals below close the screen as an open list on the grey Canvas of a screen pushed from Hours (Back, no bottom bar).",
    render: () => <PlatformPhoneApp label="Billable time" app={PhoneTimeSplit} />,
    code: exampleCode(phoneTimeSplitRaw),
  },
  {
    title: "Revenue and margin",
    description: "A combo chart reads two measures with different units over the same months: revenue as bars on the start axis, margin as a line with a dot per month on the end axis. Both axes share the gridlines, and the Tooltip reads both values for the active month.",
    render: () => <RevenueMargin />,
    code: exampleCode(revenueMarginRaw),
  },
  {
    title: "A share on a fixed axis",
    description: "When the line is a share, lineMax={100} fixes the end axis at 0 – 100%, so 78% sits at 78% of the plot instead of near the top of a tighter scale. The end axis still takes the start axis' gridlines (0, 25, 50, 75, 100%).",
    render: () => <HoursUtilisation />,
    code: exampleCode(hoursUtilisationRaw),
  },
  {
    title: "Money as a preset",
    description: "format=\"currency\" reads money without a function: \"$105.7K\" on the axis, in the Tooltip and down the list, the way a Zen Studio page writes it (a page holds text, never a function). currency picks another currency (\"EUR\" €105.7K), format=\"percent\" reads a share, and a function still writes any other unit.",
    render: () => <CurrencyPreset />,
    code: exampleCode(currencyPresetRaw),
  },
  {
    title: "Led by the neutral colour",
    description: "palette=\"secondary\" (Figma Color=Secondary) leads a chart with Chart/Sector/Secondary, Neutral Deep in Zen's theme, and keeps the brand colour for what should stand out: the active bar, the gauge's target, the second client's share. Bar, stack bar, area, grouped bar, combo, donut, radial, gauge, funnel and bullet charts take it; colours from the third series on stay as they are.",
    render: () => <NeutralLed />,
    code: exampleCode(neutralLedRaw),
  },
]);
