/* Form examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Form decision: a create page checks each field as you leave
   it and, on submit, moves focus to the first problem; the server's answer lands on the field or in an Inline Message
   with Try again; FormField and FormFieldset name controls that have no label of their own; FormActions keeps a
   destructive action apart; and on a phone the shell's Action Bar submits the form by its id.
   Each example is its own file in form/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import NewClient from "./form/add-a-client.example";
import newClient from "./form/add-a-client.example.tsx?raw";
import WorkspaceAddress from "./form/server-errors.example";
import workspaceAddress from "./form/server-errors.example.tsx?raw";
import BudgetAlerts from "./form/label-custom-controls.example";
import budgetAlerts from "./form/label-custom-controls.example.tsx?raw";
import PhonePickup from "./form/form-screen-on-a-phone.example";
import phonePickup from "./form/form-screen-on-a-phone.example.tsx?raw";
import DraftInvoice from "./form/destructive-action-apart.example";
import draftInvoice from "./form/destructive-action-apart.example.tsx?raw";

export const page: PlatformPage = "form";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Add a client",
    description: "A create page in the studio app: useFormState binds every field in one spread and checks a field when you leave it. Add client (or Enter) checks them all, moves focus to the first problem and announces how many need attention; Cancel, or Clients in the trail, asks before it drops what you typed. The new client joins the Clients table, which the top row's Search narrows.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><NewClient /></PreviewAppFrame>,
    code: exampleCode(newClient),
  },
  {
    title: "Server errors",
    wide: true,
    description: "What the server rejects goes back on the field with setError, and focus returns to it: dizaistudio is taken. A request that fails throws, keeps every value and shows a Negative Inline Message whose Try again sends it again.",
    render: () => <WorkspaceAddress />,
    code: exampleCode(workspaceAddress),
  },
  {
    title: "Label custom controls",
    description: "A Slider has no label or error of its own, so FormField adds them and a failed submit lands on it. The people to alert are one FormFieldset with one error for the group; the repeat choice is a radio FormFieldset.",
    render: () => <BudgetAlerts />,
    code: exampleCode(budgetAlerts),
  },
  {
    title: "Form screen on a phone",
    description: "A pickup booking in the Mekong Freight app: the Action bar the shell pins to the bottom sits outside the form, so its submit names the form by id, and its summary follows the parcels. Close asks before it drops what was entered; a booked pickup joins the shipments under On the way, on the app's tab root.",
    render: () => <PlatformPhoneApp label="Mekong Freight" app={PhonePickup} />,
    code: exampleCode(phonePickup),
  },
  {
    title: "Destructive action apart",
    wide: true,
    description: "FormActions align=\"between\" puts Delete draft alone on the left, away from Send invoice, and asks in a negative Dialog because deleting can't be undone. Client and Bill to are read-only facts; once sent, every field reads only and the toast can undo the send.",
    render: () => <DraftInvoice />,
    code: exampleCode(draftInvoice),
  },
]);
