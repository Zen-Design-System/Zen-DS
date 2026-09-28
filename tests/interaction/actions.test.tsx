/**
 * Actions that must never be dead clicks (the behaviour probes' deadclick findings of 2026-09-28): a control either does
 * something visible when pressed, or it is not a control (or it is disabled while there is nothing to do).
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ChatReplyQuote, Chip, DatePicker, HeadingField, RichTextField, ZenProvider, type DatePickerRange } from "../../src/index";

/** A day of the calendar: "Day 10". */
const dayButton = (container: HTMLElement, day: number) => [...container.querySelectorAll<HTMLButtonElement>(".zen-date-picker__day")].find((button) => button.getAttribute("aria-label") === `Day ${day}`)!;

describe("Chip Number-only", () => {
  it("is a static count without onClick or selected, and a button with them", async () => {
    const screen = await render(<ZenProvider><Chip variant="number-only" value={12} data-testid="count" /><Chip variant="number-only" value={3} selected={false} onClick={() => undefined} data-testid="toggle" /></ZenProvider>);
    const count = screen.getByTestId("count").element();
    expect(count.tagName).toBe("SPAN");
    expect(count.getAttribute("data-static")).toBe("true");
    expect(count.matches(":focus-visible, [tabindex]")).toBe(false);
    expect(getComputedStyle(count).cursor).toBe("default");
    expect(screen.getByTestId("toggle").element().tagName).toBe("BUTTON");
    await expect.element(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("DatePicker actions: picks are a draft", () => {
  it("inline range: Submit waits for the end date and applies through onApply; Cancel returns to the applied range", async () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();
    const screen = await render(<ZenProvider><DatePicker selectionMode="range" defaultRange={{ start: new Date(2026, 8, 1), end: new Date(2026, 8, 5) }} showActions onApply={onApply} onCancel={onCancel} /></ZenProvider>);
    const root = screen.container as HTMLElement;
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const submit = screen.getByRole("button", { name: "Submit" });
    // Nothing to apply or drop yet.
    await expect.element(cancel).toBeDisabled();
    await expect.element(submit).toBeDisabled();
    await userEvent.click(dayButton(root, 10));
    await expect.element(cancel).toBeEnabled();
    await expect.element(submit).toBeDisabled();
    await userEvent.click(dayButton(root, 12));
    await expect.element(submit).toBeEnabled();
    await submit.click();
    expect(onApply).toHaveBeenCalledTimes(1);
    const [value, range] = onApply.mock.calls[0] as [Date | null, DatePickerRange];
    expect(value).toBeNull();
    expect([range.start.getDate(), range.end?.getDate()]).toEqual([10, 12]);
    await expect.element(submit).toBeDisabled();
    // A new draft, dropped: the calendar shows the applied 10–12 again.
    await userEvent.click(dayButton(root, 20));
    expect(dayButton(root, 20).dataset.state).toBe("range-selected-start");
    await cancel.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(dayButton(root, 10).dataset.state).toBe("range-selected-start");
    expect(dayButton(root, 12).dataset.state).toBe("range-selected-end");
    expect(dayButton(root, 20).dataset.state).not.toBe("range-selected-start");
    await expect.element(cancel).toBeDisabled();
  });

  it("keeps keyboard focus in the calendar when the pressed action turns disabled", async () => {
    const screen = await render(<ZenProvider><DatePicker selectionMode="range" defaultRange={{ start: new Date(2026, 8, 1), end: new Date(2026, 8, 5) }} showActions onApply={() => undefined} /></ZenProvider>);
    const root = screen.container as HTMLElement;
    await userEvent.click(dayButton(root, 14));
    await userEvent.click(dayButton(root, 16));
    (screen.getByRole("button", { name: "Submit" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Day 14");
  });

  it("controlled single date: value is the applied date, Cancel shows it again", async () => {
    function Controlled() {
      const [date, setDate] = useState<Date | null>(new Date(2026, 8, 3));
      return <><DatePicker value={date} showActions onApply={(picked) => setDate(picked)} /><output>{date ? date.getDate() : "none"}</output></>;
    }
    const screen = await render(<ZenProvider><Controlled /></ZenProvider>);
    const root = screen.container as HTMLElement;
    await userEvent.click(dayButton(root, 9));
    expect(dayButton(root, 9).dataset.state).toBe("single-selected");
    await screen.getByRole("button", { name: "Cancel" }).click();
    expect(dayButton(root, 3).dataset.state).toBe("single-selected");
    await userEvent.click(dayButton(root, 9));
    await screen.getByRole("button", { name: "Submit" }).click();
    await expect.poll(() => root.querySelector("output")?.textContent).toBe("9");
    expect(dayButton(root, 9).dataset.state).toBe("single-selected");
  });
});

describe("RichTextField: its own undo history", () => {
  it("Undo and Redo are disabled with nothing to undo or redo, and never undo another field", async () => {
    const screen = await render(<ZenProvider><HeadingField aria-label="Title" /><RichTextField label="Message" /></ZenProvider>);
    const undo = screen.getByRole("button", { name: "Undo" });
    const redo = screen.getByRole("button", { name: "Redo" });
    await expect.element(undo).toBeDisabled();
    await expect.element(redo).toBeDisabled();
    // Typing in another field is not this field's history.
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Launch");
    await expect.element(undo).toBeDisabled();
    const editor = screen.getByRole("textbox", { name: "Message" });
    await userEvent.click(editor);
    await userEvent.keyboard("Hello");
    await expect.element(undo).toBeEnabled();
    await expect.element(redo).toBeDisabled();
    await undo.click();
    expect(editor.element().textContent).toBe("");
    await expect.element(undo).toBeDisabled();
    await expect.element(redo).toBeEnabled();
    await redo.click();
    expect(editor.element().textContent).toBe("Hello");
    await expect.element(redo).toBeDisabled();
    // The keyboard uses the same history.
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(editor.element().textContent).toBe("");
    expect((screen.getByRole("textbox", { name: "Title" }).element() as HTMLInputElement).value).toBe("Launch");
  });
});

describe("ChatReplyQuote", () => {
  it("is a button that jumps to the original, but plain text for a deleted message", async () => {
    const screen = await render(
      <ZenProvider>
        <ChatReplyQuote side="others" replier="Chi Tran" target={{ id: "m1", author: "Bao Nguyen", kind: "text", text: "Lunch?" }} />
        <ChatReplyQuote side="others" replier="Chi Tran" target={{ id: "gone", author: "Bao Nguyen", kind: "deleted" }} />
      </ZenProvider>,
    );
    const quotes = [...(screen.container as HTMLElement).querySelectorAll<HTMLElement>(".zen-chat-reply__quote")];
    expect(quotes.map((quote) => quote.tagName)).toEqual(["BUTTON", "SPAN"]);
    expect(quotes[1].textContent).toContain("Message unavailable");
    expect(getComputedStyle(quotes[1]).cursor).toBe("default");
  });
});
