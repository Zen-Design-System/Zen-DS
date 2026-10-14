/**
 * SliderField (2026-10-14, Figma Slider/Field 15662:108207): a number that is also a slider. Arrow keys step, a click
 * without a drag types an exact number (Enter applies, Escape drops), a drag scrubs; the fill follows the value.
 * Real browser (Chromium).
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { SliderField, ZenProvider } from "../../src/index";

const nextFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));

describe("SliderField", () => {
  it("is a named slider that steps with the arrow keys", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><div style={{ width: 320 }}><SliderField label="Scale" defaultValue={0.7} min={0} max={1} step={0.01} onValueChange={onValueChange} /></div></ZenProvider>);
    const slider = screen.getByRole("slider", { name: "Scale" });
    await expect.element(slider).toHaveAttribute("aria-valuetext", "0.70");
    (slider.element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(0.71);
    await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(onValueChange).toHaveBeenLastCalledWith(0.61);
    await userEvent.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    const fill = getComputedStyle(document.querySelector(".zen-slider-field__fill")!, "::before");
    const field = document.querySelector(".zen-slider-field")!.getBoundingClientRect();
    expect(Math.round(Number.parseFloat(fill.width))).toBe(Math.round(field.width));
  });

  it("types an exact number on Enter and applies it, clamped and on the step", async () => {
    function Controlled() {
      const [value, setValue] = useState(239);
      return <><SliderField label="Offset X" value={value} onValueChange={setValue} min={0} max={400} /><output>{value}</output></>;
    }
    const screen = await render(<ZenProvider><div style={{ width: 320 }}><Controlled /></div></ZenProvider>);
    (screen.getByRole("slider", { name: "Offset X" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await nextFrames();
    const input = document.querySelector<HTMLInputElement>(".zen-slider-field__input")!;
    expect(document.activeElement).toBe(input);
    expect(document.querySelector(".zen-slider-field")?.getAttribute("data-state")).toBe("typing");
    await userEvent.keyboard("{Control>}a{/Control}512.4{Enter}");
    await nextFrames();
    expect(document.querySelector("output")?.textContent).toBe("400");
    expect(document.activeElement?.getAttribute("role")).toBe("slider");
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await nextFrames();
    await userEvent.keyboard("{Control>}a{/Control}12{Escape}");
    await nextFrames();
    expect(document.querySelector("output")?.textContent).toBe("400");
  });

  it("scrubs with a drag and types after a plain click", async () => {
    const onValueChange = vi.fn();
    await render(<ZenProvider><div style={{ width: 320 }}><SliderField label="Duration" defaultValue={0.5} min={0} max={1} step={0.01} onValueChange={onValueChange} /></div></ZenProvider>);
    const control = document.querySelector<HTMLElement>(".zen-slider-field__control")!;
    const box = document.querySelector(".zen-slider-field")!.getBoundingClientRect();
    const at = (ratio: number) => ({ clientX: box.left + box.width * ratio, clientY: box.top + box.height / 2, pointerId: 1, bubbles: true, button: 0 });
    control.dispatchEvent(new PointerEvent("pointerdown", at(0.5)));
    control.dispatchEvent(new PointerEvent("pointermove", at(0.6)));
    control.dispatchEvent(new PointerEvent("pointermove", at(0.25)));
    await nextFrames();
    expect(document.querySelector(".zen-slider-field")?.getAttribute("data-state")).toBe("dragging");
    control.dispatchEvent(new PointerEvent("pointerup", at(0.25)));
    await nextFrames();
    expect(onValueChange).toHaveBeenLastCalledWith(0.25);
    expect(document.querySelector(".zen-slider-field")?.getAttribute("data-state")).toBe("default");
    control.dispatchEvent(new PointerEvent("pointerdown", at(0.5)));
    control.dispatchEvent(new PointerEvent("pointerup", at(0.5)));
    await nextFrames();
    expect(document.querySelector<HTMLInputElement>(".zen-slider-field__input")?.value).toBe("0.25");
  });

  it("does nothing while disabled", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><div style={{ width: 320 }}><SliderField label="Bounce" defaultValue={0.04} min={0} max={1} step={0.01} disabled onValueChange={onValueChange} /></div></ZenProvider>);
    const slider = screen.getByRole("slider", { name: "Bounce" });
    await expect.element(slider).toHaveAttribute("aria-disabled", "true");
    expect((slider.element() as HTMLElement).tabIndex).toBe(-1);
  });
});
