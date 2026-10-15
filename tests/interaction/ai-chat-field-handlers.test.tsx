/**
 * Backlog (2026-10-07 sweep, P2): AiChatField drew "+", the microphone and Start voice mode without `onAttach` /
 * `onVoice`, so they were dead clicks. They now appear only with their handler; the empty field shows a disabled Send.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { AiChatField } from "../../src/index";

describe("AiChatField actions", () => {
  it("draws no + or microphone without handlers, and a disabled Send while empty", async () => {
    const screen = await render(<AiChatField onSubmit={() => {}} />);
    expect(document.querySelectorAll(".zen-ai-field button").length).toBe(1);
    await expect.element(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("draws them with handlers", async () => {
    const onAttach = vi.fn();
    const onVoice = vi.fn();
    const screen = await render(<AiChatField onSubmit={() => {}} onAttach={onAttach} onVoice={onVoice} />);
    await screen.getByRole("button", { name: "Add files and tools" }).click();
    await screen.getByRole("button", { name: "Dictate" }).click();
    await screen.getByRole("button", { name: "Start voice mode" }).click();
    expect(onAttach).toHaveBeenCalledTimes(1);
    expect(onVoice).toHaveBeenCalledTimes(2);
  });

  // Compose while typing (2026-10-15): Tab keeps the guessed intent (onAccept) and still moves focus, never a trap;
  // Escape clears only while the app passes onClear.
  it("Tab accepts without trapping focus, Escape clears only with its handler", async () => {
    const onAccept = vi.fn();
    const onClear = vi.fn();
    const onValueChange = vi.fn();
    const screen = await render(<AiChatField onSubmit={() => {}} defaultValue="schedule a review" onAccept={onAccept} onClear={onClear} onValueChange={onValueChange} />);
    const field = screen.getByRole("textbox").element() as HTMLTextAreaElement;
    field.focus();
    expect(field.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }))).toBe(true);
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(field.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }))).toBe(true);
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(field.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))).toBe(false);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith("");
    await expect.element(screen.getByRole("textbox")).toHaveValue("");
  });

  it("without the handlers Tab and Escape are left to the browser", async () => {
    const screen = await render(<AiChatField onSubmit={() => {}} defaultValue="hello" />);
    const field = screen.getByRole("textbox").element() as HTMLTextAreaElement;
    field.focus();
    expect(field.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }))).toBe(true);
    expect(field.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))).toBe(true);
    await expect.element(screen.getByRole("textbox")).toHaveValue("hello");
  });
});
