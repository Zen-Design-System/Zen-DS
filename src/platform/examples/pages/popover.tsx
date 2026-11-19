/* Popover examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: assign
   people and labels to a task, sort files, jump to a project, pick a time zone for a client review, act on a file
   selection, and the phone form of the same sort.
   Each example is its own file in popover/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import AssignPeople from "./popover/assign-people.example";
import assignPeople from "./popover/assign-people.example.tsx?raw";
import CreateLabel from "./popover/create-a-label.example";
import createALabel from "./popover/create-a-label.example.tsx?raw";
import SortFiles from "./popover/sort-a-list.example";
import sortAList from "./popover/sort-a-list.example.tsx?raw";
import PhoneSort from "./popover/sort-on-a-phone.example";
import sortOnAPhone from "./popover/sort-on-a-phone.example.tsx?raw";
import JumpToProject from "./popover/search-results.example";
import searchResults from "./popover/search-results.example.tsx?raw";
import ReviewTimeZone from "./popover/long-lists.example";
import longLists from "./popover/long-lists.example.tsx?raw";
import PublishDomain from "./popover/pick-a-domain.example";
import pickADomain from "./popover/pick-a-domain.example.tsx?raw";
import BulkFileActions from "./popover/act-on-a-selection.example";
import actOnASelection from "./popover/act-on-a-selection.example.tsx?raw";

export const page: PlatformPage = "popover";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Assign people",
    description: "A searchable, multi-select list of people with photos that stays open while people are toggled. Someone on leave when the task is due stays in the list, disabled, with the dates as the caption.",
    render: () => <AssignPeople />,
    code: exampleCode(assignPeople),
  },
  {
    title: "Create a label",
    description: "Labels are an open set, so the picker offers Manual-Add-New: the Create row appears only for a value that isn't listed, and Enter creates and selects it.",
    render: () => <CreateLabel />,
    code: exampleCode(createALabel),
  },
  {
    title: "Sort a list",
    description: "Sort is a single choice: the label names the list, captions give the order, and picking an option closes the Popover and re-sorts the files.",
    render: () => <SortFiles />,
    code: exampleCode(sortAList),
  },
  {
    title: "Sort on a phone",
    description: "On a phone the same Sort chip opens a Bottom Sheet instead of a Popover: full-width rows within thumb reach, the current order selected, closing on pick.",
    render: () => <PlatformPhoneApp label="Files" app={PhoneSort} />,
    code: exampleCode(sortOnAPhone),
  },
  {
    title: "Search results",
    description: "The Popover on its own, anchored under a Search field and as wide as it (width=\"fill\"): Dock Icon items with the client as a caption. ↓ moves into the results, Escape or a click outside closes them, and a pick opens the project.",
    render: () => <JumpToProject />,
    code: exampleCode(searchResults),
  },
  {
    title: "Long lists",
    description: "Fourteen time zones scroll inside the Popover, with search to narrow them and the UTC offset as each caption. Picking a city shows the client review in that city's time.",
    render: () => <ReviewTimeZone />,
    code: exampleCode(longLists),
  },
  {
    title: "Pick a domain",
    description: "Domains run long, so the list hugs the longest one (popoverWidth=\"hug\"): never narrower than the field, it grows past it, up to the window, instead of cutting each name with \"…\". Publish confirms with a toast.",
    render: () => <PublishDomain />,
    code: exampleCode(pickADomain),
  },
  {
    title: "Act on a selection",
    description: "Selecting rows brings up a Bulk-Action bar under the table. Each icon action names how many files it affects; Delete removes them with Undo, and Share asks who to share with.",
    wide: true,
    render: () => <BulkFileActions />,
    code: exampleCode(actOnASelection),
  },
]);
