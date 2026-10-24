/**
 * Zen Studio option C (user, 2026-10-23: links between components are prototype actions): in Play an Overlay's DatePicker
 * opens next to the Chip that opens it and an Overlay at Position Manual next to its Button (Figma's Manual, by the
 * trigger); Filter table filters the Screen's Table; Change step moves its Stepper; Navigate to reaches a Screen's state.
 * The page is parsed by the Studio's engine and played by playFlow.tsx, as Play does. Real browser (Chromium).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page as browser, userEvent } from "vitest/browser";
import { ToastProvider } from "../../src/components/Toast";
import { ZenProvider } from "../../src/index";
import type { PageTree } from "../../src/platform/studio/builder/render/renderPage";
import { PlayScreens, usePlayFlow } from "../../src/platform/studio/builder/proto/playFlow";
import { parsePage } from "../../tools/studio/browser-engine.mjs";
import "../../src/platform/studio/builder/builder.css";

const page = (body: string, imports: string) => `// @zen-page {"format":1,"title":"Option C"}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { ${imports} } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
${body}
    </Board>
  );
}
`;

function Play({ tree }: { tree: PageTree }) {
  const flow = usePlayFlow(tree, null);
  return (
    <>
      <button type="button" onClick={flow.restart}>Restart</button>
      <div className="studio-player__device" data-screen-id={flow.current} style={{ width: 1024, height: 700 }}>
        <PlayScreens flow={flow} file="local:option-c.zen.tsx" />
      </div>
    </>
  );
}

async function play(text: string) {
  const tree = parsePage(text) as unknown as PageTree & { errors: unknown[] };
  expect(tree.errors).toEqual([]);
  return await render(<ZenProvider><ToastProvider><Play tree={tree} /></ToastProvider></ZenProvider>);
}

const box = (element: Element) => element.getBoundingClientRect();
const device = () => document.querySelector(".studio-player__device")!;

describe("Studio option C in Play", () => {
  it("opens a DatePicker below its Chip, closes it on a picked day, and the Chip pressed again closes it", async () => {
    const screen = await play(page(`      <Screen id="orders" title="Orders">
        <Stack gap="md" padding="lg">
          <Chip onClick={proto.open("pick-date")}>Date</Chip>
        </Stack>
      </Screen>
      <Overlay id="pick-date">
        <DatePicker />
      </Overlay>`, "Chip, DatePicker, Stack"));
    const chip = screen.getByRole("button", { name: "Date" });
    await chip.click();
    await expect.poll(() => document.querySelector(".zen-date-picker")).not.toBeNull();
    const picker = document.querySelector(".zen-date-picker")!;
    await expect.poll(() => Math.round(box(picker).top - box(chip.element()).bottom)).toBe(4);
    expect(Math.round(box(picker).left - box(chip.element()).left)).toBe(0);
    await userEvent.click(picker.querySelectorAll(".zen-date-picker__day:not(:disabled)")[10]);
    await expect.poll(() => document.querySelector(".zen-date-picker")).toBeNull();
    await chip.click();
    await expect.poll(() => document.querySelector(".zen-date-picker")).not.toBeNull();
    await chip.click();
    await expect.poll(() => document.querySelector(".zen-date-picker")).toBeNull();
  });

  it("places an Overlay at Position Manual below the Button that opens it", async () => {
    const screen = await play(page(`      <Screen id="orders" title="Orders">
        <Stack gap="md" padding="lg">
          <Text>Orders</Text>
          <Button onClick={proto.open("tip")}>Tip</Button>
        </Stack>
      </Screen>
      <Overlay id="tip" position="manual">
        <Card>
          <Text>Pick a day first</Text>
        </Card>
      </Overlay>`, "Button, Card, Stack, Text"));
    const button = screen.getByRole("button", { name: "Tip" });
    await button.click();
    await expect.poll(() => document.querySelector('.studio-player__overlay[data-position="manual"] .studio-player__overlay-content')).not.toBeNull();
    const card = document.querySelector(".studio-player__overlay-content")!;
    await expect.poll(() => Math.round(box(card).top - box(button.element()).bottom)).toBe(4);
    expect(Math.round(box(card).left - box(button.element()).left)).toBe(0);
    expect(box(card).top).toBeGreaterThan(box(device()).top + 40);
  });

  it("filters the Screen's Table by a filter Chip (pressed twice: every row) and by what a Search types", async () => {
    const screen = await play(page(`      <Screen id="orders" title="Orders">
        <Stack gap="md" padding="lg">
          <Chip onClick={proto.filter({ column: "status", value: "Paid" })}>Paid</Chip>
          <Search aria-label="Search orders" onValueChange={proto.filter({ column: "client", match: "contains" })} />
          <Table aria-label="Orders" columns={[{ id: "client", header: "Client" }, { id: "status", header: "Status" }]} rows={[{ id: "1", client: "Acme", status: "Paid" }, { id: "2", client: "Globex", status: "Overdue" }, { id: "3", client: "Initech", status: "Paid" }]} />
        </Stack>
      </Screen>`, "Chip, Search, Stack, Table"));
    const clients = () => [...document.querySelectorAll(".zen-table tbody tr.zen-table__row")].map((row) => row.textContent?.match(/Acme|Globex|Initech/)?.[0]);
    await expect.poll(clients).toEqual(["Acme", "Globex", "Initech"]);
    await screen.getByRole("button", { name: "Paid" }).click();
    await expect.poll(clients).toEqual(["Acme", "Initech"]);
    await screen.getByRole("button", { name: "Paid" }).click();
    await expect.poll(clients).toEqual(["Acme", "Globex", "Initech"]);
    await screen.getByLabelText("Search orders").fill("glo");
    await expect.poll(clients).toEqual(["Globex"]);
    await screen.getByLabelText("Search orders").fill("");
    await expect.poll(clients).toEqual(["Acme", "Globex", "Initech"]);
  });

  it("a filter Chip shows its pick and clears it (picked again, ×), narrows with a Search and another chip; Restart starts over", async () => {
    const screen = await play(page(`      <Screen id="tasks" title="Tasks">
        <Stack gap="md" padding="lg">
          <Search aria-label="Search tasks" onValueChange={proto.filter({ column: "title", match: "contains" })} />
          <Chip dropdown popoverItems={[{ id: "todo", label: "To do" }, { id: "doing", label: "Doing" }]} onPopoverSelect={proto.filter({ column: "status" })}>Status</Chip>
          <Chip dropdown popoverItems={[{ id: "high", label: "High" }, { id: "low", label: "Low" }]} onPopoverSelect={proto.filter({ column: "priority" })}>Priority</Chip>
          <Table aria-label="Tasks" columns={[{ id: "title", header: "Task" }, { id: "status", header: "Status" }, { id: "priority", header: "Priority" }]} rows={[{ id: "1", title: "Alpha", status: "Doing", priority: "High" }, { id: "2", title: "Beta", status: "To do", priority: "High" }, { id: "3", title: "Gamma", status: "Doing", priority: "Low" }, { id: "4", title: "Delta", status: "Doing", priority: "High" }]} />
        </Stack>
      </Screen>`, "Chip, Search, Stack, Table"));
    const titles = () => [...document.querySelectorAll(".zen-table tbody tr.zen-table__row")].map((row) => row.textContent?.match(/Alpha|Beta|Gamma|Delta/)?.[0]);
    const chip = (index: number) => document.querySelectorAll<HTMLElement>(".zen-chip")[index];
    const label = (index: number) => chip(index).querySelector(".zen-chip__label")?.textContent;
    const pick = async (index: number, option: string) => {
      await userEvent.click(chip(index));
      await browser.getByRole("option", { name: option }).click();
    };
    const all = ["Alpha", "Beta", "Gamma", "Delta"];
    await expect.poll(titles).toEqual(all);
    await pick(0, "Doing");
    await expect.poll(titles).toEqual(["Alpha", "Gamma", "Delta"]);
    expect(label(0)).toBe("Doing");
    expect(chip(0).getAttribute("data-select")).toBe("true");
    await pick(0, "Doing");
    await expect.poll(titles).toEqual(all);
    expect(label(0)).toBe("Status");
    await pick(0, "Doing");
    await pick(1, "High");
    await expect.poll(titles).toEqual(["Alpha", "Delta"]);
    await screen.getByLabelText("Search tasks").fill("del");
    await expect.poll(titles).toEqual(["Delta"]);
    await screen.getByLabelText("Search tasks").fill("");
    await expect.poll(titles).toEqual(["Alpha", "Delta"]);
    chip(0).querySelector<HTMLElement>(".zen-chip__remove")!.click();
    await expect.poll(titles).toEqual(["Alpha", "Beta", "Delta"]);
    expect(label(0)).toBe("Status");
    expect(chip(0).getAttribute("data-select")).toBe("false");
    expect(label(1)).toBe("High");
    await screen.getByRole("button", { name: "Restart" }).click();
    await expect.poll(titles).toEqual(all);
    await expect.poll(() => label(1)).toBe("Priority");
  });

  it("moves the Screen's Stepper with Next and Previous, back to a passed step, and navigates to a Screen's state", async () => {
    const screen = await play(page(`      <Screen id="checkout" title="Checkout">
        <Stack gap="md" padding="lg">
          <Stepper steps={[{ id: "cart", title: "Cart" }, { id: "pay", title: "Pay" }, { id: "ship", title: "Ship" }]} />
          <Button onClick={proto.step("next")}>Next</Button>
          <Button onClick={proto.step("previous")}>Previous</Button>
          <Button onClick={proto.navigate("checkout:done")}>Finish</Button>
        </Stack>
      </Screen>
      <Screen id="checkout" title="Checkout · done" state="done">
        <Text>All done</Text>
      </Screen>`, "Button, Stack, Stepper, Text"));
    const current = () => document.querySelector('.zen-stepper__step[aria-current="step"]')?.textContent ?? "";
    await expect.poll(current).toContain("Cart");
    await screen.getByRole("button", { name: "Next" }).click();
    await expect.poll(current).toContain("Pay");
    await screen.getByRole("button", { name: "Next" }).click();
    await screen.getByRole("button", { name: "Next" }).click();
    await expect.poll(current).toContain("Ship");
    await screen.getByRole("button", { name: "Previous" }).click();
    await expect.poll(current).toContain("Pay");
    await userEvent.click(document.querySelector(".zen-stepper__step button")!);
    await expect.poll(current).toContain("Cart");
    await screen.getByRole("button", { name: "Finish" }).click();
    await expect.poll(() => device().getAttribute("data-screen-id")).toBe("checkout:done");
    await expect.element(screen.getByText("All done")).toBeVisible();
  });
});
