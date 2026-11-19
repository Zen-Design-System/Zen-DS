/* Dialog examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio's own work in Zen: delete a
   finished project, leave an edit, invite someone to a project, request time off, start a project in steps, restore a
   file version, copy a token that is shown once, and withdraw leave on a phone.
   Each example is its own file in dialog/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import DeleteProject from "./dialog/delete-a-project.example";
import deleteProject from "./dialog/delete-a-project.example.tsx?raw";
import DiscardChanges from "./dialog/discard-changes.example";
import discardChanges from "./dialog/discard-changes.example.tsx?raw";
import InviteByEmail from "./dialog/invite-by-email.example";
import inviteByEmail from "./dialog/invite-by-email.example.tsx?raw";
import NewProject from "./dialog/new-project-in-steps.example";
import newProject from "./dialog/new-project-in-steps.example.tsx?raw";
import RequestTimeOff from "./dialog/request-time-off.example";
import requestTimeOff from "./dialog/request-time-off.example.tsx?raw";
import PhoneWithdraw from "./dialog/withdraw-on-a-phone.example";
import phoneWithdraw from "./dialog/withdraw-on-a-phone.example.tsx?raw";
import RestoreVersion from "./dialog/restore-a-version.example";
import restoreVersion from "./dialog/restore-a-version.example.tsx?raw";
import TokenOnce from "./dialog/show-a-token-once.example";
import tokenOnce from "./dialog/show-a-token-once.example.tsx?raw";

export const page: PlatformPage = "dialog";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Delete a project",
    description: "Deleting a project can't be undone, so the negative Dialog states what goes with it and keeps Delete project disabled until the name is typed; Enter in the field then confirms. Focus starts in the field; Cancel and Escape leave without deleting.",
    render: () => <DeleteProject />,
    code: exampleCode(deleteProject),
  },
  {
    title: "Discard changes",
    description: "Cancel with edits asks before throwing them away; with nothing changed it just closes. Keep editing has the focus, and Discard changes uses Danger because the text is lost.",
    render: () => <DiscardChanges />,
    code: exampleCode(discardChanges),
  },
  {
    title: "Invite by email",
    description: "ModalForm Basic for a short form. onSubmit makes Enter and Send invite submit; the email is checked first and the error stays in the form. A sent invite joins the list as Pending.",
    render: () => <InviteByEmail />,
    code: exampleCode(inviteByEmail),
  },
  {
    title: "New project in steps",
    description: "Layout Big for a longer flow: a Stepper leads the form, Continue moves on, and Back appears as the tertiary action from step 2. Create project adds the project as Planning.",
    render: () => <NewProject />,
    code: exampleCode(newProject),
  },
  {
    title: "Request time off",
    description: "Layout 1-3 puts a 240px summary beside the form: the balance of the chosen type updates as the dates change. Three leave types are a radio group, not a select, and focus starts on the chosen one. Send request shows the wait itself, and the request joins the list as Pending.",
    render: () => <RequestTimeOff />,
    code: exampleCode(requestTimeOff),
  },
  {
    title: "Withdraw on a phone",
    description: "Inside the phone the Dialog covers that screen only, and its actions stack full width within thumb reach, Primary first. Keep request has the focus, a withdrawn request turns Cancelled and offers Request again, and Back returns to the row it came from.",
    render: () => <PlatformPhoneApp label="Time off" app={PhoneWithdraw} />,
    code: exampleCode(phoneWithdraw),
  },
  {
    title: "Restore a version",
    description: "Two outcomes of equal weight with longer labels stack full width (actionsDirection vertical): restore the version, or save it as a new file. Cancel sits last.",
    render: () => <RestoreVersion />,
    code: exampleCode(restoreVersion),
  },
  {
    title: "Show a token once",
    description: "A positive Dialog blocks only when there is something to keep: a token shown once, in a read-only field with a Copy token button. dismissible={false} stops a stray click or Escape from losing it; Done closes.",
    render: () => <TokenOnce />,
    code: exampleCode(tokenOnce),
  },
]);
