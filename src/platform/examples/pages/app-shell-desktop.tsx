/* App Shell › Desktop layouts (Figma sections B and G of ◇ Master-Layout · Example), one docs page of finished apps
   (examples/appShellLayouts.ts). Each example is its own file in app-shell-desktop/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export in the page's desktop
   window and shows its text as the snippet. */
import { useLayoutEffect, useState, type ComponentType } from "react";
import { PreviewAppFrame } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import StorefrontApp from "./app-shell-desktop/b1-top-nav-storefront.example";
import storefrontRaw from "./app-shell-desktop/b1-top-nav-storefront.example.tsx?raw";
import SupportInboxApp from "./app-shell-desktop/b2-rail-and-list-detail.example";
import supportInboxRaw from "./app-shell-desktop/b2-rail-and-list-detail.example.tsx?raw";
import AnalyticsApp from "./app-shell-desktop/b3-top-bar-analytics.example";
import analyticsRaw from "./app-shell-desktop/b3-top-bar-analytics.example.tsx?raw";
import WorkspaceEditorApp from "./app-shell-desktop/b4-workspace-editor.example";
import workspaceEditorRaw from "./app-shell-desktop/b4-workspace-editor.example.tsx?raw";
import DocsApp from "./app-shell-desktop/b5-docs-learning.example";
import docsRaw from "./app-shell-desktop/b5-docs-learning.example.tsx?raw";
import FocusFlowApp from "./app-shell-desktop/b6-focus-flow.example";
import focusFlowRaw from "./app-shell-desktop/b6-focus-flow.example.tsx?raw";
import TeamPerformance from "./app-shell-desktop/g1-grid.example";
import teamPerformanceRaw from "./app-shell-desktop/g1-grid.example.tsx?raw";
import TimeOff from "./app-shell-desktop/g2-grid-level.example";
import timeOffRaw from "./app-shell-desktop/g2-grid-level.example.tsx?raw";

export const page: PlatformPage = "app-shell-desktop";

const fits = (shell: string, domains: string[]) => ` Shell: ${shell}. Fits: ${domains.join(", ")}.`;
/** The Figma screens B4–B6 are 1512 × 982 (a 14" laptop window): the preview keeps that height, so the page fits as in Figma. */
const screenHeight = { min: 982, max: 982 };

/** B2's Side-Panel docks while the page keeps a Tablet width (744) beside the rail (80) and the panel (360): from 1184. */
const DOCK_MIN_WIDTH = 80 + 360 + 744;

/**
 * "B2 · Rail and list-detail" in its desktop frame. The frame is narrower than the window (a card in the page, a
 * thumbnail), so the page measures it and the customer's facts start open only where the shell docks them (Figma's
 * 1512 screen); narrower they would open as a Modal on load.
 */
