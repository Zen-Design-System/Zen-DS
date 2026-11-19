/* Accordion examples. Each example is its own file in accordion/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md
   §11): the card renders its default export and shows its text as the snippet. */
import { useLayoutEffect, useState, type ComponentType } from "react";
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import ClientFaq from "./accordion/client-faq.example";
import clientFaqRaw from "./accordion/client-faq.example.tsx?raw";
import HelpSearch from "./accordion/search-help-articles.example";
import helpSearchRaw from "./accordion/search-help-articles.example.tsx?raw";
import LeavePolicy from "./accordion/expand-all-sections.example";
import leavePolicyRaw from "./accordion/expand-all-sections.example.tsx?raw";
import AdvancedOptions from "./accordion/advanced-options.example";
import advancedOptionsRaw from "./accordion/advanced-options.example.tsx?raw";
import ProjectFilters from "./accordion/filter-sections.example";
import projectFiltersRaw from "./accordion/filter-sections.example.tsx?raw";
import LayerSettings from "./accordion/layer-settings.example";
import layerSettingsRaw from "./accordion/layer-settings.example.tsx?raw";
import MobileOrderSummary from "./accordion/mobile-order-summary.example";
import mobileOrderSummaryRaw from "./accordion/mobile-order-summary.example.tsx?raw";

export const page: PlatformPage = "accordion";

/** Below this width the AppShell leaves the Docs pattern for its narrow layout, where the panes stack around the page. */
const DOCS_MIN_WIDTH = 1024;

/**
 * "Expand all sections" in the desktop frame. The frame is narrower than the window (a card in the page, a thumbnail),
 * so the page measures it and tells the example when the shell is narrow, where the chapters step aside.
 */
function DocsFrame({ app: App }: { app: ComponentType<{ narrow?: boolean }> }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    setWidth(frame.offsetWidth);
    const observer = new ResizeObserver(() => setWidth(frame.offsetWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);
  return <PreviewAppFrame height={{ min: 640, max: 820 }} frameRef={setFrame}><App narrow={width > 0 && width < DOCS_MIN_WIDTH} /></PreviewAppFrame>;
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Client FAQ",
    description: "A few standalone questions from the client portal in the Box theme, on a card so the Pale boxes stand out from the page. Each one opens on its own, and the first starts open so the card never looks empty.",
    render: () => <ClientFaq />,
    code: exampleCode(clientFaqRaw),
  },
  {
    title: "Search help articles",
    description: "A Divider list under a Search keeps one article open at a time and opens the best match as you type; when nothing matches, an Empty State offers Clear search.",
    render: () => <HelpSearch />,
    code: exampleCode(helpSearchRaw),
  },
  {
    title: "Expand all sections",
    wide: true,
    screen: true,
    description: "The People handbook in the AppShell's Docs pattern: the chapters in the leading pane, the policy in the reading column, On this page and the reader's own balance in the trailing pane. The sections sit right under the page h1, so they are headingLevel 2 in the Large size; Expand all opens every section at once and turns into Collapse all, and a link in On this page opens its section and moves focus to it. In a narrow window the chapters step aside, and on a phone the trail turns into Back to Time off.",
    render: () => <DocsFrame app={LeavePolicy} />,
    code: exampleCode(leavePolicyRaw),
  },
  {
    title: "Advanced options",
    description: "Optional fields fold away under Advanced options while the Create button stays outside. If a field inside has an error on submit, the section opens and the field takes focus.",
    render: () => <AdvancedOptions />,
    code: exampleCode(advancedOptionsRaw),
  },
  {
    title: "Filter sections",
    description: "Each facet of a filter panel is its own Accordion, so people open only the ones they need. The title carries a count of the picks, so a closed section still shows it is filtering, and the primary action shows how many projects will remain.",
    render: () => <ProjectFilters />,
    code: exampleCode(projectFiltersRaw),
  },
  {
    title: "Layer settings",
    description: "Small (size=\"sm\") is for dense panels and cards: its Body/Base/Bold titles sit under the panel heading and group short rows of inline fields and sliders. Size and Fill start open; Corners and blur, used less, waits closed.",
    render: () => <LayerSettings />,
    code: exampleCode(layerSettingsRaw),
  },
  {
    title: "Mobile order summary",
    description: "Checkout opens from the cart with a Back chevron. The order sits in a Box accordion at the top, open while the customer checks it: the cart's rows with their options, then Subtotal, the points (when the cart's Toggle uses them) and Total, with the prices running to the box edge (contentWidth=\"full\"). Folded, the total moves into the title and stays on Place order, so nothing they pay for is hidden. After the order the same summary waits folded under the order's progress, and Done goes back to the cart. Each screen is the AppShell's mobile Bar with the Action bar (Figma Bottom=Actions).",
    render: () => <PlatformPhoneApp label="Phin & Co" canvas="surface" app={MobileOrderSummary} />,
    code: exampleCode(mobileOrderSummaryRaw),
  },
]);
