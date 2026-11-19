/* Sidebar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md; rebuilt on the new AppShell 2026-10-19).
   Alex Duong moves around the Đìzai Studio app: the studio shell, the projects flyout on a collapsed rail, client
   workspaces, the studio handbook, routed links and a Starter plan. Each desktop screen is one AppShell
   (Pattern/AppShell/Desktop, Layout=Sidebar) in a window: the Sidebar beside the page, Header/AppShell with the trail or
   a Search in its top row and the page's PageHeader in its Main row, and the Body at the page margin (no Container).
   Below 1024px the shell opens the Sidebar as a drawer from the header's menu button; on a phone, from the Top
   Navigation's. Each example is its own file in sidebar/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11):
   the card renders its default export, in the page's desktop window or phone, and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import StudioNavigation from "./sidebar/studio-navigation.example";
import studioNavigationRaw from "./sidebar/studio-navigation.example.tsx?raw";
import ProjectsFlyout from "./sidebar/projects-flyout.example";
import projectsFlyoutRaw from "./sidebar/projects-flyout.example.tsx?raw";
import SwitchWorkspace from "./sidebar/switch-workspace.example";
import switchWorkspaceRaw from "./sidebar/switch-workspace.example.tsx?raw";
import AccountHeader from "./sidebar/account-header-and-module-title.example";
import accountHeaderRaw from "./sidebar/account-header-and-module-title.example.tsx?raw";
import HandbookNavigation from "./sidebar/handbook-with-chapters.example";
import handbookNavigationRaw from "./sidebar/handbook-with-chapters.example.tsx?raw";
import LinksForRouting from "./sidebar/links-for-routing.example";
import linksForRoutingRaw from "./sidebar/links-for-routing.example.tsx?raw";
import SidebarStates from "./sidebar/disabled-and-empty-items.example";
import sidebarStatesRaw from "./sidebar/disabled-and-empty-items.example.tsx?raw";
import SidebarOnPhone from "./sidebar/on-a-phone.example";
import sidebarOnPhoneRaw from "./sidebar/on-a-phone.example.tsx?raw";

export const page: PlatformPage = "sidebar";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Studio navigation",
    description: "The app’s main Sidebar in an AppShell: counters for things to act on, a dot for something new, New project on the Projects title, and Settings and Help in the footer. The collapse toggle starts the header’s top row and the shell keeps the rail state; a task opened from a list keeps that destination selected and puts its trail beside the toggle. Below 1024px the shell opens the Sidebar as a drawer.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><StudioNavigation /></PreviewAppFrame>,
    code: exampleCode(studioNavigationRaw),
  },
  {
    title: "Projects flyout",
    description: "A collapsed rail keeps the page wide; Projects opens a flyout with search and Pinned / All projects sections instead of a long inline list. Escape or a press outside closes it (onSubMenuClose); after Escape or a pick, focus returns to Projects. The rail shows each name as a tooltip, and the trail in the header leads back to Projects. In the drawer (below 1024px) the whole navigation shows, so Projects opens the projects page there.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><ProjectsFlyout /></PreviewAppFrame>,
    code: exampleCode(projectsFlyoutRaw),
  },
  {
    title: "Switch workspace",
    description: "For people in more than one workspace: the rail lists them with the active one ringed, the header name switches too, and each workspace brings its own sections and keeps the page left open in it. The header’s trail starts at the workspace and a Badge says Alex’s role there; on a Canvas/Alt page the Sidebar sits on the canvas (Surface/Default, no shadow) with a divider. The workspace Sidebar has no rail, so the top row has no collapse toggle.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><SwitchWorkspace /></PreviewAppFrame>,
    code: exampleCode(switchWorkspaceRaw),
  },
  {
    title: "Account header and module title",
    description: "A recipe for an app whose Sidebar names the workspace and opens modules (HR-Platform). The brand is the workspace's square logo, its name over a short line, and a chevron-selector menu that switches workspace. Inside a module, a SidebarSubHeader puts Back over the module's name; the collapsed rail keeps the logo and the Back chevron.",
    wide: true,
    screen: true,
    render: () => <AccountHeader />,
    code: exampleCode(accountHeaderRaw),
  },
  {
    title: "Handbook with chapters",
    description: "A knowledge base with many pages uses Small-Density: search in the Sidebar, chapters that open in place one level deep, and a Flat background on a Canvas/Flat page so navigation and page read as one plane. A long page title ellipsizes in the Sidebar and reads in full on its page, under a trail whose chapter crumb lists the chapter’s pages.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><HandbookNavigation /></PreviewAppFrame>,
    code: exampleCode(handbookNavigationRaw),
  },
  {
    title: "Links for routing",
    description: "Destinations are real links: each item has an href and linkAs is the app's router link, so a click navigates in place while Cmd-click and Copy link address work as on any link. The header’s trail is links to the same routes, and selectedId comes from the route, so a project’s own page keeps Projects selected.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><LinksForRouting /></PreviewAppFrame>,
    code: exampleCode(linksForRoutingRaw),
  },
  {
    title: "Disabled and empty items",
    description: "On the Starter plan, Invoices and Reports stay in the Sidebar but disabled: people see what the Business plan adds, the items skip clicks and keep their place, and Switch to Business turns them on, with the plan Badge in the header changing too. An empty Inbox shows no counter or dot, and its page says it is empty instead of showing a blank list.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><SidebarStates /></PreviewAppFrame>,
    code: exampleCode(sidebarStatesRaw),
  },
  {
    title: "On a phone",
    description: "On a phone the AppShell draws its mobile parts and the same Sidebar becomes its drawer: the Top Navigation’s menu button slides it in over a scrim, with focus on the current page; a pick, Escape or the scrim closes it and the page below changes. The drawer suits an app with more destinations than a bottom bar holds, such as every project plus Settings and Help.",
    render: () => <PlatformPhoneApp label="Zen app" app={SidebarOnPhone} />,
    code: exampleCode(sidebarOnPhoneRaw),
  },
]);
