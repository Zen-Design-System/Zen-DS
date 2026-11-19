/* Card examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Card decision: a clickable card opens one thing, header
   actions live in the Sub-Action, a card keeps its frame while its body loads, Active marks the current plan, a Border
   card frames a group of settings, and selectable cards on a phone.
   Each example is its own file in card/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import type { ReactNode } from "react";
import { Stack } from "../../../components/Layout";
import { useZen } from "../../../components/Provider";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import BrowseProjects from "./card/browse-projects.example";
import browseProjects from "./card/browse-projects.example.tsx?raw";
import InvoiceSide from "./card/card-header-actions.example";
import cardHeaderActions from "./card/card-header-actions.example.tsx?raw";
import PhoneOrderType from "./card/choose-on-a-phone.example";
import chooseOnAPhone from "./card/choose-on-a-phone.example.tsx?raw";
import WorkspacePlan from "./card/workspace-plan.example";
import workspacePlan from "./card/workspace-plan.example.tsx?raw";
import NotificationSettings from "./card/settings-section.example";
import settingsSection from "./card/settings-section.example.tsx?raw";
import DueThisWeek from "./card/refresh-a-card.example";
import refreshACard from "./card/refresh-a-card.example.tsx?raw";
import QuarterWidgets from "./card/one-widget-stands-out.example";
import oneWidgetStandsOut from "./card/one-widget-stands-out.example.tsx?raw";
import PhoneProjectColours from "./card/colour-by-project.example";
import colourByProject from "./card/colour-by-project.example.tsx?raw";
import GreyCanvasProjects from "./card/colour-on-the-grey-canvas.example";
import colourOnTheGreyCanvas from "./card/colour-on-the-grey-canvas.example.tsx?raw";
import PayrollStandOut from "./card/stand-out-in-a-hue.example";
import standOutInAHue from "./card/stand-out-in-a-hue.example.tsx?raw";
import DarkRevenueCard from "./card/dark-chart-card.example";
import darkChartCard from "./card/dark-chart-card.example.tsx?raw";

export const page: PlatformPage = "card";

/** Docs frame, not part of the snippet: the Canvas/Flat settings page the example stands on (platform.css .pe-shell
 *  paints it; in an app, AppShell canvas="flat"). The page margin around it; on a phone it fills the card, no corners. */
function FlatPage({ children }: { children: ReactNode }) {
  const phone = useZen()?.breakpoint === "mobile";
  return <Stack className="pe-shell" data-canvas="flat" gap="none" padding={phone ? "md" : "2xl"} radius={phone ? "none" : "xl"}>{children}</Stack>;
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Browse projects",
    wide: true,
    description: "Each project is one clickable Border card: the whole card opens the project in a Side Panel, so it holds no buttons of its own. Status and lead filter the grid, and an empty result offers Clear filters.",
    render: () => <BrowseProjects />,
    code: exampleCode(browseProjects),
  },
  {
    title: "Card header actions",
    description: "A card's header action is its Sub-Action: one flat icon button with a tooltip, or a ⋯ Menu when there are several. The action that moves the task on, Mark as paid, sits at the bottom of the card, not in the header.",
    render: () => <InvoiceSide />,
    code: exampleCode(cardHeaderActions),
  },
  {
    title: "Choose on a phone",
    description: "At checkout in the Phin & Co app, each order type is a selectable card: the whole card is the target, Active and aria-pressed mark the choice, and the footer total follows it. Back returns to the cart; Place order opens the confirmation.",
    render: () => <PlatformPhoneApp label="Checkout" app={PhoneOrderType} />,
    code: exampleCode(chooseOnAPhone),
  },
  {
    title: "Workspace plan",
    wide: true,
    description: "Plans are flat cards side by side on the canvas: Active marks the plan you are on and an Accent Badge the one that fits your team. Each card ends with one CTA that says what happens; a smaller plan asks first, because members lose access.",
    render: () => <WorkspacePlan />,
    code: exampleCode(workspacePlan),
  },
  {
    title: "Settings section",
    wide: true,
    description: "A settings page puts the section title and one line about it on the left and a card of related toggles on the right; on a phone they stack. On a Canvas/Flat page the card is Flat-Border: Surface/Flat inside a Pale frame (theme=\"flat-border\"). Toggles apply at once, and the toast can undo the change.",
    render: () => <FlatPage><NotificationSettings /></FlatPage>,
    code: exampleCode(settingsSection),
  },
  {
    title: "Refresh a card",
    description: "Refresh is the card's Sub-Action. While the list reloads, the card keeps its title and size and shows Skeleton rows in place of the tasks; the status line then says when it was updated.",
    render: () => <DueThisWeek />,
    code: exampleCode(refreshACard),
  },
  {
    title: "One widget stands out",
    wide: true,
    description: "Widgets in a row share one theme (Flat on Canvas/Default) and at most one stands out with theme=\"solid\". Solid Neutral is the dark widget: its text, chart and ⋮ read Content/Inverse by themselves, and its button and trend badge take the Inverse level (theme/on-solid-content).",
    render: () => <QuarterWidgets />,
    code: exampleCode(oneWidgetStandsOut),
  },
  {
    title: "Colour by project",
    description: "On a white Canvas/Alt screen, colour on a box is Pale: each project card takes its project's hue with theme=\"pale\" and color, and keeps neutral text, so any of the nine hues reads the same.",
    render: () => <PlatformPhoneApp label="Projects" canvas="surface" app={PhoneProjectColours} />,
    code: exampleCode(colourByProject),
  },
  {
    title: "Colour on the grey canvas",
    description: "On the grey Canvas/Default a Pale tint fades into the page, so colour on a box is Subtle: theme=\"subtle\" with the project's color (Support/<Color>/Subtle), neutral text, any of the nine hues. Pale stays for white pages.",
    render: () => <GreyCanvasProjects />,
    code: exampleCode(colourOnTheGreyCanvas),
  },
  {
    title: "Stand out in a hue",
    description: "A time-sensitive widget can stand out in a hue instead: on Solid Yellow the text reads Content/On-Brights by itself (content follows the fill; Brand, Cyan and Orange read white On-Colors) and the button stays a neutral Primary. Approving updates the status line and offers Undo.",
    render: () => <PayrollStandOut />,
    code: exampleCode(standOutInAHue),
  },
  {
    title: "Dark chart card",
    description: "ChartCard and MetricCard pass theme and color to their Card: a Solid Neutral chart card draws its title, figure, axes and grid in Content/Inverse, and the range switch and open button keep their own fills.",
    render: () => <DarkRevenueCard />,
    code: exampleCode(darkChartCard),
  },
]);
