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
});
