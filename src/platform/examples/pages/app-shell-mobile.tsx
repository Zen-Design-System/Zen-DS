/* App Shell › Mobile layouts (Figma section C of ◇ Master-Layout · Example, 15921:7244), one docs page of finished apps
   (examples/appShellLayouts.ts). Each example is its own file in app-shell-mobile/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export, a phone app on the device,
   and shows its text as the snippet. */
import { PlatformPhone, PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import LearningHubPhone from "./app-shell-mobile/c1-tab-bar-hub.example";
import c1TabBarHub from "./app-shell-mobile/c1-tab-bar-hub.example.tsx?raw";
import HeroWalletPhone from "./app-shell-mobile/c2-hero-wallet.example";
import c2HeroWallet from "./app-shell-mobile/c2-hero-wallet.example.tsx?raw";
import FeedPhone from "./app-shell-mobile/c3-feed.example";
import c3Feed from "./app-shell-mobile/c3-feed.example.tsx?raw";
import MediaSheetPhone from "./app-shell-mobile/c4-media-bottom-sheet.example";
import c4MediaBottomSheet from "./app-shell-mobile/c4-media-bottom-sheet.example.tsx?raw";
import OrderDetailPhone from "./app-shell-mobile/c5-stack-detail-with-action-bar.example";
import c5StackDetailWithActionBar from "./app-shell-mobile/c5-stack-detail-with-action-bar.example.tsx?raw";
import IdentityStepPhone from "./app-shell-mobile/c6-focus-flow.example";
import c6FocusFlow from "./app-shell-mobile/c6-focus-flow.example.tsx?raw";
import GreetingHomePhone from "./app-shell-mobile/c7-greeting-home.example";
import c7GreetingHome from "./app-shell-mobile/c7-greeting-home.example.tsx?raw";

export const page: PlatformPage = "app-shell-mobile";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "C1 · Tab-bar hub",
    description: "A home for daily return visits: large title, a \"continue\" card and short lists, with 4–5 destinations in the bottom bar (the bottom bar plays the Sidebar). The bottom bar casts a shadow, so every box floats too (Shadow cards on the grey canvas); the courses list closes the screen, open on the canvas with no box. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Learning, Health, Consumer apps, Travel.",
    render: () => <PlatformPhoneApp label="Learning app" canvas="default" app={LearningHubPhone} />,
    code: exampleCode(c1TabBarHub),
  },
  {
    title: "C2 · Hero wallet",
    description: "The number the user opens the app for sits in a Solid Neutral hero (Inverse content, Inverse buttons); quick actions follow as Surface icon buttons, then the transactions close the screen as an open list on the canvas (Figma ◆ Finance). A floating bottom bar keeps a central CTA (scan / pay). Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: Fintech / Wallet, Loyalty, Logistics, Telco.",
    render: () => <PlatformPhoneApp label="Wallet app" canvas="default" app={HeroWalletPhone} />,
    code: exampleCode(c2HeroWallet),
  },
  {
    title: "C3 · Feed",
    description: "Content first, chrome last: a compact top bar with Tab-Bar filters in its Control-Bar, posts separated by hairlines instead of cards, full-width media, and a Floating-Glass bottom bar that lets the feed scroll beneath it. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: Social / Community, News / Media, Marketplace, Video / Music.",
    render: () => <PlatformPhoneApp label="Kicks app" canvas="surface" app={FeedPhone} />,
    code: exampleCode(c3Feed),
  },
  {
    title: "C4 · Media + bottom sheet",
    description: "The place is the content: a full-bleed photo (or a live map) is the backdrop, Liquid-Glass actions float on it, and a Surface sheet rises over it with the title, highlights and facts; the booking actions sit in the Action-Bar below. The sheet is the only surface; no cards inside it. Shell: AppShell/Mobile · Phone · Top=Media · Bottom=Actions. Fits: Travel / Booking, Real estate, Delivery tracking, Ride / Maps.",
    // The bar over the photo is not pinned, so the app takes no scrollRef; the status bar turns light over the photo.
    render: () => <PlatformPhone label="Tours app" canvas="surface" statusBar="light"><MediaSheetPhone /></PlatformPhone>,
    code: exampleCode(c4MediaBottomSheet),
  },
  {
    title: "C5 · Stack detail with Action bar",
    description: "One record pushed from a list: back, title and more in the top bar, the key number large, Segmented sections, Pale groups on white, and the Action-Bar for the next step. The phone form of B2 (and of the Sidebar workspace on mobile). Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Actions. Fits: Orders / Admin, CRM records, Tickets, HR requests.",
    render: () => <PlatformPhoneApp label="Orders app" canvas="alt" app={OrderDetailPhone} />,
    code: exampleCode(c5StackDetailWithActionBar),
  },
  {
    title: "C6 · Focus flow",
    description: "One question set per screen: close instead of back, progress in the Control-Bar, a Heading/1 question with a short reason, fields straight on the white canvas (no card), and one full-width primary action in the Action-Bar above the home indicator. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Actions. Fits: Onboarding / KYC, Checkout, Sign-up, Applications.",
    render: () => <PlatformPhoneApp label="Verify identity" canvas="alt" app={IdentityStepPhone} />,
    code: exampleCode(c6FocusFlow),
  },
  {
    title: "C7 · Greeting home",
    description: "A personal home that opens on the person: the account avatar in Top-Leading, the bell (with its dot) in Top-Trailing, no bar title, and a large H1 greeting in Expand-Heading. Below it the day in short: one \"up next\" card, two numbers and a short list, flat on the grey canvas, under a Liquid-Glass header and a Floating-Glass bar. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: Personal banking, Health / Habits, Productivity, Smart home.",
    render: () => <PlatformPhoneApp label="Personal home" canvas="default" app={GreetingHomePhone} />,
    code: exampleCode(c7GreetingHome),
  },
]);
