/* Bottom Sheet examples. Đìzai Studio's phone apps: a file's actions, a setting to pick, time to log, filters for a task
   list, and the terms of Phin & Co's loyalty programme.
   Each example is its own file in bottom-sheet/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the
   card renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import FileActions from "./bottom-sheet/file-actions.example";
import fileActions from "./bottom-sheet/file-actions.example.tsx?raw";
import PickOne from "./bottom-sheet/pick-one.example";
import pickOne from "./bottom-sheet/pick-one.example.tsx?raw";
import LogTime from "./bottom-sheet/log-time.example";
import logTime from "./bottom-sheet/log-time.example.tsx?raw";
import Filters from "./bottom-sheet/filters.example";
import filters from "./bottom-sheet/filters.example.tsx?raw";
import TermsToAccept from "./bottom-sheet/terms-to-accept.example";
import termsToAccept from "./bottom-sheet/terms-to-accept.example.tsx?raw";

export const page: PlatformPage = "bottom-sheet";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "File actions",
    description: "The Action type lists what you can do with one file, titled with its name. Copy link and Download run and close; Delete file is marked destructive and comes last, and an Undo in the toast brings the file back.",
    render: () => <PlatformPhoneApp label="Brand refresh files" app={FileActions} />,
    code: exampleCode(fileActions),
  },
  {
    title: "Pick one",
    description: "A choice is a List of rows with the current one Selected and checked; picking closes the sheet and focus returns to the setting. Short lists hug their rows, and the long time zone list takes the full height with a Search.",
    render: () => <PlatformPhoneApp label="Settings" app={PickOne} />,
    code: exampleCode(pickOne),
  },
  {
    title: "Log time",
    description: "The Modal type holds a short form: the Hours field takes focus, Enter submits, and Log time without hours puts the error on the field and focus back in it. Saving adds the entry on top of the timesheet, with Undo in the toast.",
    render: () => <PlatformPhoneApp label="Timesheet" app={LogTime} />,
    code: exampleCode(logTime),
  },
  {
    title: "Filters",
    description: "Filters edit a draft: the Primary counts the tasks it will show, Reset clears the draft, and closing the sheet throws it away. When nothing matches, the list offers Clear filters.",
    render: () => <PlatformPhoneApp label="Tasks" app={Filters} />,
    code: exampleCode(filters),
  },
  {
    title: "Terms to accept",
    description: "Long reading takes the full height: the terms scroll under a fixed header while Agree and join and Not now stay stacked at the bottom, each at its own height. The screen's own Join action sits in an Action Bar footer.",
    render: () => <PlatformPhoneApp label="Phin & Co rewards" app={TermsToAccept} />,
    code: exampleCode(termsToAccept),
  },
]);
