/* App Shell examples. First the Figma page ◇ Master-Layout · Example (15902:109717): section A (the four compositions)
   here; sections B–G have a page each since 2026-11-02 (examples/appShellLayouts.ts, user: "cân nhắc tách example
   appshell ra page riêng cho đỡ nặng"). Built screen by screen (user, 2026-10-19: "Các example Appshell nên build như
   trong Figma ◇ Master-Layout · Example"). Then the shell's behaviours with Đìzai Studio's own apps, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am: the toggle in the Sidebar beside a Master crumb, the docked task panel, the
   sticky selection bar, the banner, the narrow window (drawer) and the studio app on an iPad held upright.
   Each example is its own file in app-shell/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export in the docs' app frame (or on the iPad) and shows its text as the snippet. */
import { useLayoutEffect, useState, type ComponentType } from "react";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame } from "../../PlatformFrames";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import WorkspaceFloating from "./app-shell/a1-floating.example";
import workspaceFloating from "./app-shell/a1-floating.example.tsx?raw";
import WorkspaceTiles from "./app-shell/a2-tiles.example";
import workspaceTiles from "./app-shell/a2-tiles.example.tsx?raw";
import WorkspaceOpen from "./app-shell/a3-open.example";
import workspaceOpen from "./app-shell/a3-open.example.tsx?raw";
import WorkspaceHairline from "./app-shell/a4-hairline.example";
import workspaceHairline from "./app-shell/a4-hairline.example.tsx?raw";
import PeopleDirectory from "./app-shell/toggle-in-the-sidebar.example";
import peopleDirectory from "./app-shell/toggle-in-the-sidebar.example.tsx?raw";
import TaskWorkbench from "./app-shell/task-panel.example";
import taskWorkbench from "./app-shell/task-panel.example.tsx?raw";
import FilesWithSelectionBar from "./app-shell/selection-bar.example";
import filesWithSelectionBar from "./app-shell/selection-bar.example.tsx?raw";
import StudioWithNotice from "./app-shell/banner-above-the-shell.example";
import studioWithNotice from "./app-shell/banner-above-the-shell.example.tsx?raw";
import StudioInANarrowWindow from "./app-shell/narrow-window.example";
import studioInANarrowWindow from "./app-shell/narrow-window.example.tsx?raw";
import StudioOnAnIpad from "./app-shell/ipad-held-upright.example";
import studioOnAnIpad from "./app-shell/ipad-held-upright.example.tsx?raw";

export const page: PlatformPage = "app-shell";

/** Under this width inside, the page beside the Sidebar lays the compositions' four KPI cards out two a row. */
const KPI_ROW_MIN_WIDTH = 1040;

/**
 * A composition in its desktop frame. Its KPI row picks four or two columns by the width of the page beside the
 * Sidebar, and in the docs that page is narrower than the window (a card in the page, full screen, the Sidebar collapsed
 * or not): the page measures the shell's Body and tells the example.
 */
function CompositionFrame({ app: App }: { app: ComponentType<{ narrowKpis?: boolean }> }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    // The app inside may render after the frame mounts: watch for the shell's Body, then measure it (its content box).
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
  // Until the Body is measured the example decides by the breakpoint.
  return <PreviewAppFrame frameRef={setFrame}><App narrowKpis={width > 0 ? width < KPI_ROW_MIN_WIDTH : undefined} /></PreviewAppFrame>;
}

/** Section A of Figma ◇ Master-Layout · Example (15902:109717), the background compositions (A · Background compositions —
 *  Sidebar workspace, 15904:1615): one Sidebar workspace whose screens share every text, row and component; only the
 *  Canvas, the Sidebar's panel and the boxes' Card theme change. Sections B–G (desktop, mobile, expressive, consumer,
 *  smart home, grid) are on their own pages (examples/appShellLayouts.ts). */
