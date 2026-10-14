/**
 * The AI UI renderer (src/ai-ui/render.tsx) in a real browser: a spec renders Zen components, `$state` pairs write the
 * shared state and emit events, `$action` reaches the app with resolved args, open/close toggle an overlay by id,
 * `$map` repeats a node per item, `pending` draws Skeletons, ops re-render in place, Markdown renders.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ZenProvider } from "../../src/index";
import { AiUi, applyOps, markdownToSpec, validateSpec, type Catalog, type UiEvent, type UiSpec } from "../../src/ai-ui/index";
import catalogJson from "../../docs/ai-ui/catalog.json";
import booking from "../../tools/ai-ui/fixtures/booking.json";
import list from "../../tools/ai-ui/fixtures/list.json";

const catalog = catalogJson as unknown as Catalog;
const spec = (root: UiSpec["root"], rest: Partial<UiSpec> = {}): UiSpec => ({ version: 1, root, ...rest });

describe("AiUi renders a spec", () => {
  it("renders the booking fixture with ids on every element and no console error", async () => {
    const screen = await render(<ZenProvider><div style={{ width: 640 }}><AiUi spec={booking as unknown as UiSpec} catalog={catalog} /></div></ZenProvider>);
    const root = screen.container.querySelector('[data-ai-ui-id="root"]');
    expect(root).not.toBeNull();
    expect(screen.container.querySelectorAll("[data-ai-ui-id]").length).toBeGreaterThanOrEqual(8);
    expect(screen.getByRole("button", { name: "Book" }).element()).toBeTruthy();
    // Data: the options came from `data.services` through { "$ref" }.
    expect(screen.container.textContent).toContain("Haircut");
  });

  it("binds a controlled pair to shared state by node id (Checkbox checked ⇄ onCheckedChange)", async () => {
    const events: UiEvent[] = [];
    const states: Record<string, unknown>[] = [];
    const screen = await render(
      <ZenProvider>
        <AiUi spec={spec({ type: "Checkbox", id: "agree", props: { label: "I agree" } })} catalog={catalog} onEvent={(e) => events.push(e)} onStateChange={(next) => states.push(next)} />
      </ZenProvider>,
    );
    await userEvent.click(screen.getByText("I agree").element());
    await expect.poll(() => (screen.container.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true);
    expect(states.at(-1)).toEqual({ agree: { checked: true } });
    expect(events.at(-1)).toMatchObject({ type: "state", id: "agree", prop: "checked", path: "agree.checked", value: true });
  });

  it("writes a `$state` path and reads it back when the state is controlled", async () => {
    const onStateChange = vi.fn();
    const segmented = spec({ type: "Segmented", id: "view", props: { "aria-label": "View", options: [{ id: "list", label: "List" }, { id: "grid", label: "Grid" }], value: { $state: "view" } } });
    expect(validateSpec(segmented, catalog).errors).toEqual([]);
    function Host() {
      const [state, setState] = useState<Record<string, unknown>>({ view: "list" });
      return (
        <ZenProvider>
          <AiUi
            spec={segmented}
            catalog={catalog}
            state={state}
            onStateChange={(next, change) => { onStateChange(change); setState(next); }}
          />
          <output data-testid="view">{String(state.view)}</output>
        </ZenProvider>
      );
    }
    const screen = await render(<Host />);
    await userEvent.click(screen.getByRole("button", { name: "Grid" }).element());
    await expect.poll(() => screen.container.querySelector("output")?.textContent).toBe("grid");
    expect(onStateChange).toHaveBeenCalledWith({ path: "view", value: "grid", id: "view", prop: "value" });
    expect(screen.getByRole("button", { name: "Grid" }).element().getAttribute("aria-pressed")).toBe("true");
  });

  it("runs an `$action` with resolved args, the node id and the DOM event", async () => {
    const onAction = vi.fn();
    const ui = spec(
      { type: "Button", id: "book", props: { level: "primary", onClick: { $action: "book", args: { when: { $state: "when" }, slot: { $ref: "slots.0.value" }, fixed: 3 } } }, children: ["Book"] },
      { data: { slots: [{ value: "09:00" }] }, state: { when: { date: "2026-10-14" } } },
    );
    const screen = await render(<ZenProvider><AiUi spec={ui} catalog={catalog} onAction={onAction} /></ZenProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Book" }).element());
    expect(onAction).toHaveBeenCalledTimes(1);
    const call = onAction.mock.calls[0][0];
    expect(call).toMatchObject({ name: "book", id: "book", args: { when: { date: "2026-10-14" }, slot: "09:00", fixed: 3 } });
    expect(call.event[0]).toMatchObject({ type: "click" });
  });

  it("opens and closes an overlay by id with the built-in actions", async () => {
    const ui = spec({
      type: "Stack", id: "root",
      children: [
        { type: "Button", id: "delete", props: { level: "danger", onClick: { $action: "open", id: "confirm" } }, children: ["Remove"] },
        { type: "Dialog", id: "confirm", props: { title: "Delete project?", theme: "negative", primaryAction: { label: "Delete project", level: "danger", onClick: { $action: "confirmDelete" } }, secondaryAction: { label: "Cancel", onClick: { $action: "close", id: "confirm" } } }, children: ["This removes the project for everyone."] },
      ],
    });
    const onAction = vi.fn();
    const onStateChange = vi.fn();
    const screen = await render(<ZenProvider><AiUi spec={ui} catalog={catalog} onAction={onAction} onStateChange={onStateChange} /></ZenProvider>);
    const dialog = () => document.querySelector('[role="dialog"], [role="alertdialog"]');
    expect(dialog()).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }).element());
    expect(onStateChange).toHaveBeenCalledWith({ confirm: { open: true } }, { path: "confirm.open", value: true, id: "confirm", prop: "open" });
    // A negative Dialog is an alertdialog.
    await expect.poll(dialog).not.toBeNull();
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ name: "open", id: "delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }).element());
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ name: "close", id: "confirm" }));
    await expect.poll(() => document.querySelector('[role="dialog"]:not([data-state="closing"]), [role="alertdialog"]:not([data-state="closing"])')).toBeNull();
  });

  it("repeats a node per item with `$map`, row-suffixed ids, and draws Skeletons for pending content", async () => {
    const screen = await render(<ZenProvider><AiUi spec={list as unknown as UiSpec} catalog={catalog} /></ZenProvider>);
    const rows = screen.container.querySelectorAll('[data-ai-ui-id^="order:"]');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute("data-ai-ui-id")).toBe("order:0");
    expect(rows[0].textContent).toContain("Order #1041");
    expect(rows[1].textContent).toContain("₫320.000");
    expect(screen.container.querySelectorAll(".zen-skeleton-shape").length).toBe(1);
    expect(screen.container.querySelector('[data-ai-ui-id="loading"] .zen-skeleton-heading')).not.toBeNull();
    expect(screen.container.querySelector('[data-ai-ui-id="loading"] .zen-skeleton-text')).not.toBeNull();
    expect(screen.container.querySelectorAll("table tbody tr").length).toBe(2);
  });

  it("emits a `$map` action with the row's data resolved through the alias", async () => {
    const onAction = vi.fn();
    const screen = await render(<ZenProvider><AiUi spec={list as unknown as UiSpec} catalog={catalog} onAction={onAction} /></ZenProvider>);
    await userEvent.click(screen.container.querySelector('[data-ai-ui-id="order:1"] button, [data-ai-ui-id="order:1"]') as HTMLElement);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ name: "openOrder", id: "order:1", args: { id: "o2" } }));
  });

  it("coerces an ISO string into a Date where the catalog says `date`", async () => {
    const ui = spec({ type: "DatePicker", id: "cal", props: { "aria-label": "Pick a date", selectionMode: "single", value: "2026-10-14", month: "2026-10-01", today: "2026-10-01", onClose: { $action: "closed" } } });
    expect(validateSpec(ui, catalog).ok).toBe(true);
    const screen = await render(<ZenProvider><AiUi spec={ui} catalog={catalog} /></ZenProvider>);
    // The day item of the value carries the Figma state Single-Selected; without the Date coercion it would be a string and nothing would be selected.
    await expect.poll(() => screen.container.querySelector('[data-state="single-selected"]')?.textContent).toBe("14");
  });

  it("re-renders an edited spec in place and keeps the person's state", async () => {
    const onStateChange = vi.fn();
    function Host() {
      const [current, setCurrent] = useState(booking as unknown as UiSpec);
      return (
        <ZenProvider>
          <AiUi spec={current} catalog={catalog} onStateChange={onStateChange} />
          <button type="button" data-testid="edit" onClick={() => setCurrent((s) => applyOps(s, [{ op: "setProp", id: "book", name: "level", value: "accent" }, { op: "setText", id: "title", text: "Book a visit" }]))}>edit</button>
        </ZenProvider>
      );
    }
    const screen = await render(<Host />);
    await userEvent.click(screen.getByRole("radio", { name: "10:30" }).element());
    expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ when: expect.objectContaining({ slot: "10:30", service: "cut" }) }), expect.anything());
    await userEvent.click(screen.container.querySelector('[data-testid="edit"]') as HTMLElement);
    await expect.poll(() => screen.container.querySelector('[data-ai-ui-id="book"]')?.getAttribute("data-level")).toBe("accent");
    expect(screen.container.querySelector('[data-ai-ui-id="title"]')?.textContent).toBe("Book a visit");
    expect(screen.getByRole("radio", { name: "10:30" }).element().getAttribute("aria-checked")).toBe("true");
  });

  it("renders a Markdown answer as Zen text, list, link and table", async () => {
    const ui = markdownToSpec("## Your visit\n\nWe found **3 slots** on Tuesday, see [the list](https://example.com/slots).\n\n- 09:00\n- 10:30\n\n| Service | Price |\n|---|---|\n| Haircut | 250k |\n");
    expect(validateSpec(ui, catalog).ok).toBe(true);
    const screen = await render(<ZenProvider><AiUi spec={ui} catalog={catalog} /></ZenProvider>);
    expect(screen.getByRole("heading", { name: "Your visit" }).element()).toBeTruthy();
    expect(screen.container.querySelector("strong")?.textContent).toBe("3 slots");
    expect(screen.container.querySelector("a")?.getAttribute("href")).toBe("https://example.com/slots");
    expect(screen.container.querySelectorAll("ul li").length).toBe(2);
    expect(screen.container.querySelectorAll("table tbody tr").length).toBe(1);
  });

  it("renders nothing for an unknown component instead of throwing", async () => {
    const screen = await render(<ZenProvider><AiUi spec={spec({ type: "Stack", id: "root", children: [{ type: "Nope", id: "x" }, "after"] })} catalog={catalog} /></ZenProvider>);
    expect(screen.container.querySelector('[data-ai-ui-id="x"]')).toBeNull();
    expect(screen.container.textContent).toContain("after");
  });
});
