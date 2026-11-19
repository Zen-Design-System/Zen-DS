/* Description List examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Description List decision: one emphasised total
   closes a calculation, a row action is named after its row, long values stack and edit in place, a receipt in a
   phone's Bottom Sheet, values load in place under their terms in a docked panel, and a narrow column stacks the rows
   by itself. The two screens sit in an AppShell: the studio's Projects page (pattern top-bar, the panel docked) and
   the Phin & Co app's Orders root on a phone (the mobile Bar with the bottom bar).
   Each example is its own file in description-list/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11):
   the card renders its default export (inside the phone or the desktop frame) and shows its text as the snippet. */
import { useLayoutEffect, useState, type ComponentType } from "react";
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import InvoiceTotal from "./description-list/invoice-total.example";
import invoiceTotal from "./description-list/invoice-total.example.tsx?raw";
import PaymentDetails from "./description-list/copy-payment-details.example";
import copyPaymentDetails from "./description-list/copy-payment-details.example.tsx?raw";
import ContactDetails from "./description-list/edit-in-place.example";
import editInPlace from "./description-list/edit-in-place.example.tsx?raw";
import PhoneReceipts from "./description-list/receipt-on-a-phone.example";
import receiptOnAPhone from "./description-list/receipt-on-a-phone.example.tsx?raw";
import ProjectPanels from "./description-list/load-details-in-a-panel.example";
import loadDetailsInAPanel from "./description-list/load-details-in-a-panel.example.tsx?raw";
import TaskPage from "./description-list/narrow-side-column.example";
import narrowSideColumn from "./description-list/narrow-side-column.example.tsx?raw";

export const page: PlatformPage = "description-list";

/** The AppShell docks a Side Panel while the page keeps a tablet width (744) beside it (360): on the Top-Bar screen
 *  (no Sidebar) from 1104 wide. */
const DOCK_MIN_WIDTH = 360 + 744;

/**
 * The docked example in the desktop frame. The frame is narrower than the window (a card in the page, a thumbnail),
 * so the page measures it and tells the example whether the shell docks the panel there; narrower, the panel would be
 * a Modal, which never opens by itself.
 */
function DockingFrame({ app: App }: { app: ComponentType<{ docked?: boolean }> }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!frame) return undefined;
    setWidth(frame.offsetWidth);
    const observer = new ResizeObserver(() => setWidth(frame.offsetWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);
  return <PreviewAppFrame frameRef={setFrame}><App docked={width >= DOCK_MIN_WIDTH} /></PreviewAppFrame>;
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Invoice total",
    description: "An inline list closes the calculation with one emphasised row, the total, under a High rule. The discount keeps its minus sign and sits as a removable label beside its term while the invoice is a draft, so every amount, the total and Send invoice share one end edge; once it is sent, the rows are read-only.",
    render: () => <InvoiceTotal />,
    code: exampleCode(invoiceTotal),
  },
  {
    title: "Copy payment details",
    description: "Every value people paste into their bank app gets a Copy action, a Flat icon button named after its row (“Copy account number”), so each row has the same shape: values in one column, the copy icons on the list’s end edge. The icon turns into a check for two seconds and a hidden status region says what was copied.",
    render: () => <PaymentDetails />,
    code: exampleCode(copyPaymentDetails),
  },
  {
    title: "Edit in place",
    description: "Long values such as an address read better stacked. Each Edit names its row and turns one value into a field (a Text Area for the address), while the other rows' actions wait: Save or Enter keeps it, Cancel restores it, and focus returns to Edit. An empty value reads None with Add; a value people can't change says why.",
    render: () => <ContactDetails />,
    code: exampleCode(editInPlace),
  },
  {
    title: "Receipt on a phone",
    description: "In the Phin & Co app's Orders root (the AppShell's mobile Bar with the bottom bar), every past order opens its receipt in a Bottom Sheet: the items and a reward closed by one total row, then a second list for how it was paid. Order again adds the items to the cart; closing returns focus to the order's row.",
    render: () => <PlatformPhoneApp label="Phin & Co orders" app={PhoneReceipts} />,
    code: exampleCode(receiptOnAPhone),
  },
  {
    title: "Load details in a panel",
    screen: true,
    description: "The studio's Projects page in the AppShell's Top-Bar pattern: project details come from the server into the shell's Side Panel, docked beside the list, with the first project open. The terms are there at once and a Skeleton as tall as each value holds it (a pill for the Status Badge), so nothing moves when the data arrives; a request that fails shows a Negative Inline Message with Try again. When the page would get narrower than a tablet beside it, the AppShell opens the same panel as a Modal.",
    render: () => <DockingFrame app={ProjectPanels} />,
    code: exampleCode(loadDetailsInAPanel),
  },
  {
    title: "Narrow side column",
    wide: true,
    description: "In a task's side panel, about 260px wide, the inline rows stack by themselves because the list is narrower than stackBelow (280px); given more room, the same rows sit inline. Long values wrap instead of overflowing, an empty one reads None, and a Done task shows when it finished with Reopen task.",
    render: () => <TaskPage />,
    code: exampleCode(narrowSideColumn),
  },
]);
