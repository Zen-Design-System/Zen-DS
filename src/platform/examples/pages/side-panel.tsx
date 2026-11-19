/* Side Panel examples (brief: docs/research/example-rebuild-brief-2026-09-30.md; the screens rebuilt on the new
   AppShell 2026-10-19). Đìzai Studio, signed in as Alex Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one
   Side Panel decision: a row opens its record in a Modal panel and Close returns to the row; many filters wait in a
   Small panel that counts the results before you apply them; an edit form asks before it drops changes; a Standard panel
   docks beside a page that stays live (the AppShell's sidePanel, which docks while the page keeps a tablet width beside
   it and opens as a Modal otherwise); a panel keeps its frame while its content loads or fails; and a long title wraps
   while a long body scrolls on its own. The screens are pages of the studio's app (AppShell, the PageHeader as the
   header's Main row). A Side Panel has no phone variant: on a phone the same jobs are a pushed screen or a Bottom Sheet
   (those pages show them).
   Each example is its own file in side-panel/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export (the screens inside the desktop frame) and shows its text as the snippet. */
import { useLayoutEffect, useState, type ComponentType } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame } from "../../PlatformFrames";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PeopleDirectory from "./side-panel/open-a-record.example";
import openARecord from "./side-panel/open-a-record.example.tsx?raw";
import LeaveRequestFilters from "./side-panel/all-filters.example";
import allFilters from "./side-panel/all-filters.example.tsx?raw";
import DockedFileDetails from "./side-panel/docked-beside-the-page.example";
import dockedBesideThePage from "./side-panel/docked-beside-the-page.example.tsx?raw";
import EditProject from "./side-panel/edit-in-a-panel.example";
import editInAPanel from "./side-panel/edit-in-a-panel.example.tsx?raw";
import InvoicePanel from "./side-panel/loading-and-errors.example";
import loadingAndErrors from "./side-panel/loading-and-errors.example.tsx?raw";
import BriefHistory from "./side-panel/long-title-and-history.example";
import longTitleAndHistory from "./side-panel/long-title-and-history.example.tsx?raw";

export const page: PlatformPage = "side-panel";

/** The AppShell docks a Side Panel while the page keeps a tablet width (744) beside it (360): on the Top-Bar screen
 *  (no Sidebar) from 1104 wide. */
const DOCK_MIN_WIDTH = 360 + 744;

/**
 * The docked example in the desktop frame. The frame is narrower than the window (a card in the page, a thumbnail),
 * so the page measures it and the details start open only where the shell docks them; narrower they would open as a
 * Modal on load.
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

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Open a record",
    description: "On the People page a read-only row opens its person in a Modal panel: the whole row is the target, the page waits behind the scrim, and Close, Escape or the scrim put focus back on the row. Headings inside start one level below the panel's h2 title. The Search in the header's top row narrows the table.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><PeopleDirectory /></PreviewAppFrame>,
    code: exampleCode(openARecord),
  },
  {
    title: "All filters",
    description: "The Status chip stays on the page, in the header's Sections row under the title; the other filters wait behind All filters, a chip that opens a Small panel. The primary counts what Apply would show and Clear all empties the draft; the chip counts what is on, and its × clears it.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><LeaveRequestFilters /></PreviewAppFrame>,
    code: exampleCode(allFilters),
  },
  {
    title: "Docked beside the page",
    description: "A Standard panel in the AppShell's sidePanel docks beside the file list without a scrim, so the page stays live: picking another file updates it, and the header's details button shows and hides it. The shell docks it while the page keeps a tablet width beside it (this Top-Bar screen from 1104 wide); narrower, the same panel opens as a Modal and starts closed.",
    wide: true,
    screen: true,
    render: () => <DockingFrame app={DockedFileDetails} />,
    code: exampleCode(dockedBesideThePage),
  },
  {
    title: "Edit in a panel",
    description: "The card's Edit project action opens a form in a Modal panel, one column of fields. Save changes submits it; Close, Cancel, Escape or the scrim with edits open a Dialog first, the one Dialog a panel may open.",
    render: () => <EditProject />,
    code: exampleCode(editInAPanel),
  },
  {
    title: "Loading and errors",
    description: "The panel opens at once with its title and keeps its frame: Skeleton lines while the invoice loads, then the details. When the request fails, a Negative Inline Message says so and Try again loads it again; Send reminder waits until there is something to send.",
    render: () => <InvoicePanel />,
    code: exampleCode(loadingAndErrors),
  },
  {
    title: "Long title and history",
    description: "A brief with a long working title opens in a Modal panel: the title wraps instead of truncating, so the whole name reads. Its 24 changes make the body long, and only the body scrolls: the title, Close and Export history stay in reach. Every brief on the page opens its own history.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><BriefHistory /></PreviewAppFrame>,
    code: exampleCode(longTitleAndHistory),
  },
]);
