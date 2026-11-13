/* Badge examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Status is a Badge from one vocabulary per domain (data.ts theme maps), and a
   workflow step (to do → done) is a BadgeStatus; counts are a BadgeCounter; removable labels are Badges with onRemove.
   Each example is its own file in badge/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import TaskStatusTable from "./badge/task-status.example";
import taskStatus from "./badge/task-status.example.tsx?raw";
import ReleaseChecklist from "./badge/release-checklist.example";
import releaseChecklist from "./badge/release-checklist.example.tsx?raw";
import ProjectProgress from "./badge/project-progress.example";
import projectProgress from "./badge/project-progress.example.tsx?raw";
import TaskBoard from "./badge/board-columns.example";
import taskBoard from "./badge/board-columns.example.tsx?raw";
import UnreadCounts from "./badge/unread-counts.example";
import unreadCounts from "./badge/unread-counts.example.tsx?raw";
import MobileTasks from "./badge/status-on-a-phone.example";
import mobileTasks from "./badge/status-on-a-phone.example.tsx?raw";
import InvoiceStatus from "./badge/invoice-status.example";
import invoiceStatus from "./badge/invoice-status.example.tsx?raw";
import RemovableLabels from "./badge/removable-labels.example";
import removableLabels from "./badge/removable-labels.example.tsx?raw";

export const page: PlatformPage = "badge";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Task status",
    wide: true,
    description: "A task table shows the workflow step as a BadgeStatus, whose ring fills as the task moves on, and priority as a Subtle badge led by the solid flag (Figma .Task/Priority), its level in words so it reads without colour; two per row at most. Filtering is a Chip, never a clickable badge.",
    render: () => <TaskStatusTable />,
    code: exampleCode(taskStatus),
  },
  {
    title: "Release checklist",
    wide: true,
    description: "Every step of one workflow is a BadgeStatus with its default label. In Progress shows an exact 60% and says it after the label; Blocked and Cancelled stand outside the order with a library icon, and their reason sits in the step's caption.",
    render: () => <ReleaseChecklist />,
    code: exampleCode(releaseChecklist),
  },
  {
    title: "Project progress",
    description: "Projects map their own words onto the workflow and keep them as the label. An active project passes its exact share, so the ring shows 64% and a screen reader hears it; a Small badge fits the list row.",
    render: () => <ProjectProgress />,
    code: exampleCode(projectProgress),
  },
  {
    title: "Board columns",
    wide: true,
    description: "On a board each column is headed by its step's BadgeStatus and a BadgeCounter, so the columns read in workflow order and the ring tells how far along each one is.",
    render: () => <TaskBoard />,
    code: exampleCode(taskBoard),
  },
  {
    title: "Unread counts",
    description: "Counts are a BadgeCounter, capped at 99+ and gone at zero. Opening a project reads it and clears its counter; the row's name carries the count for screen readers.",
    render: () => <UnreadCounts />,
    code: exampleCode(unreadCounts),
  },
  {
    title: "Status on a phone",
    description: "On a phone the step sits at the end of each row as a BadgeStatus, and the caption follows it: open tasks say when they're due, finished ones when they were done. Open a task and move it on: the badge in the sheet and in the row change together, ring and all.",
    render: () => <PlatformPhone label="Tasks"><MobileTasks /></PlatformPhone>,
    code: exampleCode(mobileTasks),
  },
  {
    title: "Invoice status",
    description: "On the invoice itself, a Solid badge gives the status weight. It changes when the invoice does (Mark as paid, then Undo in the toast), never by clicking the badge.",
    render: () => <InvoiceStatus />,
    code: exampleCode(invoiceStatus),
  },
  {
    title: "Removable labels",
    description: "Labels on a task are Subtle badges with Remove wired to onRemove, and the toast offers Undo. Add label picks a label not yet applied, or creates a new one.",
    render: () => <RemovableLabels />,
    code: exampleCode(removableLabels),
  },
]);
