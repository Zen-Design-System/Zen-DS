/* Action Bar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Each example teaches one Action Bar
   decision: on a phone one main action leads (vertical, Primary on top) and says why it waits; a pair people choose
   between sits side by side (horizontal); a desktop edit page keeps Undo changes · Save changes in a sticky bar with
   the unsaved count; and a running total rides in the summary, on the screen's own surface. The phones are apps the
   studio builds: the Phin & Co loyalty app and Đìzai Studio's own Zen app (signed in as Alex Duong, Design Lead,
   Wednesday Sep 30, 2026, 10:30 am).
   Each example is its own file in action-bar/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export (inside the phone or the desktop frame) and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PhoneRewards from "./action-bar/footer-on-a-phone.example";
import footerOnAPhone from "./action-bar/footer-on-a-phone.example.tsx?raw";
import PhoneApprovals from "./action-bar/two-choices-on-a-phone.example";
import twoChoicesOnAPhone from "./action-bar/two-choices-on-a-phone.example.tsx?raw";
import UnsavedChanges from "./action-bar/unsaved-changes.example";
import unsavedChanges from "./action-bar/unsaved-changes.example.tsx?raw";
import PhoneOrder from "./action-bar/running-total.example";
import runningTotal from "./action-bar/running-total.example.tsx?raw";

export const page: PlatformPage = "action-bar";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Footer on a phone",
    description: "In the Phin & Co app a reward's main action leads the Action bar the shell pins to the bottom (actionBar): Large, full width, Primary on top, Save for later below. The summary says what Redeem depends on, and why it waits when it is disabled. Back returns to the rewards, a tab root with the points card, the rewards grouped by what the points buy now, and the app's tab bar.",
    render: () => <PlatformPhoneApp label="Rewards" app={PhoneRewards} />,
    code: exampleCode(footerOnAPhone),
  },
  {
    title: "Two choices on a phone",
    description: "Approve and Decline are peers, so the bar is horizontal: two Large buttons side by side with Approve at the end, and the summary on its own row. The request opens as a Band-Sheet, the person over the brand band and the facts on the sheet. Either answer can be undone from the toast; once answered, the bar goes away, and the Approvals root sorts the request under Answered.",
    render: () => <PlatformPhoneApp label="Approvals" app={PhoneApprovals} />,
    code: exampleCode(twoChoicesOnAPhone),
  },
  {
    title: "Unsaved changes",
    description: "A desktop edit page in the studio app keeps its actions in a sticky bar at the end of the page: the unsaved count at the start, Undo changes · Save changes at the end. The bar is the form's last child in the shell's Body, so it stays at the bottom of the window while the form scrolls. With nothing changed both wait and the summary says why; under 480px the buttons split a row of their own.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 720 }}><UnsavedChanges /></PreviewAppFrame>,
    code: exampleCode(unsavedChanges),
  },
  {
    title: "Running total",
    description: "The order's total rides in the summary and follows every + and −, so the Place order label stays short. On a Surface-Alt screen the bar takes surface=\"alt\"; when the last item goes, so does the bar, and the empty state brings the order back. Place order opens the confirmation with what was ordered and when it is ready.",
    render: () => <PlatformPhoneApp label="Order" canvas="alt" app={PhoneOrder} />,
    code: exampleCode(runningTotal),
  },
]);
