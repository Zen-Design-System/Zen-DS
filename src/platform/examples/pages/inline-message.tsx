/* Inline Message examples: messages that sit inside the content they describe, in Đìzai Studio's Zen workspace (brief:
   docs/research/example-rebuild-brief-2026-09-30.md). A page- or app-wide condition is an Alert Banner, the result of
   one quick action is a Toast, and one bad field is that field's error text. The two screens (the sent invoice, the
   phone timesheet) sit in the new AppShell (2026-10-19). Each example is its own file in inline-message/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export, in the page's desktop
   window or phone, and shows its text as the snippet. */
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import SentInvoice from "./inline-message/editing-a-sent-invoice.example";
import sentInvoiceRaw from "./inline-message/editing-a-sent-invoice.example.tsx?raw";
import ErrorSummary from "./inline-message/form-error-summary.example";
import errorSummaryRaw from "./inline-message/form-error-summary.example.tsx?raw";
import VerifyDomain from "./inline-message/verify-a-domain.example";
import verifyDomainRaw from "./inline-message/verify-a-domain.example.tsx?raw";
import MoodboardReview from "./inline-message/moodboard-to-review.example";
import moodboardReviewRaw from "./inline-message/moodboard-to-review.example.tsx?raw";
import TimesheetPhone from "./inline-message/timesheet-on-a-phone.example";
import timesheetPhoneRaw from "./inline-message/timesheet-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "inline-message";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Editing a sent invoice",
    description: "Alex edits an invoice Phin & Co already has, in the studio's app. A Warning at the top of the form says what saving will do before anyone types; it is essential context, so it has no close button and stays while the form is open. Beside the form, the line items and the history (Trang Le asked for the PO number) say why the edit happens, and saving adds the new copy to it.",
    wide: true,
    screen: true,
    render: () => <PreviewAppFrame height={{ min: 640, max: 820 }}><SentInvoice /></PreviewAppFrame>,
    code: exampleCode(sentInvoiceRaw),
  },
  {
    title: "Form error summary",
    description: "After a failed submit, a Negative summary above the fields counts what is left to fix while each field keeps its own error, and focus moves to the first one. The count drops as fields are fixed and the summary leaves with the last error.",
    render: () => <ErrorSummary />,
    code: exampleCode(errorSummaryRaw),
  },
  {
    title: "Verify a domain",
    description: "The check's result stays next to the records it is about, in one slot whose theme follows the check: Info while it runs, Negative with Check again when the record is missing, Positive once it is found.",
    render: () => <VerifyDomain />,
    code: exampleCode(verifyDomainRaw),
  },
  {
    title: "Moodboard to review",
    description: "Theme Custom takes your own visual, here a thumbnail of the moodboard it announces. Review opens it; approving resolves the message, and closing it leaves Show message again in its place.",
    render: () => <MoodboardReview />,
    code: exampleCode(moodboardReviewRaw),
  },
  {
    title: "Timesheet on a phone",
    description: "In the studio's phone app Alex opens last week's timesheet from Me. The message sits in the page flow, right above the week it is about; each week is a white block under its kicker on the grey Canvas, and Submit waits in the Action bar. Submitting with a gap turns the same Warning Negative rather than stacking a second message; Back shows the Me row with the new status.",
    render: () => <PlatformPhoneApp label="Zen app" app={TimesheetPhone} />,
    code: exampleCode(timesheetPhoneRaw),
  },
]);
