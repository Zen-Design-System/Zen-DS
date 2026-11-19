/* Uploader examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Uploader decision: many files track their own upload and
   retry, one file takes the field's place and can be replaced, a required file is checked with the rest of a form,
   a File-Item over a photo uses the Overlay theme, and a phone attaches a document to a request. Uploads are simulated
   (about 3 MB a second) so every state can be tried with real files.
   Each example is its own file in uploader/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import KickoffFiles from "./uploader/kickoff-files.example";
import kickoffFiles from "./uploader/kickoff-files.example.tsx?raw";
import PhoneSickLeave from "./uploader/attach-on-a-phone.example";
import attachOnAPhone from "./uploader/attach-on-a-phone.example.tsx?raw";
import ExpenseClaim from "./uploader/required-receipt.example";
import requiredReceipt from "./uploader/required-receipt.example.tsx?raw";
import ProjectCover from "./uploader/upload-over-a-photo.example";
import uploadOverAPhoto from "./uploader/upload-over-a-photo.example.tsx?raw";
import WorkspaceLogo from "./uploader/workspace-logo.example";
import workspaceLogo from "./uploader/workspace-logo.example.tsx?raw";

export const page: PlatformPage = "uploader";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Kickoff files",
    description: "Several files upload side by side, each with its own progress and time left; the X cancels an upload or removes a file. A failed upload keeps its place with Retry, and a file that is too big or the wrong type is turned away at the field with the reason.",
    render: () => <KickoffFiles />,
    code: exampleCode(kickoffFiles),
  },
  {
    title: "Attach on a phone",
    description: "On a phone the drop zone is one large target that opens the camera or files, so its text says so. Send request checks for the note and says what's missing on the field; Close asks before it drops an attached note.",
    render: () => <PlatformPhoneApp label="Sick leave" app={PhoneSickLeave} />,
    code: exampleCode(attachOnAPhone),
  },
  {
    title: "Required receipt",
    description: "In a dense form the drop zone is a 48px row (extended={false}). Submit checks the receipt with the other fields: a missing or unfinished upload shows its error on the field and focus moves to it.",
    render: () => <ExpenseClaim />,
    code: exampleCode(requiredReceipt),
  },
  {
    title: "Upload over a photo",
    description: "The new cover shows at once, and its File-Item floats on the photo in the Overlay theme while it uploads. If the upload fails, the old cover comes back and the file waits in the field with its error and Retry, readable on the surface; the X drops it.",
    render: () => <ProjectCover />,
    code: exampleCode(uploadOverAPhoto),
  },
  {
    title: "Workspace logo",
    description: "A single-file field: the logo's File-Item takes the button's place. Replace opens the file picker again, and Remove brings the Upload logo button back, with Undo in the toast.",
    render: () => <WorkspaceLogo />,
    code: exampleCode(workspaceLogo),
  },
]);
