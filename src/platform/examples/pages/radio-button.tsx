/* Radio Button examples (brief 2026-09-30). Each example is its own file in radio-button/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and shows its text as the
   snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import PaymentTerms from "./radio-button/payment-terms.example";
import paymentTerms from "./radio-button/payment-terms.example.tsx?raw";
import DeclineReview from "./radio-button/decline-with-a-reason.example";
import declineReview from "./radio-button/decline-with-a-reason.example.tsx?raw";
import ProjectVisibility from "./radio-button/project-visibility.example";
import projectVisibility from "./radio-button/project-visibility.example.tsx?raw";
import DateTime from "./radio-button/date-and-time.example";
import dateTime from "./radio-button/date-and-time.example.tsx?raw";
import DeliverySlot from "./radio-button/delivery-slot.example";
import deliverySlot from "./radio-button/delivery-slot.example.tsx?raw";

export const page: PlatformPage = "radio-button";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Payment terms",
    description: "Each caption states what the choice means, here the due date it sets. The studio's usual terms are pre-selected; arrow keys move and select within the group, and the group locks once the invoice is sent.",
    render: () => <PaymentTerms />,
    code: exampleCode(paymentTerms),
  },
  {
    title: "Decline with a reason",
    description: "With no safe default nothing is pre-selected, and submitting without a choice shows the error on the group. Picking Something else adds a required note field.",
    render: () => <DeclineReview />,
    code: exampleCode(declineReview),
  },
  {
    title: "Project visibility",
    description: "A settings section where each option is a card with a bold label and a caption, side by side on wide screens. An option that isn't available yet stays visible, disabled, with the reason in its caption; Cancel and Save wake up once the choice changes.",
    wide: true,
    render: () => <ProjectVisibility />,
    code: exampleCode(projectVisibility),
  },
  {
    title: "Date and time",
    description: "Two or three short options sit side by side (direction row), not in a column. A live preview shows what each choice changes before it is saved.",
    wide: true,
    render: () => <DateTime />,
    code: exampleCode(dateTime),
  },
  {
    title: "Delivery slot",
    description: "A phone screen for a Mekong Freight delivery: rows fill the width with the mark on the right (radioSide), a full slot stays visible but disabled, and Confirm slot in the ActionBar applies the choice. Back shows the shipment, and asks first when a new slot is not confirmed yet.",
    render: () => <PlatformPhoneApp label="Delivery" app={DeliverySlot} />,
    code: exampleCode(deliverySlot),
  },
]);
