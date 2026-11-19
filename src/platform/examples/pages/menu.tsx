/* Menu examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Menu decision: a table row opens the invoice while its ⋯
   holds the other actions, a page's More menu groups its commands and keeps an unavailable one visible with the
   reason, a New menu composes items with file icons and captions, the keyboard and letter shortcuts of an Actions
   menu, and a short row menu on a phone.
   Each example is its own file in menu/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import InvoiceRowActions from "./menu/row-actions-in-a-table.example";
import invoiceRowActions from "./menu/row-actions-in-a-table.example.tsx?raw";
import ProjectActions from "./menu/project-actions.example";
import projectActions from "./menu/project-actions.example.tsx?raw";
import NewFileMenu from "./menu/new-file-menu.example";
import newFileMenu from "./menu/new-file-menu.example.tsx?raw";
import TaskActionsKeyboard from "./menu/keyboard-and-shortcuts.example";
import taskActionsKeyboard from "./menu/keyboard-and-shortcuts.example.tsx?raw";
import PhoneFileMenu from "./menu/row-menu-on-a-phone.example";
import phoneFileMenu from "./menu/row-menu-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "menu";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Row actions in a table",
    wide: true,
    description: "The row opens the invoice in a Side Panel; each row's ⋯ holds the other actions, named after the invoice and fitted to its status. Delete is last, after a separator, and asks first in a negative Dialog; the menu floats above the table and flips up near the bottom. On a narrow screen the table scrolls sideways to the ⋯ column.",
    render: () => <InvoiceRowActions />,
    code: exampleCode(invoiceRowActions),
  },
  {
    title: "Project actions",
    screen: true,
    description: "A project page in the studio app: Share stays a button in the PageHeader; the page's other commands sit in its More menu, grouped under labels, with Delete last. Archive stays visible but disabled while tasks are open, and its caption says what to do first. Projects in the trail returns to the list, where Search narrows the projects and New project adds one.",
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><ProjectActions /></PreviewAppFrame>,
    code: exampleCode(projectActions),
  },
  {
    title: "New file menu",
    description: "Without items, a Menu takes MenuItem children: a FileIcon is each item's icon and a caption says what it makes. Each choice adds an untitled file to the top of the list, and the toast can undo it.",
    render: () => <NewFileMenu />,
    code: exampleCode(newFileMenu),
  },
  {
    title: "Keyboard and shortcuts",
    description: "Enter, Space or ↓ open the menu on the first item and ↑ on the last; the arrows, Home and End move, a letter jumps to the item it starts, and Escape returns focus to Actions. Each shortcut is that letter, wired by the app while the task has focus.",
    render: () => <TaskActionsKeyboard />,
    code: exampleCode(taskActionsKeyboard),
  },
  {
    title: "Row menu on a phone",
    description: "Each file row opens the file, and its ⋯ is a separate target with four short actions; on a phone the menu opens as an action Bottom Sheet by itself (titled by the button's name, Delete last after a separator). Rename opens a Bottom Sheet form, and Delete removes the row with Undo in the toast. The files sit on a tab root of the Zen app, grouped by when they changed.",
    render: () => <PlatformPhoneApp label="Files" app={PhoneFileMenu} />,
    code: exampleCode(phoneFileMenu),
  },
]);
