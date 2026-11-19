/* Stepper examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio sets up projects, imports
   timesheets, approves invoices and onboards new hires in Zen; the phone example is the Phin & Co app the studio
   builds.
   Each example is its own file in stepper/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export (the phone app inside the device) and shows its text as the snippet. */
import { useLayoutEffect, useState, type ComponentType } from "react";
import type { StepperOrientation } from "../../../components/Stepper";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import NewProject from "./stepper/new-project.example";
import newProject from "./stepper/new-project.example.tsx?raw";
import FailedCheck from "./stepper/failed-check.example";
import failedCheck from "./stepper/failed-check.example.tsx?raw";
import InvoiceApproval from "./stepper/invoice-approval.example";
import invoiceApproval from "./stepper/invoice-approval.example.tsx?raw";
import NewHireOnboarding from "./stepper/new-hire-onboarding.example";
import newHireOnboarding from "./stepper/new-hire-onboarding.example.tsx?raw";
import PickupOrders from "./stepper/pickup-order.example";
import pickupOrder from "./stepper/pickup-order.example.tsx?raw";

export const page: PlatformPage = "stepper";

/** Below this width per step the titles would squeeze, so the stepper turns vertical. */
const MIN_STEP_WIDTH = 104;

/**
 * A stepper example in its card. A card is narrower than the window (two side by side, a thumbnail), so the page
 * measures the column the stepper sits in and passes its orientation: horizontal while every step gets 104px,
 * vertical in a narrower column. The hidden anchor finds the card's preview without a wrapper around the example.
 */
function StepperRoom({ app: App, steps }: { app: ComponentType<{ orientation?: StepperOrientation }>; steps: number }) {
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const column = anchor?.parentElement?.querySelector(".zen-stepper")?.parentElement;
    if (!column) return undefined;
    setWidth(column.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(column);
    return () => observer.disconnect();
  }, [anchor]);
  return <><App orientation={width >= steps * MIN_STEP_WIDTH ? "horizontal" : "vertical"} /><span ref={setAnchor} hidden /></>;
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "New project",
    wide: true,
    description: "A horizontal stepper over a four-step form: Continue checks only this step's fields, passed steps are buttons that go back to edit, and each new step moves focus to its heading. When a step would get less than 104px, as on a phone, the stepper turns vertical instead of squeezing its titles.",
    render: () => <StepperRoom app={NewProject} steps={4} />,
    code: exampleCode(newProject),
  },
  {
    title: "Failed check",
    description: "When a step fails, error marks it in the stepper and a Negative Inline Message under it says what is wrong and offers the fix. Once fixed the step turns valid, and the import ends with a toast that can undo it.",
    render: () => <StepperRoom app={FailedCheck} steps={4} />,
    code: exampleCode(failedCheck),
  },
  {
    title: "Invoice approval",
    description: "A vertical stepper without onStepClick tracks who has to act: no step is a button, and the captions name the person and since when. Approving moves the invoice on to Finance, and the toast can undo it. The steps are StepperStep children, Figma's steps slot (a steps array works the same).",
    render: () => <InvoiceApproval />,
    code: exampleCode(invoiceApproval),
  },
  {
    title: "New hire onboarding",
    wide: true,
    description: "Longer step titles sit in a vertical stepper beside the step, and each caption shows the answer given there, so the stepper doubles as a summary. People Ops finished the first two steps; they stay reachable to check, and steps ahead stay inert.",
    render: () => <NewHireOnboarding />,
    code: exampleCode(newHireOnboarding),
  },
  {
    title: "Pickup order",
    description: "On a phone, a vertical stepper with icons (Style=Icon) tracks an order the customer can't change. The order opens from the Orders list (Back returns to it); it moves on by itself when the order is ready, and the ActionBar then offers Confirm pickup, and after that Order again.",
    render: () => <PlatformPhoneApp label="Phin & Co orders" app={PickupOrders} />,
    code: exampleCode(pickupOrder),
  },
]);
