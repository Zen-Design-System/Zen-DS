/* Link examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Link decision: links inside a sentence are underlined and
   go through the app's router, other sites open a new tab with external, a widget's View all is a standalone link,
   visited marks articles in a reading list people scan again, and on a phone links navigate while buttons act.
   Each example is its own file in link/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import LeaveHelp from "./link/links-in-running-text.example";
import leaveHelp from "./link/links-in-running-text.example.tsx?raw";
import ExternalLinks from "./link/open-another-site.example";
import externalLinks from "./link/open-another-site.example.tsx?raw";
import DueThisWeek from "./link/view-all.example";
import dueThisWeek from "./link/view-all.example.tsx?raw";
import ReadingList from "./link/reading-list.example";
import readingList from "./link/reading-list.example.tsx?raw";
import PhoneSignIn from "./link/sign-in-on-a-phone.example";
import phoneSignIn from "./link/sign-in-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "link";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Links in running text",
    description: "Inside a sentence, links are underlined (underline=\"always\") so they never rely on colour alone, and they take the paragraph's font. Your router's link (as={RouterLink}) opens the policy and the calendar in place.",
    render: () => <LeaveHelp />,
    code: exampleCode(leaveHelp),
  },
  {
    title: "Open another site",
    description: "Links to other sites use external: they open a new tab with rel=\"noopener noreferrer\", show the external-link icon and add a hidden “(opens in a new tab)”, so the change of context is seen and heard. The icon stays on the line of the last word.",
    render: () => <ExternalLinks />,
    code: exampleCode(externalLinks),
  },
  {
    title: "View all",
    description: "A card that shows part of a list says so in its title and ends with a standalone link to the rest: Hyperlink colour, underlined on hover and focus, in the text style around it. Each row opens its task through the row's own href, and the task and the full list link back.",
    render: () => <DueThisWeek />,
    code: exampleCode(dueThisWeek),
  },
  {
    title: "Reading list",
    wide: true,
    description: "A list people scan again and again turns on visited: once someone opens an article, its title turns the Visited colour, so they can see what they have read. Each title is the link and wraps in full on a narrow screen; the row around it isn't clickable. Search and Topic filter the list, and an empty result offers Clear filters.",
    render: () => <ReadingList />,
    code: exampleCode(readingList),
  },
  {
    title: "Sign in on a phone",
    description: "Links go somewhere (Forgot password?, the terms and the privacy policy) and push a screen with Back; the button acts, so Sign in is the footer's Primary. The legal line's links take the caption colour with tone=\"inherit\" and stay underlined. On Home, each task row opens its task.",
    render: () => <PlatformPhone label="Zen app"><PhoneSignIn /></PlatformPhone>,
    code: exampleCode(phoneSignIn),
  },
]);
