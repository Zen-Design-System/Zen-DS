/**
 * ColorField · ColorPicker · ColorSwatch and the inline field layout (2026-10-14, Figma Input/Color-Field 15660:8643,
 * Color-Picker 15708:5927, Input/Inline-Field 15659:110823). Real browser (Chromium): keyboard, focus and layout are real.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { ColorField, ColorPicker, ColorSwatch, InputField, SelectField, ZenProvider } from "../../src/index";

const nextFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const channelValues = () => [...document.querySelectorAll<HTMLInputElement>(".zen-color-picker__channels input")].map((input) => input.value);

describe("ColorPicker", () => {
  it("shows the value in each format and changes saturation and brightness from the keyboard", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<ZenProvider><ColorPicker defaultValue="#1F6FEB" onValueChange={onValueChange} /></ZenProvider>);
    expect(document.querySelector(".zen-color-picker")?.getAttribute("role")).toBe("group");
    expect(channelValues()).toEqual(["1F6FEB"]);
    const area = screen.getByRole("slider", { name: "Saturation and brightness" });
    await expect.element(area).toHaveAttribute("aria-valuetext", "Saturation 87%, brightness 92%");
    (area.element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenLastCalledWith("#1F70EE");
    await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    await expect.element(area).toHaveAttribute("aria-valuetext", "Saturation 77%, brightness 93%");
  });

  it("switches the Format and applies an edited channel on Enter", async () => {
    const onValueChange = vi.fn();
    await render(<ZenProvider><ColorPicker defaultValue="#1F6FEB" onValueChange={onValueChange} /></ZenProvider>);
    const formatSelect = document.querySelector<HTMLButtonElement>(".zen-color-picker__value .zen-select__trigger")!;
    formatSelect.click();
    await nextFrames();
    (document.querySelector<HTMLElement>("[role='option'][data-value='rgb'], .zen-popover [role='option']:nth-child(2)") ?? [...document.querySelectorAll<HTMLElement>("[role='option']")].find((option) => option.textContent?.trim() === "RGB"))!.click();
    await nextFrames();
    expect(channelValues()).toEqual(["31", "111", "235"]);
    const red = document.querySelector<HTMLInputElement>(".zen-color-picker__channels input[aria-label='Red']")!;
    red.focus();
    red.select();
    await userEvent.keyboard("255{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith("#FF6FEB");
  });

  it("lays out as Figma: the Format row spans the panel and six saved colours fit one row", async () => {
    await render(<ZenProvider><div style={{ width: 216 }}><ColorPicker defaultValue="#1F6FEB" savedColors={["#1F6FEB", "#0E9F8E", "#2E9E4F", "#E07B12", "#E5533D", "#8E44C4"]} /></div></ZenProvider>);
    const value = document.querySelector(".zen-color-picker__value")!.getBoundingClientRect();
    const format = document.querySelector(".zen-color-picker__value > .zen-input-field")!.getBoundingClientRect();
    expect(Math.round(format.width)).toBe(Math.round(value.width));
    const tops = new Set([...document.querySelectorAll(".zen-color-picker__saved .zen-color-swatch")].map((swatch) => Math.round(swatch.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
  });

  it("keeps the hue of a grey picked from the saved colours", async () => {
    await render(<ZenProvider><ColorPicker defaultValue="#1F6FEB" savedColors={["#808080", "#FFFFFF"]} /></ZenProvider>);
    const hue = document.querySelector<HTMLInputElement>(".zen-color-picker__hue input")!;
    expect(hue.value).toBe("216");
    document.querySelector<HTMLInputElement>(".zen-color-picker__saved input[type='radio']")!.click();
    await nextFrames();
    expect(channelValues()).toEqual(["808080"]);
    expect(hue.value).toBe("216");
  });
});

describe("ColorField", () => {
  it("is a combobox that opens the picker on ArrowDown and returns focus on Escape", async () => {
    await render(<ZenProvider><ColorField label="Brand colour" defaultValue="#1F6FEB" /></ZenProvider>);
    const field = document.querySelector<HTMLInputElement>(".zen-color-field .zen-input__native")!;
    expect(field.getAttribute("role")).toBe("combobox");
    expect(field.getAttribute("aria-haspopup")).toBe("dialog");
    expect(field.value).toBe("#1F6FEB");
    field.focus();
    await userEvent.keyboard("{ArrowDown}");
    await nextFrames();
    expect(field.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.classList.contains("zen-color-picker__area")).toBe(true);
    expect(document.querySelector(".zen-color-picker")?.getAttribute("role")).toBe("dialog");
    await userEvent.keyboard("{Escape}");
    await nextFrames();
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(field);
  });

  it("applies six typed digits at once and a short hex on blur; other text goes back", async () => {
    function Controlled() {
      const [value, setValue] = useState("#1F6FEB");
      return <><ColorField label="Accent" value={value} onValueChange={setValue} colorPicker={false} /><output>{value}</output></>;
    }
    await render(<ZenProvider><Controlled /></ZenProvider>);
    const field = document.querySelector<HTMLInputElement>(".zen-color-field .zen-input__native")!;
    const output = document.querySelector("output")!;
    field.focus();
    field.select();
    await userEvent.keyboard("00aa55");
    expect(output.textContent).toBe("#00AA55");
    expect(document.querySelector<HTMLElement>(".zen-color-field .zen-swatch")!.style.getPropertyValue("--zen-swatch-color")).toBe("#00AA55");
    field.select();
    await userEvent.keyboard("f0a");
    field.blur();
    await nextFrames();
    expect(output.textContent).toBe("#FF00AA");
    field.focus();
    field.select();
    await userEvent.keyboard("nope");
    field.blur();
    await nextFrames();
    expect(field.value).toBe("#FF00AA");
  });

  it("puts the swatch after the value inline, sized to the field", async () => {
    await render(<ZenProvider><ColorField label="Shadow Tint" layout="inline" size="sm" defaultValue="#000000" /><ColorField label="XL" size="xl" defaultValue="#000000" /></ZenProvider>);
    const [inline, xl] = [...document.querySelectorAll<HTMLElement>(".zen-color-field")];
    expect(inline.querySelector(".zen-input__affordance--trailing .zen-swatch")?.getAttribute("data-size")).toBe("small");
    expect(xl.querySelector(".zen-input__affordance--leading .zen-swatch")?.getAttribute("data-size")).toBe("large");
  });
});

describe("Inline field layout", () => {
  it("draws the label inside the field and the value at the end, still naming the control", async () => {
    const screen = await render(<ZenProvider>
      <div style={{ width: 320 }}>
        <InputField layout="inline" label="Title" defaultValue="Japan" />
        <SelectField layout="inline" label="Photo Shape" options={[{ value: "portrait", label: "Portrait" }, { value: "square", label: "Square" }]} defaultValue="portrait" />
      </div>
    </ZenProvider>);
    await expect.element(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Japan");
    await expect.element(screen.getByRole("button", { name: "Photo Shape Portrait" })).toBeVisible();
    const field = document.querySelector<HTMLElement>(".zen-input-field[data-layout='inline']")!;
    expect(field.querySelector(".zen-input-label")).toBeNull();
    const control = field.querySelector(".zen-input__control")!.getBoundingClientRect();
    const label = field.querySelector(".zen-input__inline-label")!.getBoundingClientRect();
    expect(label.left - control.left).toBeLessThan(20);
    expect(getComputedStyle(field.querySelector(".zen-input__native")!).textAlign).toBe("end");
  });
});

describe("ColorSwatch", () => {
  it("is decorative unless named and follows the size scale", async () => {
    await render(<ZenProvider><ColorSwatch color="#1F6FEB" size="sm" /><ColorSwatch color="#FFFFFF" aria-label="White" size="large" /></ZenProvider>);
    const [plain, named] = [...document.querySelectorAll<HTMLElement>(".zen-swatch")];
    expect(plain.getAttribute("aria-hidden")).toBe("true");
    expect(named.getAttribute("role")).toBe("img");
    expect(plain.getBoundingClientRect().width).toBe(16);
    expect(named.getBoundingClientRect().width).toBe(24);
  });
});
