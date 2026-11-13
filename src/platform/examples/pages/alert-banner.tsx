/* Alert Banner examples: page- and app-level conditions in Đìzai Studio's Zen workspace (brief:
   docs/research/example-rebuild-brief-2026-09-30.md; rebuilt on the new AppShell 2026-10-19). A banner says what is
   wrong with the whole page or app and how to fix it; the result of a single action is a Toast, and a message about one
   section is an Inline Message. On a desktop screen the banner sits in the AppShell's `banner` slot, above the whole
   shell (Pattern/AppShell/Desktop, Layout=Sidebar), so it stays in view while the page scrolls; on a phone it is the
   Top Navigation's `banner`, pinned under the bar (component-usage-rules §17). Each example is its own file in
   alert-banner/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export,
   in the page's desktop window or phone, and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PaymentFailed from "./alert-banner/payment-failed.example";
import paymentFailedRaw from "./alert-banner/payment-failed.example.tsx?raw";
import OneBanner from "./alert-banner/one-banner-at-a-time.example";
import oneBannerRaw from "./alert-banner/one-banner-at-a-time.example.tsx?raw";
import ArchivedProject from "./alert-banner/archived-project.example";
import archivedProjectRaw from "./alert-banner/archived-project.example.tsx?raw";
import OfflinePhone from "./alert-banner/offline-on-a-phone.example";
import offlinePhoneRaw from "./alert-banner/offline-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "alert-banner";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Payment failed",
    description: "A failed payment affects the whole workspace, so the banner sits in the AppShell’s banner slot, above the Sidebar and the header, and stays on every page. It has no close button: its action opens Billing with focus on the payment, and it leaves once the payment goes through.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><PaymentFailed /></PreviewAppFrame>,
    code: exampleCode(paymentFailedRaw),
  },
  {
    title: "One banner at a time",
    description: "Three conditions are open, but the shell shows one banner: the most severe first. Fixing Figma brings up the two-step warning, then the maintenance notice, the only one that can be dismissed; Show notice again brings it back.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><OneBanner /></PreviewAppFrame>,
    code: exampleCode(oneBannerRaw),
  },
  {
    title: "Archived project",
    description: "A Default banner explains why the page can’t be edited: the project is archived, so New task and Archive are gone. It shows while that project is open and stays in view as its tasks scroll; Restore project brings editing back at once, and the Toast offers Undo.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 560, max: 760 }}><ArchivedProject /></PreviewAppFrame>,
    code: exampleCode(archivedProjectRaw),
  },
  {
    title: "Offline on a phone",
    description: "On a phone the banner is the Top Navigation’s: a Small banner pinned under the bar reports the connection, Negative while offline, Info while it reconnects, Positive for a moment once back. It is the app’s condition, so it stays on every tab and in view while the tasks scroll and the large title folds; Small banners carry no action, so Sync now lives in the bar.",
    render: () => <PlatformPhoneApp label="Zen app" app={OfflinePhone} />,
    code: exampleCode(offlinePhoneRaw),
  },
]);
