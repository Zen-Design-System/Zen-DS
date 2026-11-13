/* Divider examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am; the phone receipt is the loyalty app the studio builds for Phin & Co.
   Each example is its own file in divider/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import StudioSettings from "./divider/settings-sections.example";
import studioSettings from "./divider/settings-sections.example.tsx?raw";
import FileToolbar from "./divider/toolbar-groups.example";
import fileToolbar from "./divider/toolbar-groups.example.tsx?raw";
import SignIn from "./divider/labelled-separator.example";
import signIn from "./divider/labelled-separator.example.tsx?raw";
import ProfileCard from "./divider/groups-in-a-card.example";
import profileCard from "./divider/groups-in-a-card.example.tsx?raw";
import MobileReceipt from "./divider/mobile-receipt.example";
import mobileReceipt from "./divider/mobile-receipt.example.tsx?raw";

export const page: PlatformPage = "divider";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Settings sections",
    wide: true,
    screen: true,
    description: "Default dividers split the studio's settings page into its sections, each with a heading and a one-line purpose on the left. The page sits in the studio's AppShell, whose Body pads it, so the form only stops at a readable width; Cancel and Save changes sit under the last divider and wake up once something changes.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><StudioSettings /></PreviewAppFrame>,
    code: exampleCode(studioSettings),
  },
  {
    title: "Toolbar groups",
    description: "Vertical dividers split the zoom, page and file groups of a viewer toolbar, and a horizontal one sets the toolbar off from the page. The vertical ones are decorative because each group already has a name; ← and → move along the toolbar.",
    render: () => <FileToolbar />,
    code: exampleCode(fileToolbar),
  },
  {
    title: "Labelled separator",
    description: "“or” sits between two decorative dividers that share the leftover width, so the word is read once and the lines are skipped.",
    render: () => <SignIn />,
    code: exampleCode(signIn),
  },
  {
    title: "Groups in a card",
    description: "Spacing does most of the grouping; a Default divider goes only between the person, their details and their projects, never at the top or bottom of the card.",
    render: () => <ProfileCard />,
    code: exampleCode(profileCard),
  },
  {
    title: "Mobile receipt",
    description: "A receipt pushed from the Phin & Co app's order history, with Back to the Orders root and Email receipt / Order again in the AppShell's Action bar. Default dividers separate the store, the items and the loyalty stub on one flat slip; the stub hangs under a dashed tear line, which steps up to Subtle by itself. The total's High rule comes from the Description List.",
    render: () => <PlatformPhoneApp label="Phin & Co" app={MobileReceipt} />,
    code: exampleCode(mobileReceipt),
  },
]);
