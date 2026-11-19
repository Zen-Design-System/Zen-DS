/* Date Picker examples (docs/research/example-rebuild-brief-2026-09-30.md): dates in Đìzai Studio's Zen workspace — a
   task's due date, a birthday, time off, an invoice filter, contract dates, design reviews on a phone, and two consumer
   phone apps (a delivery day, a stay).
   Each example is its own file in date-picker/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the
   card renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import DueDate from "./date-picker/due-date.example";
import dueDate from "./date-picker/due-date.example.tsx?raw";
import Birthday from "./date-picker/date-of-birth.example";
import birthday from "./date-picker/date-of-birth.example.tsx?raw";
import TimeOff from "./date-picker/time-off-request.example";
import timeOff from "./date-picker/time-off-request.example.tsx?raw";
import InvoiceFilter from "./date-picker/filter-by-issue-date.example";
import invoiceFilter from "./date-picker/filter-by-issue-date.example.tsx?raw";
import ContractDates from "./date-picker/contract-dates.example";
import contractDates from "./date-picker/contract-dates.example.tsx?raw";
import ReviewSchedule from "./date-picker/schedule-a-review.example";
import reviewSchedule from "./date-picker/schedule-a-review.example.tsx?raw";
import DeliveryDay from "./date-picker/a-delivery-day-on-a-phone.example";
import deliveryDay from "./date-picker/a-delivery-day-on-a-phone.example.tsx?raw";
import StayOnPhone from "./date-picker/a-stay-on-a-phone.example";
import stayOnPhone from "./date-picker/a-stay-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "date-picker";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Due date",
    description: "A DateField takes a typed date or opens the calendar on focus; the help text turns the date into what it means for the task. A date that can't be read, or one in the past, is an error on Create task.",
    render: () => <DueDate />,
    code: exampleCode(dueDate),
  },
  {
    title: "Date of birth",
    description: "A date decades away is typed, or found through the month and year wheel in the calendar header. The field checks the format and the age when focus leaves it, and again on Save.",
    render: () => <Birthday />,
    code: exampleCode(birthday),
  },
  {
    title: "Time off request",
    description: "An inline range calendar has no popover surface, so it shares one card with the request it builds. It opens on this month, so the past days show as disabled; the summary counts working days against the balance and holds the request back when it runs over.",
    wide: true,
    render: () => <TimeOff />,
    code: exampleCode(timeOff),
  },
  {
    title: "Filter by issue date",
    description: "An Advanced chip opens the calendar as a popover anchored to it. Picks stay a draft until Submit filters the table; Cancel or Escape drops them and returns focus to the chip.",
    wide: true,
    render: () => <InvoiceFilter />,
    code: exampleCode(invoiceFilter),
  },
  {
    title: "Contract dates",
    description: "The start date is Read-only: people can read and copy it, and it never opens a calendar. The end date is Disabled while the contract is permanent, and its help text says why.",
    render: () => <ContractDates />,
    code: exampleCode(contractDates),
  },
  {
    title: "Schedule a review",
    description: "On a phone the calendar sits in the screen with the Time-Picker under it, a dot under each day that already has reviews. The footer shows the picked slot and schedules the review once there is a date; the review lands in its week of the list, and Back asks before it drops a filled-in draft.",
    render: () => <PlatformPhoneApp label="Design reviews" app={ReviewSchedule} />,
    code: exampleCode(reviewSchedule),
  },
  {
    title: "A delivery day on a phone",
    description: "The picked day leads the sheet (header=\"selection\", Figma .Primitives/Date-Picker): the title is a caption over the date, which changes as you pick, and OK moves the delivery. The pencil trades the calendar for typing the date.",
    render: () => <PlatformPhoneApp label="Your order" app={DeliveryDay} />,
    code: exampleCode(deliveryDay),
  },
  {
    title: "A stay on a phone",
    description: "On a phone dates open in a Bottom Sheet (Figma Date-Picker/Mobile). The stay's months scroll one under another with the weekdays pinned on top; the footer prices the nights as you pick and OK applies the range. The pickup date is a DateField, which opens the one-month sheet with Cancel and OK on a phone.",
    render: () => <PlatformPhoneApp label="Saola Lodge" app={StayOnPhone} />,
    code: exampleCode(stayOnPhone),
  },
]);
