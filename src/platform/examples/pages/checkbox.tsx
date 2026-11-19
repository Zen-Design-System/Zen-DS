/* Checkbox examples (brief 2026-09-30). Each example is its own file in checkbox/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and shows its text as the
   snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import SelectFiles from "./checkbox/select-files.example";
import selectFiles from "./checkbox/select-files.example.tsx?raw";
import ExportSections from "./checkbox/export-sections.example";
import exportSections from "./checkbox/export-sections.example.tsx?raw";
import ConfirmTimesheet from "./checkbox/confirm-before-submitting.example";
import confirmTimesheet from "./checkbox/confirm-before-submitting.example.tsx?raw";
import RolePermissions from "./checkbox/role-permissions.example";
import rolePermissions from "./checkbox/role-permissions.example.tsx?raw";
import OfflineProjects from "./checkbox/offline-projects.example";
import offlineProjects from "./checkbox/offline-projects.example.tsx?raw";

export const page: PlatformPage = "checkbox";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Select files",
    description: "A selectable Table draws the row checkboxes and the select-all mark, which turns indeterminate while only some rows are picked. Bulk actions appear in the toolbar once something is selected, and Delete can be undone from the Toast.",
    wide: true,
    render: () => <SelectFiles />,
    code: exampleCode(selectFiles),
  },
  {
    title: "Export sections",
    description: "A bold parent checkbox sits over its labelled children and shows the indeterminate mark while only some are checked; clicking it selects all. Export with nothing chosen shows the error on the group.",
    render: () => <ExportSections />,
    code: exampleCode(exportSections),
  },
  {
    title: "Confirm before submitting",
    description: "A single checkbox confirms a statement before the timesheet goes out. It starts unchecked, and submitting without it puts the error on the checkbox instead of disabling the button.",
    render: () => <ConfirmTimesheet />,
    code: exampleCode(confirmTimesheet),
  },
  {
    title: "Role permissions",
    description: "Checkboxes, not toggles, because nothing changes until Save. Permissions a role can't change stay disabled, checked or not, and their caption says why; Cancel and Save wake up once something changes.",
    wide: true,
    render: () => <RolePermissions />,
    code: exampleCode(rolePermissions),
  },
  {
    title: "Offline projects",
    description: "On a phone the mark sits on the right (checkSide) and each row fills the width, so the whole row is the tap target. The ActionBar summary counts the download size, and Download waits until a project is chosen.",
    render: () => <PlatformPhoneApp label="Downloads" app={OfflineProjects} />,
    code: exampleCode(offlineProjects),
  },
]);
