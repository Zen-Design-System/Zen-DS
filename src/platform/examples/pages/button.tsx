/* Button examples. Đìzai Studio, signed in as Alex Duong: a project page's actions, an invoice sent from its form, a
   delete that asks first, a hand-off that waits for its checklist, overlay buttons on a photo and a leave approval on a
   phone. Each example is its own file in button/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the
   card renders its default export and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PageActions from "./button/page-actions.example";
import pageActions from "./button/page-actions.example.tsx?raw";
import SendInvoice from "./button/send-an-invoice.example";
import sendInvoice from "./button/send-an-invoice.example.tsx?raw";
import DeleteFile from "./button/delete-a-file.example";
import deleteFile from "./button/delete-a-file.example.tsx?raw";
import HandOff from "./button/hand-off-when-ready.example";
import handOff from "./button/hand-off-when-ready.example.tsx?raw";
import PhotoViewer from "./button/controls-on-a-photo.example";
import photoViewer from "./button/controls-on-a-photo.example.tsx?raw";
import PhoneApprove from "./button/approve-on-a-phone.example";
import phoneApprove from "./button/approve-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "button";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Page actions",
    description: "A project page in the studio's AppShell has one Primary, New task, at the end of the PageHeader in the header's Main row. Share is Tertiary and rarer actions wait in the More actions menu, so the main action stands out; the header's top row keeps only the trail, notifications and the account.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame><PageActions /></PreviewAppFrame>,
    code: exampleCode(pageActions),
  },
  {
    title: "Send an invoice",
    description: "Send invoice is the form's submit: it shows its progress on the button while Download PDF waits, and a wrong address puts the focus back on the field. Then the status turns Sent and the next step, Record payment, takes the Primary slot.",
    render: () => <SendInvoice />,
    code: exampleCode(sendInvoice),
  },
  {
    title: "Delete a file",
    description: "Deleting a file can't be undone, so the row's trash button asks first. The negative Dialog repeats the verb in its Danger button and gives Cancel the focus.",
    render: () => <DeleteFile />,
    code: exampleCode(deleteFile),
  },
  {
    title: "Hand off when ready",
    description: "Hand off stays disabled until every check is done, and the line beside it says what is missing. Undo brings the checklist back.",
    render: () => <HandOff />,
    code: exampleCode(handOff),
  },
  {
    title: "Controls on a photo",
    description: "Over a photo, the actions are Overlay icon buttons, readable on any picture. Each has a name that shows as a tooltip, and Previous, Next and the zoom buttons disable at their limits.",
    render: () => <PhotoViewer />,
    code: exampleCode(photoViewer),
  },
  {
    title: "Approve on a phone",
    description: "On a phone the decision sits in the AppShell's Action bar: Decline leave and Approve leave are two Large buttons side by side, Primary at the end, under the request and who else is off on those days. Once decided, the Action bar leaves, focus returns to Back and a Toast offers Undo; Back goes to the Time off root, where waiting and decided requests are grouped over the bottom bar.",
    render: () => <PlatformPhoneApp label="Time off" app={PhoneApprove} />,
    code: exampleCode(phoneApprove),
  },
]);
