/* Page Header examples (brief: docs/research/example-rebuild-brief-2026-09-30.md; rebuilt on the new AppShell
   2026-10-19). Đìzai Studio, signed in as Alex Duong, Wednesday Sep 30, 2026, 10:30 am. Every example is one page of the
   studio's app: an AppShell (Pattern/AppShell/Desktop Layout=Sidebar) whose header (AppShellHeader) keeps the
   utilities in its top row and the page's one PageHeader, its h1, as the Main row; the Body holds the page. A list page
   with its actions, a detail page with Back and Tabs, nested pages with Breadcrumbs, a long title, a page title inside a
   tab (h2) and a first-use page whose empty state carries the first action. On a narrow window the shell keeps its
   header (the Sidebar opens as a drawer) and the actions wrap under the title with the Primary first; phone apps name
   their screens with the Top Navigation instead (see Top navigation). Each example is its own file in page-header/ (P2b,
   plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export in the page's desktop
   window and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import InvoicesPage from "./page-header/list-page.example";
import invoicesPageRaw from "./page-header/list-page.example.tsx?raw";
import TimeOffPages from "./page-header/detail-page.example";
import timeOffPagesRaw from "./page-header/detail-page.example.tsx?raw";
import ClientPages from "./page-header/nested-pages.example";
import clientPagesRaw from "./page-header/nested-pages.example.tsx?raw";
import LongTitlePage from "./page-header/long-title.example";
import longTitlePageRaw from "./page-header/long-title.example.tsx?raw";
import SettingsTabs from "./page-header/title-inside-a-tab.example";
import settingsTabsRaw from "./page-header/title-inside-a-tab.example.tsx?raw";
import ExpenseClaims from "./page-header/first-use.example";
import expenseClaimsRaw from "./page-header/first-use.example.tsx?raw";

export const page: PlatformPage = "page-header";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "List page",
    description: "The top of a list page, as the AppShell header's Main row: an eyebrow for the app section, the h1, one line on what the page holds, then Tertiary Export and the page's one Primary on the right. The top row above keeps the utilities: a Search that filters the table, Notifications and the account. On a narrow window the actions wrap under the title with the Primary first. New invoice adds a draft to the table.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><InvoicesPage /></PreviewAppFrame>,
    code: exampleCode(invoicesPageRaw),
  },
  {
    title: "Detail page",
    description: "Chi Tran’s leave request, opened from the Time off list: Back names the page it returns to, the status Badge sits beside the title and Tabs split the page; beside the request, who else is away that month. Decline and Approve show only while the request waits; either one changes the Badge, and the toast can undo it. Back, or Time off in the Sidebar, puts focus on the row you came from.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><TimeOffPages /></PreviewAppFrame>,
    code: exampleCode(timeOffPagesRaw),
  },
  {
    title: "Nested pages",
    description: "Pages deeper than one level put Breadcrumbs above the title instead of Back: the trail starts at Clients and ends at the current page, which is not a link. The top-level Clients page has no trail, and the header's top row keeps none either, so the trail shows once. Rows go down a level, crumbs and Clients in the Sidebar go back up. Pass the full trail: on a phone (under 744 px) the PageHeader shows Back to the parent crumb in its place by itself.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><ClientPages /></PreviewAppFrame>,
    code: exampleCode(clientPagesRaw),
  },
  {
    title: "Long title",
    description: "A long project name wraps onto a second line instead of being cut, and the status Badge follows it. The actions keep their own row: Tertiary Share, More with the less frequent ones, then the Primary. When the row runs out of room they wrap under the title, the Primary first.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><LongTitlePage /></PreviewAppFrame>,
    code: exampleCode(longTitlePageRaw),
  },
  {
    title: "Title inside a tab",
    description: "Settings owns the page's h1 and its Tabs, in the header's Main row. Each tab starts with its own PageHeader at headingLevel 2 (Heading/2) in the Body, so the outline reads Settings, then Members, and the tab keeps its own count and Primary. Invite member adds a row to the table.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><SettingsTabs /></PreviewAppFrame>,
    code: exampleCode(settingsTabsRaw),
  },
  {
    title: "First use",
    description: "Before the first claim the page shows an empty state that carries the one Primary, so the header keeps only its title and description. Once a claim exists, New claim moves up into the header and the table takes the empty state's place; the toast's Undo goes back.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><ExpenseClaims /></PreviewAppFrame>,
    code: exampleCode(expenseClaimsRaw),
  },
]);
