/* Input examples (rebuild brief 2026-09-30): the fields of Đìzai Studio's own Zen workspace — a new client project,
   billing and client details, the workspace profile, a sent invoice, account setup, a task and a phone time-off
   request. Each card teaches one field decision.
   Each example is its own file in input/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import NewProject from "./input/create-a-project.example";
import newProject from "./input/create-a-project.example.tsx?raw";
import BillingDetails from "./input/label-parts.example";
import billingDetails from "./input/label-parts.example.tsx?raw";
import WorkspaceProfile from "./input/help-text-that-responds.example";
import workspaceProfile from "./input/help-text-that-responds.example.tsx?raw";
import SentInvoice from "./input/read-only-and-disabled.example";
import sentInvoice from "./input/read-only-and-disabled.example.tsx?raw";
import ClientContact from "./input/pickers-in-the-field.example";
import clientContact from "./input/pickers-in-the-field.example.tsx?raw";
import PasswordRules from "./input/password-rules.example";
import passwordRules from "./input/password-rules.example.tsx?raw";
import TaskDetail from "./input/task-title-and-notes.example";
import taskDetail from "./input/task-title-and-notes.example.tsx?raw";
import TimeOffPhone from "./input/time-off-on-a-phone.example";
import timeOffPhone from "./input/time-off-on-a-phone.example.tsx?raw";
import TaskProperties from "./input/task-properties.example";
import taskProperties from "./input/task-properties.example.tsx?raw";
import ProjectProperties from "./input/project-phase-in-its-own-words.example";
import projectProperties from "./input/project-phase-in-its-own-words.example.tsx?raw";
import ViewerProperties from "./input/read-only-for-viewers.example";
import viewerProperties from "./input/read-only-for-viewers.example.tsx?raw";
import PhoneTaskProperties from "./input/task-details-on-a-phone.example";
import phoneTaskProperties from "./input/task-details-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "input";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Create a project",
    description: "Each value gets the field built for it: text for the name, a Select for one of six clients, calendar dates, steppers for a small count and tags for the team. Errors show when a field is left or the form is submitted, and focus moves to the first one.",
    wide: true,
    render: () => <NewProject />,
    code: exampleCode(newProject),
  },
  {
    title: "Label parts",
    description: "An info tooltip says where invoices go, (Optional) marks the one field that may stay empty, and a label action fills the billing address from the client's profile.",
    render: () => <BillingDetails />,
    code: exampleCode(billingDetails),
  },
  {
    title: "Help text that responds",
    description: "Help text changes theme with the value: a character count on the name, Positive or an error once the address is checked on blur, and a Warning while the support email is a personal one.",
    render: () => <WorkspaceProfile />,
    code: exampleCode(workspaceProfile),
  },
  {
    title: "Read-only and disabled",
    description: "A sent invoice keeps its number and amount read-only, so they can still be selected and copied. The reminder field is disabled until reminders are turned on, and its help text says why.",
    render: () => <SentInvoice />,
    code: exampleCode(sentInvoice),
  },
  {
    title: "Pickers in the field",
    description: "Labelled Leading and Trailing slots with options become pickers: the country code of the phone number and the currency of the retainer. The https:// prefix has no options, so it stays decorative and a click on it focuses the field.",
    render: () => <ClientContact />,
    code: exampleCode(clientContact),
  },
  {
    title: "Password rules",
    description: "The rules sit under the field as Input Conditions and turn to a check or a cross while typing. The eye in the trailing slot is an action slot whose name says what it does, and Enter submits.",
    render: () => <PasswordRules />,
    code: exampleCode(passwordRules),
  },
  {
    title: "Task title and notes",
    description: "A multi-line Heading field lets a long task title wrap instead of scrolling out of view, and the Rich-text field keeps its editor bar for lists and links. Both save together through one Save changes.",
    wide: true,
    render: () => <TaskDetail />,
    code: exampleCode(taskDetail),
  },
  {
    title: "Time off on a phone",
    description: "Phone forms use Large fields and put the submit in the footer. The last day's help text counts the working days and the balance left, the request lands under Upcoming as Pending, and Back asks before it drops a filled-in request.",
    render: () => <PlatformPhoneApp label="Time off" app={TimeOffPhone} />,
    code: exampleCode(timeOffPhone),
  },
  {
    title: "Task properties",
    wide: true,
    description: "A task's properties are PropertyFields in two columns: click a value to change it in place. Status opens its steps, Priority its flags, dates the calendar, People and Labels add with the + after the label; Start Date says Empty until it is set.",
    render: () => <TaskProperties />,
    code: exampleCode(taskProperties),
  },
  {
    title: "Project phase in its own words",
    description: "A project keeps its own words for the workflow (Planning, Active, On hold, Completed) through labels, and the active phase passes its exact share, so the ring shows 64%.",
    render: () => <ProjectProperties />,
    code: exampleCode(projectProperties),
  },
  {
    title: "Read-only for viewers",
    description: "People who may not change the task see the same rows with readOnly: no hover, no picker and no remove buttons, so nothing looks clickable. Turn on Can edit to get the editing rows back.",
    render: () => <ViewerProperties />,
    code: exampleCode(viewerProperties),
  },
  {
    title: "Task details on a phone",
    description: "On a phone the label column grows with Component Size (128 in Compact, 154 in Comfortable), so a label beside its + still fits and the values line up; each value opens its picker under itself.",
    render: () => <PlatformPhoneApp label="Task" app={PhoneTaskProperties} />,
    code: exampleCode(phoneTaskProperties),
  },
]);