const shell = "Shell: AppShell/Desktop · Layout=Sidebar · Collapse=Sidebar; Sidebar and header Density=Small.";
const figmaExamples: ExampleDef[] = [
  {
    title: "A1 · Floating",
    description: `Grey Canvas/Default. The Sidebar and every box float as white Surface/Default with Shadow/Bottom/Level-1. Soft and friendly: each box reads as an object you can pick up. ${shell} Fits: SaaS workspace, HR, CRM, Project tools.`,
    wide: true,
    screen: true,
    render: () => <CompositionFrame app={WorkspaceFloating} />,
    code: exampleCode(workspaceFloating),
  },
  {
    title: "A2 · Tiles",
    description: `Same grey canvas, but boxes are flat white tiles and the Sidebar panel has no shadow. Quieter and denser: contrast comes only from the canvas step, so many boxes stay calm. ${shell} Fits: Analytics, Admin console, Back-office, Ops.`,
    wide: true,
    screen: true,
    render: () => <CompositionFrame app={WorkspaceTiles} />,
    code: exampleCode(workspaceTiles),
  },
  {
    title: "A3 · Open",
    description: `White Canvas/Alt. Boxes are tinted Pale fills, one hue per metric family, with no shadow and no border. Airy and colour-coded: the hue carries the meaning. ${shell} Fits: Education, Health, Consumer SaaS, Personal finance.`,
    wide: true,
    screen: true,
    render: () => <CompositionFrame app={WorkspaceOpen} />,
    code: exampleCode(workspaceOpen),
  },
  {
    title: "A4 · Hairline",
    description: `White Canvas/Alt. Boxes are Surface/Default with a 1px Border and no shadow; the Sidebar sits on the canvas. Structure comes from lines, not depth: precise and print-like, it holds dense numbers and tables well. ${shell} Fits: Fintech, Enterprise, Dev tools, Gov / Legal.`,
    wide: true,
    screen: true,
    render: () => <CompositionFrame app={WorkspaceHairline} />,
    code: exampleCode(workspaceHairline),
  },
];

/** What the shell does beyond the Figma screens: the toggle in the Sidebar, the docked panel, the narrow window, the banner. */
const behaviourExamples: ExampleDef[] = [
  {
    title: "Toggle in the Sidebar",
    description: "The people directory's trail starts with the workspace's Master crumb and its home icon, so the collapse toggle moves into the Sidebar's own header (collapse=\"sidebar\"): two icons at the start of the header read as one control. The Search sits in the middle of the top row (up to 400px) and finds people from any page. On a white Canvas the Sidebar is Surface-alt and cards take a Pale border.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><PeopleDirectory /></PreviewAppFrame>,
    code: exampleCode(peopleDirectory),
  },
  {
    title: "Task panel",
    description: "A row opens its task in the side panel, a standard Side Panel. It docks beside the page only while the page keeps a tablet width (744px) next to it; in a narrower window it opens as a modal panel. Mark as done updates the row and the counters, with Undo in the toast. The flat Canvas pairs with a flat Sidebar, and with no top row the collapse toggle is in the Sidebar.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><TaskWorkbench /></PreviewAppFrame>,
    code: exampleCode(taskWorkbench),
  },
  {
    title: "Selection bar",
    description: "Selecting files brings up an ActionBar that sticks to the bottom of the page with the count, Clear selection and Download, and leaves when nothing is selected.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><FilesWithSelectionBar /></PreviewAppFrame>,
    code: exampleCode(filesWithSelectionBar),
  },
  {
    title: "Banner above the shell",
    description: "The banner holds a workspace-wide AlertBanner above the whole shell: it stays in view on every page and while the page scrolls, and the sticky Sidebar and header sit under it. Dismissing it hides it on every page, with Undo in the toast.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><StudioWithNotice /></PreviewAppFrame>,
    code: exampleCode(studioWithNotice),
  },
  {
    title: "Narrow window",
    description: "The studio app in a window narrower than 1024px with no phone parts: the header puts a menu button where the toggle was and the Sidebar opens as a modal drawer. Focus moves to the current page, Tab stays inside, and Close, Escape or the scrim close it; picking a page closes it and moves focus to the page.",
    wide: true,
    // The docs draw a browser window 900px wide around the app.
    render: () => <PreviewAppFrame windowWidth={900}><StudioInANarrowWindow /></PreviewAppFrame>,
    code: exampleCode(studioInANarrowWindow),
  },
  {
    title: "iPad held upright",
    description: "The same AppShell on an iPad held upright: narrower than 1024, it draws its mobile parts (Bar and Tab-Bar) instead of the Sidebar and the header; turned sideways it draws the desktop pattern. The Sidebar stays reachable as the drawer.",
    render: () => <PlatformPhoneApp device="ipad" label="Zen app on iPad" canvas="alt" app={StudioOnAnIpad} />,
    code: exampleCode(studioOnAnIpad),
  },
];

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [...figmaExamples, ...behaviourExamples]);
