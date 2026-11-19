/* Toast examples: short feedback on what the user just did, in Đìzai Studio's Zen workspace and, on the phone, in the
   Phin & Co loyalty app the studio builds (brief: docs/research/example-rebuild-brief-2026-09-30.md). Desktop examples
   call useToast(): ZenProvider hosts the stack. A persistent condition is an Alert Banner, never a toast.
   Each example is its own file in toast/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import UndoDelete from "./toast/undo-a-delete.example";
import undoDelete from "./toast/undo-a-delete.example.tsx?raw";
import CopyEmail from "./toast/one-toast-per-event.example";
import copyEmail from "./toast/one-toast-per-event.example.tsx?raw";
import BackgroundExport from "./toast/export-in-the-background.example";
import backgroundExport from "./toast/export-in-the-background.example.tsx?raw";
import FailedComment from "./toast/an-error-that-waits.example";
import failedComment from "./toast/an-error-that-waits.example.tsx?raw";
import PhoneToasts from "./toast/on-a-phone.example";
import phoneToasts from "./toast/on-a-phone.example.tsx?raw";

export const page: PlatformPage = "toast";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Undo a delete",
    description: "Deleting a file can be undone, so it happens at once and a Neutral toast offers Undo instead of asking first. Undo puts the file back in its place; delete them all and the list says so.",
    render: () => <UndoDelete />,
    code: exampleCode(undoDelete),
  },
  {
    title: "One toast per event",
    description: "Copying is everyday feedback: Neutral, no action, gone after a few seconds. Every copy reuses one id, so copying four addresses in a row leaves a single toast showing the latest one.",
    render: () => <CopyEmail />,
    code: exampleCode(copyEmail),
  },
  {
    title: "Export in the background",
    description: "The export runs while you keep working; when it finishes, a Positive toast brings the result back with View. The same file also lands in Recent exports, so nothing lives only in the toast.",
    render: () => <BackgroundExport />,
    code: exampleCode(backgroundExport),
  },
  {
    title: "An error that waits",
    description: "A failed send is a Negative toast with Retry that stays until it is used or closed (duration: null), and the comment stays in the field. The toast is announced as an alert but never takes focus.",
    render: () => <FailedComment />,
    code: exampleCode(failedComment),
  },
  {
    title: "On a phone",
    description: "A phone app hosts its own ToastStack, inline above the tab bar and one toast at a time. Saving an offer confirms with View, which opens Saved; removing one offers Undo.",
    render: () => <PlatformPhoneApp label="Phin & Co" app={PhoneToasts} />,
    code: exampleCode(phoneToasts),
  },
]);
