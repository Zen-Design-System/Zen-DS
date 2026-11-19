/* Table examples. Each example is its own file in table/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11):
   the card renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TeamMembers from "./table/sort-by-column.example";
import teamMembers from "./table/sort-by-column.example.tsx?raw";
import InvoiceSelection from "./table/act-on-selected-rows.example";
import invoiceSelection from "./table/act-on-selected-rows.example.tsx?raw";
import ProjectsPage from "./table/open-a-row.example";
import projectsPage from "./table/open-a-row.example.tsx?raw";
import LoyaltySprint from "./table/edit-in-place.example";
import loyaltySprint from "./table/edit-in-place.example.tsx?raw";
import FileSearch from "./table/no-matching-rows.example";
import fileSearch from "./table/no-matching-rows.example.tsx?raw";
import Guests from "./table/first-run.example";
import guests from "./table/first-run.example.tsx?raw";
import SeptemberExpenses from "./table/loading-and-errors.example";
import septemberExpenses from "./table/loading-and-errors.example.tsx?raw";
import TeamHours from "./table/narrow-screen.example";
import teamHours from "./table/narrow-screen.example.tsx?raw";

export const page: PlatformPage = "table";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Sort by column",
    description: "Sortable headers are buttons with aria-sort: the first press sorts ascending, the next descending, the third returns the team page's own order. Numbers and their header align right.",
    wide: true,
    render: () => <TeamMembers />,
    code: exampleCode(teamMembers),
  },
  {
    title: "Act on selected rows",
    description: "Checking rows brings up the Table's bulk actions: a Popover/Bulk-Action bar under the table with the count and Clear selection, held at the bottom of the window on a long table; on a phone the actions that don't fit move into a More menu. Each action names how many invoices it touches; Mark as paid acts at once and the Toast can undo it.",
    wide: true,
    render: () => <InvoiceSelection />,
    code: exampleCode(invoiceSelection),
  },
  {
    title: "Open a row",
    description: "A list page whose read-only rows open a record uses onRowClick: the whole row is the target, Tab reaches each row and Enter opens it. The project opens in the AppShell's side panel, docked beside the table when the window has room (the table narrows) and floating over it when not, so the list stays in place. The Status filter sits in the header's Sections row, under the PageHeader.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><ProjectsPage /></PreviewAppFrame>,
    code: exampleCode(projectsPage),
  },
  {
    title: "Edit in place",
    description: "Only the fields people correct every day are editable, and Done tasks lock everything but their status. A click or Enter edits, Enter saves, Escape leaves; the estimate validates in its cell and a status change confirms in a Toast with Undo.",
    wide: true,
    render: () => <LoyaltySprint />,
    code: exampleCode(loyaltySprint),
  },
  {
    title: "No matching rows",
    description: "When search and filters leave nothing, the table keeps its header and the empty prop puts an Empty State across the columns, with Clear filters as the way back. The count beside the filters says the same in words.",
    wide: true,
    render: () => <FileSearch />,
    code: exampleCode(fileSearch),
  },
  {
    title: "First run",
    description: "Before the first row, the empty table says what goes here and offers the one action that fills it. Once guests exist, Invite guest moves to the header and each row gets a Remove that the Toast can undo.",
    wide: true,
    render: () => <Guests />,
    code: exampleCode(guests),
  },
  {
    title: "Loading and errors",
    description: "A failed load is an Inline Message with Try again, not an empty table. While rows load, the same columns hold one Skeleton per cell, and a live region says when they have arrived.",
    wide: true,
    render: () => <SeptemberExpenses />,
    code: exampleCode(septemberExpenses),
  },
  {
    title: "Narrow screen",
    description: "Columns with a fixed width keep their values on one line, so on a phone the table scrolls sideways with a swipe instead of wrapping names and numbers. The week is a task screen pushed from Approvals: Back in the compact bar, and the Action bar approves it.",
    render: () => <PlatformPhoneApp label="Team hours" canvas="default" app={TeamHours} />,
    code: exampleCode(teamHours),
  },
]);
