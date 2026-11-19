/* Dashboard Header examples (Figma ◇ Master-Layout, Primitives/Dashboard/Header 4122:33402). Đìzai Studio, signed in as
   Alex Duong, Wednesday Sep 30, 2026. The rows a dashboard page's header is built from: the control bar over the leave
   requests table (Search, filter Chips, the count, the actions), the navigation bar, the rows inside an AppShell (Figma
   Header/Dashboard), a row of your own and a narrow column. Phones name their screens with the Top Navigation and filter
   in one scrolling Chip row instead (see Top navigation and Chip › Mobile filter row). Each example is its own file in
   dashboard-header/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export
   (the dashboard page in the page's desktop window) and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import LeaveRequests from "./dashboard-header/control-bar-over-a-table.example";
import leaveRequestsRaw from "./dashboard-header/control-bar-over-a-table.example.tsx?raw";
import NavigationBar from "./dashboard-header/navigation-bar.example";
import navigationBarRaw from "./dashboard-header/navigation-bar.example.tsx?raw";
import DashboardPage from "./dashboard-header/the-rows-of-a-dashboard-page.example";
import dashboardPageRaw from "./dashboard-header/the-rows-of-a-dashboard-page.example.tsx?raw";
import ReportingPeriod from "./dashboard-header/a-row-of-your-own.example";
import reportingPeriodRaw from "./dashboard-header/a-row-of-your-own.example.tsx?raw";
import NarrowColumn from "./dashboard-header/a-narrow-column.example";
import narrowColumnRaw from "./dashboard-header/a-narrow-column.example.tsx?raw";

export const page: PlatformPage = "dashboard-header";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Control bar over a table",
    description: "The leave requests list: Search filters by person or type, Status and Type are filter Chips, the count follows the filters, and the page's actions sit on the right — Tertiary Export, then the one Primary (first on a phone). No match shows the empty table with Clear filters.",
    wide: true,
    render: () => <LeaveRequests />,
    code: exampleCode(leaveRequestsRaw),
  },
  {
    title: "Navigation bar",
    description: "Where the page is, then the notifications, Help and the account on the right — the navigation row on its own, for a page outside an AppShell. Notifications marks the 8 unread as read; a crumb goes back up the trail. On a phone Back to the parent takes the trail's place and Help moves into the account menu.",
    wide: true,
    render: () => <NavigationBar />,
    code: exampleCode(navigationBarRaw),
  },
  {
    title: "The rows of a dashboard page",
    description: "Figma's Header/Dashboard inside an AppShell (AppShellHeader): the top row keeps the trail, Notifications and the account, the page title row (type main: the title, a second title in Light, one line under it and the page's Primary) is the Main row, and the control bar sits in Sections, at the page margins. The Body pads the table, so it needs no Container. Submit leave adds a pending request (the toast can undo it) and the Status chip filters the rows.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><DashboardPage /></PreviewAppFrame>,
    code: exampleCode(dashboardPageRaw),
  },
  {
    title: "A row of your own",
    description: "Type custom takes any content, Gap/Medium apart and centred: here the reporting period (Segmented), its dates and a team filter, between the title row and the report.",
    wide: true,
    render: () => <ReportingPeriod />,
    code: exampleCode(reportingPeriodRaw),
  },
  {
    title: "A narrow column",
    description: "Squeezed by a Sidebar and a docked panel (here 480px), the control bar wraps instead of shrinking its parts: the Search keeps its width and the Primary moves to the next line, Gap/XSmall under it. On a phone the Search takes a line of its own.",
    render: () => <NarrowColumn />,
    code: exampleCode(narrowColumnRaw),
  },
]);