function DockingFrame({ app: App }: { app: ComponentType<{ startOpen?: boolean }> }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    setWidth(frame.offsetWidth);
    const observer = new ResizeObserver(() => setWidth(frame.offsetWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);
  return <PreviewAppFrame frameRef={setFrame}><App startOpen={width >= DOCK_MIN_WIDTH} /></PreviewAppFrame>;
}

/** Under this width inside, G1's four KPI cards fold to two columns (each value keeps one line). */
const KPI_ROW_MIN_WIDTH = 1040;

/**
 * "G1 · Grid" in its desktop frame. The KPI row picks four or two columns by the width of the page beside the Sidebar,
 * and in the docs that page is narrower than the window: the page measures the shell's body (the column the cards sit
 * in) and tells the example.
 */
function KpiRowFrame({ app: App }: { app: ComponentType<{ narrowKpis?: boolean }> }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    // The app inside may render after the frame mounts: watch for the shell's body, then measure it.
    let body: HTMLElement | null = null;
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    const attach = () => {
      const next = frame.querySelector<HTMLElement>(".zen-app-shell__body");
      if (!next || next === body) return;
      if (body) resize.unobserve(body);
      body = next;
      resize.observe(body);
    };
    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(frame, { childList: true, subtree: true });
    return () => { mutations.disconnect(); resize.disconnect(); };
  }, [frame]);
  // Until the body is measured the example decides by the breakpoint.
  return <PreviewAppFrame frameRef={setFrame}><App narrowKpis={width > 0 ? width < KPI_ROW_MIN_WIDTH : undefined} /></PreviewAppFrame>;
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "B1 · Top-nav storefront",
    description: "No sidebar: the catalogue is the navigation. The AppShell top bar holds the brand, a Subtle Tab-Bar, Search and the actions; its title row is off, so the Display/3 page title heads the content, above a filter rail of Accordions beside a 4-column product grid (the rail stacks above two columns in a narrow window). Products have no box: Pale image tiles on a flat white canvas."
      + fits("AppShell/Desktop · Layout=Top-Bar", ["E-commerce", "Marketplace", "Booking", "Media catalogue"]),
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><StorefrontApp /></PreviewAppFrame>,
    code: exampleCode(storefrontRaw),
  },
  {
    title: "B2 · Rail and list-detail",
    description: "Three working panes for queues you triage all day: the Sidebar collapses to its rail, the list sits in the Leading-Pane, the detail is the main column under its header (title and actions) and the customer's facts sit in the Side-Panel. Panes are flat white tiles on the grey canvas, never shadowed."
      + fits("AppShell/Desktop · Layout=List-Detail · Collapse=Sidebar · Side-Panel", ["Support inbox", "Chat / Email", "CRM records", "Ticketing"]),
    wide: true,
    screen: true,
    render: () => <DockingFrame app={SupportInboxApp} />,
    code: exampleCode(supportInboxRaw),
  },
  {
    title: "B3 · Top-bar analytics",
    description: "Few sections, deep content: navigation moves to a Large Indicator Tab-Bar in the AppShell top bar so the page gets the full width for numbers. Boxes are Pale on white with no shadow; the one number that matters is a Solid Hero Metric-Card, one per row. The header's title row carries the Heading/1 title, the Segmented period control and the actions."
      + fits("AppShell/Desktop · Layout=Top-Bar", ["Fintech / Banking", "Trading", "BI dashboards", "Monitoring"]),
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><AnalyticsApp /></PreviewAppFrame>,
    code: exampleCode(analyticsRaw),
  },
  {
    title: "B4 · Workspace editor",
    description: "A tool where the content is the canvas. A compact top bar, then the layers and the inspector in two equal Border panes at the sides (no shadow) on the flat white canvas; the work area between them is the one Pale field, so the artboard reads as the object. Body/Small labels, Inline-Field rows in the inspector. Shell: AppShell/Desktop · Layout=Workspace. Fits: Design / site builders, Document & slide editors, IDE / data tools, Form & workflow builders.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={screenHeight}><WorkspaceEditorApp /></PreviewAppFrame>,
    code: exampleCode(workspaceEditorRaw),
  },
  {
    title: "B5 · Docs / learning",
    description: "Reading is the job, so type does the layout: a 720px column under a breadcrumb row, Display/3 title, Body/Extra lead, Heading/3 sections and a Body/Code block. The docs navigation and the “On this page” list sit in two equal Canvas panes (no box), and the only tinted surfaces are Pale callouts and code. Shell: AppShell/Desktop · Layout=Docs. Fits: Docs / Help centre, Knowledge base, Courses / LMS, Blog / News.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={screenHeight}><DocsApp /></PreviewAppFrame>,
    code: exampleCode(docsRaw),
  },
  {
    title: "B6 · Focus flow",
    description: "One task, no way to wander: the app navigation disappears, a Stepper under the top bar shows where you are and “Save & exit” is the only way out. The form floats as a Shadow card in the column and the summary as a Shadow pane beside it on the grey canvas; the primary action sits at the end of the form, never in the bar. Shell: AppShell/Desktop · Layout=Focus. Fits: Checkout, Onboarding / KYC, Applications (loan, insurance), Booking.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={screenHeight}><FocusFlowApp /></PreviewAppFrame>,
    code: exampleCode(focusFlowRaw),
  },
  {
    title: "G1 · Grid",
    description: "Layout=Grid draws the Sidebar workspace in lines instead of surfaces: the Sidebar sits flush on the grey Canvas with a Pale line on its edge and 36px rows (Theme=Border, Density=Small), and the header's top row has a Pale line under it (Theme=Border & Divider). The boxes are Flat Cards and the table sits on the page; keep Subtle for a metric card that should stand out. Shell: AppShell/Desktop · Layout=Grid · Collapse=Header. Fits: Team analytics, HR, Ops, Admin.",
    wide: true,
    screen: true,
    render: () => <KpiRowFrame app={TeamPerformance} />,
    code: exampleCode(teamPerformanceRaw),
  },
  {
    title: "G2 · Grid, a level inside the app",
    description: "While the Sidebar shows a level inside the app, a Sidebar sub-header leads its rows: the back control over the level's title (Primitives/Sub-Header-Sidebar, Density=Small in the Grid). Back returns to the app's main menu, where Time off leads into the level again; the breadcrumb's Home and Time off do the same. The page keeps the Grid's Flat metric cards and the table on the Canvas. Shell: AppShell/Desktop · Layout=Grid. Fits: HR, Projects inside a workspace, Settings areas.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><TimeOff /></PreviewAppFrame>,
    code: exampleCode(timeOffRaw),
  },
]);
