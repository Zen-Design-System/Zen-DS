/* Visually Hidden examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as
   Alex Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one use of text that only assistive technology
   reads: a skip link that shows on the first Tab, names for icon-only table columns, words that make repeated buttons
   unique, a status that announces a change shown only visually, unread counts that say what they count on a phone, and
   a heading that names a region sighted people read from the layout. The client portal (AppShell Layout=Top-Bar,
   whose own skip link is the subject) and the phone Inbox sit in the new AppShell (2026-10-19). Each example is its own
   file in visually-hidden/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default
   export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import { PreviewAppFrame } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import SkipLinkPortal from "./visually-hidden/skip-link.example";
import skipLinkPortal from "./visually-hidden/skip-link.example.tsx?raw";
import FilesTable from "./visually-hidden/icon-only-columns.example";
import filesTable from "./visually-hidden/icon-only-columns.example.tsx?raw";
import LeaveApprovals from "./visually-hidden/unique-button-names.example";
import leaveApprovals from "./visually-hidden/unique-button-names.example.tsx?raw";
import SprintPriorities from "./visually-hidden/announce-a-change.example";
import sprintPriorities from "./visually-hidden/announce-a-change.example.tsx?raw";
import PhoneInbox from "./visually-hidden/unread-counts-on-a-phone.example";
import phoneInbox from "./visually-hidden/unread-counts-on-a-phone.example.tsx?raw";
import MonthAtAGlance from "./visually-hidden/hidden-section-heading.example";
import monthAtAGlance from "./visually-hidden/hidden-section-heading.example.tsx?raw";

export const page: PlatformPage = "visually-hidden";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Skip link",
    screen: true,
    description: "Phin & Co's client portal, built on AppShell (Layout=Top-Bar). Its first Tab stop is the shell's skip link, a VisuallyHidden link: hidden until it has focus, then a Surface pill at the top of the page that jumps past the brand and the navigation to the main content. AppShell adds one for you; a page built without it adds its own, as the note at the end of the code shows.",
    render: () => <PreviewAppFrame height={{ min: 600, max: 760 }}><SkipLinkPortal /></PreviewAppFrame>,
    code: exampleCode(skipLinkPortal),
  },
  {
    title: "Icon-only columns",
    wide: true,
    description: "The star and archive columns show no header text, so a hidden header names them: screen readers announce “Starred” and “Actions” with every cell. Each button still names its own row; Archive removes the row and the toast can undo it. On a narrow screen the table scrolls sideways to Archive.",
    render: () => <FilesTable />,
    code: exampleCode(filesTable),
  },
  {
    title: "Unique button names",
    description: "Every card says Approve and Decline, which a screen reader would read the same way each time. Hidden words, starting with a space, finish the name: “Approve Chi Tran's request”. The visible label stays first, so voice control still finds it.",
    render: () => <LeaveApprovals />,
    code: exampleCode(leaveApprovals),
  },
  {
    title: "Announce a change",
    description: "Move up and Move down only reorder the rows on screen, so a hidden status region says where the task went (“moved to priority 2 of 5”). The region is rendered empty from the start and focus stays on the moved row's button.",
    render: () => <SprintPriorities />,
    code: exampleCode(sprintPriorities),
  },
  {
    title: "Unread counts on a phone",
    description: "A red counter alone reads as a bare “3”. In the studio app's Inbox the counter is hidden from screen readers and hidden text beside it says “3 unread comments”, while the list's name carries the total. Opening a thread clears its count, Mark as unread brings it back, and Back returns to the row.",
    render: () => <PlatformPhoneApp label="Zen app" app={PhoneInbox} />,
    code: exampleCode(phoneInbox),
  },
  {
    title: "Hidden section heading",
    wide: true,
    description: "Four metric cards under a month picker read as one group from the layout, but screen-reader users move between headings. A hidden heading at the section's level (h2 on a page, h4 in this card) names the region through aria-labelledby and follows the month.",
    render: () => <MonthAtAGlance />,
    code: exampleCode(monthAtAGlance),
  },
]);
