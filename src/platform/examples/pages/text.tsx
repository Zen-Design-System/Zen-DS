/* Text & Heading examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one copy decision: the heading level follows the page
   outline while the style follows the kind of content, status text pairs its colour with an icon and words, long copy
   clamps and opens in place, counts agree with their noun, and a phone's h1 is its large or compact bar title. The two
   screens sit in the new AppShell (2026-10-19): the PageHeader is the header's Main row on desktop, the TopNavigation
   names the phone screen. Each example is its own file in text/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md
   §11): the card renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import { PreviewAppFrame } from "../../PlatformFrames";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import ProjectPage from "./text/page-outline.example";
import projectPage from "./text/page-outline.example.tsx?raw";
import SecurityChecks from "./text/status-text.example";
import securityChecks from "./text/status-text.example.tsx?raw";
import Comments from "./text/clamp-long-comments.example";
import comments from "./text/clamp-long-comments.example.tsx?raw";
import SendFiles from "./text/counts-that-agree.example";
import sendFiles from "./text/counts-that-agree.example.tsx?raw";
import PlanRenewal from "./text/mixed-styles-in-a-sentence.example";
import planRenewal from "./text/mixed-styles-in-a-sentence.example.tsx?raw";
import PhoneHeadings from "./text/headings-on-a-phone.example";
import phoneHeadings from "./text/headings-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "text";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Page outline",
    screen: true,
    description: "The Loyalty app's project page in the studio's app. One h1 names the page: the PageHeader (Heading/1) in the shell's header. Sections are h2 in Heading/4 and the cards under them h3 in Heading/Subheading: the level follows the outline, the style follows the kind of content. Under each title, tone steps down from Base to Light while the size stays.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><ProjectPage /></PreviewAppFrame>,
    code: exampleCode(projectPage),
  },
  {
    title: "Status text",
    description: "A check's result takes its colour family's tone (positive, warning, negative) on both the icon and the words, so the colour is never the only signal. Fixing a check rewrites the line: Renew certificate turns it positive, and removing guests asks first in a Negative Dialog.",
    render: () => <SecurityChecks />,
    code: exampleCode(securityChecks),
  },
  {
    title: "Clamp long comments",
    description: "truncate={3} keeps a long comment to three lines; Show more (with aria-expanded) opens it in place and appears only when the text is really cut. The full text stays in the DOM for screen readers. The name is bold and the time is Light: weight and tone set the hierarchy, not size.",
    render: () => <Comments />,
    code: exampleCode(comments),
  },
  {
    title: "Counts that agree",
    description: "plural() writes “1 page” and “12 pages”, “1 file” and “2 files”, in captions, the selection line, the button label and the toast. Sending with nothing chosen puts the error on the group, and Form moves focus to it.",
    render: () => <SendFiles />,
    code: exampleCode(sendFiles),
  },
  {
    title: "Mixed styles in a sentence",
    description: "TextRun gives a few words a style of their own inside one Text (Figma's mixed styles): the renewal date and the price in Bold, the unpaid seats in the Negative tone, an old price struck through. The sentence stays one text, so it is read and translated whole. Paying the seats rewrites it.",
    render: () => <PlanRenewal />,
    code: exampleCode(planRenewal),
  },
  {
    title: "Headings on a phone",
    description: "In the studio's phone app, the Tasks root's large title is the screen's h1 (Heading/1) and folds into the bar as the list scrolls; its groups are h2 kickers. A pushed screen's compact bar title is its h1 in the bar's style, so the content starts at h2: the task's name is bold text and Activity is a kicker. The phone app sets the mobile type scale (ZenProvider typography=\"mobile\"); no component changes.",
    render: () => <PlatformPhoneApp label="Zen tasks" app={PhoneHeadings} />,
    code: exampleCode(phoneHeadings),
  },
]);
