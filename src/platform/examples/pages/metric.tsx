/* Metric examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio reads its month, its people and its
   invoices through Metric and MetricCard; the phone examples are the studio's own app, where Alex checks his month. The
   screens sit in the studio's AppShell: Invoices in the sidebar pattern, the phones in its mobile parts (Numbers is a
   root with the bottom bar; the screens pushed from it have Back).
   Each example is its own file in metric/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import StudioOverview from "./metric/studio-overview.example";
import studioOverviewRaw from "./metric/studio-overview.example.tsx?raw";
import LeadMetric from "./metric/one-lead-metric.example";
import leadMetricRaw from "./metric/one-lead-metric.example.tsx?raw";
import TeamPulse from "./metric/team-pulse.example";
import teamPulseRaw from "./metric/team-pulse.example.tsx?raw";
import TileStates from "./metric/tile-states.example";
import tileStatesRaw from "./metric/tile-states.example.tsx?raw";
import TrendGuidance from "./metric/trend-with-guidance.example";
import trendGuidanceRaw from "./metric/trend-with-guidance.example.tsx?raw";
import PhoneDrillIn from "./metric/drill-in-on-a-phone.example";
import phoneDrillInRaw from "./metric/drill-in-on-a-phone.example.tsx?raw";
import InvoiceSummary from "./metric/summary-above-a-table.example";
import invoiceSummaryRaw from "./metric/summary-above-a-table.example.tsx?raw";
import BudgetProgress from "./metric/budget-with-progress.example";
import budgetProgressRaw from "./metric/budget-with-progress.example.tsx?raw";
import RevenueByChannel from "./metric/revenue-by-channel.example";
import revenueByChannelRaw from "./metric/revenue-by-channel.example.tsx?raw";
import MetricTypesRow from "./metric/metric-types-in-a-row.example";
import metricTypesRowRaw from "./metric/metric-types-in-a-row.example.tsx?raw";
import CashFlowRow from "./metric/cash-flow-at-a-glance.example";
import cashFlowRowRaw from "./metric/cash-flow-at-a-glance.example.tsx?raw";
import HeroMetric from "./metric/one-hero-metric.example";
import heroMetricRaw from "./metric/one-hero-metric.example.tsx?raw";
import StandOutTiles from "./metric/stat-tiles-with-one-stand-out.example";
import standOutTilesRaw from "./metric/stat-tiles-with-one-stand-out.example.tsx?raw";
import PhoneTiles from "./metric/stat-tiles-on-a-phone.example";
import phoneTilesRaw from "./metric/stat-tiles-on-a-phone.example.tsx?raw";
import PhoneMetricTypes from "./metric/metric-types-on-a-phone.example";
import phoneMetricTypesRaw from "./metric/metric-types-on-a-phone.example.tsx?raw";
import FirstWeeksMetrics from "./metric/first-weeks-of-a-project.example";
import firstWeeksMetricsRaw from "./metric/first-weeks-of-a-project.example.tsx?raw";

export const page: PlatformPage = "metric";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Studio overview",
    wide: true,
    description: "Four MetricCards share one size and one comparison period: the Segmented switches Month, Quarter or Year and every value and trend follows. The ⋮ Sub-Action opens the rows behind a tile in a Side Panel, or hides the tile with Undo.",
    render: () => <StudioOverview />,
    code: exampleCode(studioOverviewRaw),
  },
  {
    title: "One lead metric",
    description: "Headcount leads at XLarge with the only Solid Dock-Icon. The three metrics that explain it share one smaller size below a Divider.",
    render: () => <LeadMetric />,
    code: exampleCode(leadMetricRaw),
  },
  {
    title: "Team pulse",
    description: "A survey widget shows people-centred scores with an emoji Dock-Icon instead of an icon. The Normal trend says in words that a score held steady.",
    render: () => <TeamPulse />,
    code: exampleCode(teamPulseRaw),
  },
  {
    title: "Tile states",
    wide: true,
    description: "Three tiles of one project dashboard: Budget has loaded, Hours logged has no data yet (a dash and a caption that says why), and Open tasks couldn't load. Try again shows a Skeleton in the metric's shape until the number arrives.",
    render: () => <TileStates />,
    code: exampleCode(tileStatesRaw),
  },
  {
    title: "Trend with guidance",
    description: "A worrying trend comes with an Inline Message that says what to do next. Send reminder turns the message into the result, and Undo in the Toast brings the warning back.",
    render: () => <TrendGuidance />,
    code: exampleCode(trendGuidanceRaw),
  },
  {
    title: "Drill in on a phone",
    description: "On a phone the Title-Highlight metric puts its title first and a chevron in the title row, one card per row under a kicker for its period, on the Numbers root of the studio app (the large title, the bottom bar; its shadow gives the cards theme=\"shadow\"). The chevron opens what the number adds up as the next screen, pushed without the bottom bar, and Back returns focus to it.",
    render: () => <PlatformPhoneApp label="Numbers" app={PhoneDrillIn} />,
    code: exampleCode(phoneDrillInRaw),
  },
  {
    title: "Summary above a table",
    wide: true,
    screen: true,
    description: "The studio's Invoices page: small Metrics above the invoices Table add up the same rows, so sending an invoice, recording a payment or adding a draft (New invoice, in the PageHeader of the header's Main row) moves its amount at once, with Undo in the Toast; the Search in the header's top row filters the table. The three Dock-Icons share one background (Subtle); their colour tells them apart.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><InvoiceSummary /></PreviewAppFrame>,
    code: exampleCode(invoiceSummaryRaw),
  },
  {
    title: "Budget with progress",
    description: "Title-Highlight takes your own content under the number in its Custom slot (Figma Custom-Slot): here each project's spend as a ProgressBar. The corner icon stays beside the number; the bar uses the quota scale, so it turns Warning from 75% and Negative from 90%.",
    render: () => <BudgetProgress />,
    code: exampleCode(budgetProgressRaw),
  },
  {
    title: "Revenue by channel",
    description: "Metric-Color puts each channel's chart colour before its label, and the Counter after it says how many invoices the total covers. The payout tile is Title-Highlight with a Label-Icon before its title and a Hint after it, which explains how the number is worked out on hover and focus.",
    render: () => <RevenueByChannel />,
    code: exampleCode(revenueByChannelRaw),
  },
  {
    title: "Metric types in a row",
    wide: true,
    description: "MetricCard type draws Figma's Metric-Card types under a Title-Highlight number: a sparkline of the last twelve months, spark bars with the current week in Chart Sector/Secondary, and a stacked ProgressBar toward the quarter's goal. The marks draw in on load; screen readers hear the numbers and a summary of each series.",
    render: () => <MetricTypesRow />,
    code: exampleCode(metricTypesRowRaw),
  },
  {
    title: "Cash flow at a glance",
    wide: true,
    description: "Comparison puts three numbers side by side under one title, each with its own trend; Category-Bar splits one total into its parts, each row saying its amount and a share that adds up to 100%. On a narrow card the columns stack.",
    render: () => <CashFlowRow />,
    code: exampleCode(cashFlowRowRaw),
  },
  {
    title: "One hero metric",
    description: "The Hero is the one widget of a dashboard that stands out: a Brand Pale card with neutral marks and a Primary button, or the dark Solid Neutral card, whose content turns Inverse and whose button is the white overlay Inverse one. Its trend sits in a white On-Color badge.",
    render: () => <HeroMetric />,
    code: exampleCode(heroMetricRaw),
  },
  {
    title: "Stat tiles with one stand-out",
    description: "type=\"tile\" is the compact stat: the title, number and trend over the Dock-Icon, in a Small card. One tile of the row stands out with theme=\"solid\"; pick its colour and its content follows the fill: Inverse on Neutral, On-Accent on Accent, dark On-Brights on Yellow (white On-Colors on Brand, Cyan and Orange), and the trend and Dock-Icon turn into chips of that family. White on Accent, Brand, Cyan and Orange is about 3:1, so keep the words there short and large.",
    render: () => <StandOutTiles />,
    code: exampleCode(standOutTilesRaw),
  },
  {
    title: "Stat tiles on a phone",
    description: "Two Medium tiles share the screen's width (Display/3 numbers), three Small ones a row (Heading/3). The dark Solid Neutral tile is the week's one highlight, its content Inverse. A tile without a trend is shorter inside; the row's cards still share one height. The week is a screen pushed from Numbers (Back, no bottom bar), with what comes up next under the tiles.",
    render: () => <PlatformPhoneApp label="This week" app={PhoneTiles} />,
    code: exampleCode(phoneTilesRaw),
  },
  {
    title: "Metric types on a phone",
    description: "On the studio's phone app the typed cards fill the screen's width: the sparkline and the category bar take the card's width, and the comparison stacks its columns with a rule above each. September is a screen pushed from Numbers (Back, no bottom bar), so the cards stay flat on the grey Canvas.",
    render: () => <PlatformPhoneApp label="September" app={PhoneMetricTypes} />,
    code: exampleCode(phoneMetricTypesRaw),
  },
  {
    title: "First weeks of a project",
    description: "Edge cases keep their shape: with no data yet the sparkline keeps its height and the number reads a dash (\"No data\" to screen readers); one week of hours is one current bar; a goal already passed fills the bar and reads 112%.",
    render: () => <FirstWeeksMetrics />,
    code: exampleCode(firstWeeksMetricsRaw),
  },
]);
