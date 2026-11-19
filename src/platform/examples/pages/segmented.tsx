/* Segmented examples: Đìzai Studio's files, reports, comments and billing, and two of its phone apps.
   Each example is its own file in segmented/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import GridOrListView from "./segmented/grid-or-list-view.example";
import gridOrListView from "./segmented/grid-or-list-view.example.tsx?raw";
import ReportPeriod from "./segmented/report-period.example";
import reportPeriod from "./segmented/report-period.example.tsx?raw";
import OnAColourBand from "./segmented/on-a-colour-band.example";
import onAColourBand from "./segmented/on-a-colour-band.example.tsx?raw";
import OpenAndResolved from "./segmented/open-and-resolved.example";
import openAndResolved from "./segmented/open-and-resolved.example.tsx?raw";
import BillingPeriod from "./segmented/billing-period.example";
import billingPeriod from "./segmented/billing-period.example.tsx?raw";
import ControlBarOnAPhone from "./segmented/control-bar-on-a-phone.example";
import controlBarOnAPhone from "./segmented/control-bar-on-a-phone.example.tsx?raw";
import PeriodsOnAPhone from "./segmented/periods-on-a-phone.example";
import periodsOnAPhone from "./segmented/periods-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "segmented";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Grid or list view",
    description: "Two icon-only segments switch the same files between previews and rows. Each option carries its own aria-label (the icon is decorative), so a screen reader hears “Grid view, pressed”; Tab reaches each segment and Enter or Space picks it.",
    wide: true,
    render: () => <GridOrListView />,
    code: exampleCode(gridOrListView),
  },
  {
    title: "Report period",
    description: "One Secondary switch changes the period of every metric in the strip. On a wide page it hugs its three labels, and the range line under the title announces the new period.",
    wide: true,
    render: () => <ReportPeriod />,
    code: exampleCode(reportPeriod),
  },
  {
    title: "On a colour band",
    description: "On a colour band or a photo the switch takes an overlay level: black-overlay (the default, also level=\"overlay\"), a dark track with light text, or white-overlay on a solid colour, a light track with dark text (On-White-Overlay Light, Strongest on hover and focus). The selected segment is white with dark text. These tokens do not switch with the mode, like the band under them, so the control looks the same in light and dark mode.",
    render: () => <OnAColourBand />,
    code: exampleCode(onAColourBand),
  },
  {
    title: "Open and resolved",
    description: "Each segment counts its comments, and a counter disappears at zero. In a narrow panel the switch fills the width; resolving the last open comment leaves an empty state with a way to the resolved ones.",
    render: () => <OpenAndResolved />,
    code: exampleCode(openAndResolved),
  },
  {
    title: "Billing period",
    description: "Secondary keeps the switch calm beside the form's Primary submit: it only previews the price; the form's submit, Switch to yearly, commits it and a Toast offers Undo, while Cancel goes back to the current period.",
    render: () => <BillingPeriod />,
    code: exampleCode(billingPeriod),
  },
  {
    title: "Control bar on a phone",
    description: "Under a phone's large title, the switch sits in the Top Navigation control bar and fills it, so People and Teams share the width equally and never slide. It stays pinned while the title folds away.",
    render: () => <PlatformPhoneApp label="Team" app={ControlBarOnAPhone} />,
    code: exampleCode(controlBarOnAPhone),
  },
  {
    title: "Periods on a phone",
    description: "Four periods are wider than a phone, so they are not a Segmented: a row of Normal chips scrolls sideways, and only one is on, so the chips are Primary: the pressed one takes the Selected fill. The total and the logged days follow the choice.",
    render: () => <PlatformPhoneApp label="Hours" app={PeriodsOnAPhone} />,
    code: exampleCode(periodsOnAPhone),
  },
]);
