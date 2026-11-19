/* Tooltip examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: a photo
   review toolbar, an invoice's payment link, the activity feed, files shared with a client and a client's brand film. On a
   phone a tooltip never opens on touch, so the phone example shows one open from the start with its close X (Figma
   Close=Yes, user 2026-10-07).
   Each example is its own file in tooltip/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PhotoReview from "./tooltip/shortcut-hints.example";
import photoReview from "./tooltip/shortcut-hints.example.tsx?raw";
import PaymentLink from "./tooltip/copy-confirmation.example";
import paymentLink from "./tooltip/copy-confirmation.example.tsx?raw";
import ActivityTimes from "./tooltip/exact-time.example";
import activityTimes from "./tooltip/exact-time.example.tsx?raw";
import LongFileNames from "./tooltip/long-file-names.example";
import longFileNames from "./tooltip/long-file-names.example.tsx?raw";
import BrandFilm from "./tooltip/controls-on-video.example";
import brandFilm from "./tooltip/controls-on-video.example.tsx?raw";
import ScanTip from "./tooltip/a-tip-on-a-phone.example";
import scanTip from "./tooltip/a-tip-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "tooltip";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Shortcut hints",
    description: "An explicit Tooltip adds the keyboard shortcut to an icon-only button's name; Download keeps the IconButton's own name tooltip. Tooltips open after 1 s of hover, at once on keyboard focus, and the next button along opens without waiting.",
    render: () => <PhotoReview />,
    code: exampleCode(photoReview),
  },
  {
    title: "Copy confirmation",
    description: "After Copy link the tooltip is held open for 1.5 s in Accent and says what happened, then goes back to hover and focus. A hidden status line announces the same words to screen readers.",
    render: () => <PaymentLink />,
    code: exampleCode(paymentLink),
  },
  {
    title: "Exact time",
    description: "Activity shows relative times that stay short; the tooltip on each time gives the full date and time. The time is a permalink, so keyboard users reach it, and it opens the item it belongs to.",
    render: () => <ActivityTimes />,
    code: exampleCode(activityTimes),
  },
  {
    title: "Long file names",
    description: "A file name that doesn't fit ends in an ellipsis, and only then gets a tooltip with the whole name, on hover and on keyboard focus. Short names get no tooltip, because it would only repeat them.",
    render: () => <LongFileNames />,
    code: exampleCode(longFileNames),
  },
  {
    title: "Controls on video",
    description: "Over moving footage the controls and their tooltips use Black-Overlay, so the text reads on any frame. The film waits for Play, and the play button's tooltip follows its state: it names what a press does now, Play while the film is paused and Pause once it plays.",
    render: () => <BrandFilm />,
    code: exampleCode(brandFilm),
  },
  {
    title: "A tip on a phone",
    description: "A tooltip never opens on touch, so on a phone a tip for a new action is open from the start and carries its own close X (closable). It stays until it is closed — a tap elsewhere or on the button does not hide it — and Show tip brings it back.",
    render: () => <PlatformPhoneApp label="Expenses" app={ScanTip} />,
    code: exampleCode(scanTip),
  },
]);
