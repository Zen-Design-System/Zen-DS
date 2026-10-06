/**
 * Accordion Box hit area + concentric corners, BottomSheet form mode (Enter submits, primary = submit) and the one-row
 * narrow layout of NpsScale / OpinionScale. Real browser (Chromium), so layout and hit testing are real.
 */
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Accordion, BottomSheet, InputField, NpsScale, OpinionScale, ZenProvider } from "../../src/index";

const rect = (el: Element) => el.getBoundingClientRect();
const px = (value: string) => Number.parseFloat(value);

describe("Accordion Box", () => {
  // Figma Accordion/Text 239:16847 Theme=Box: padding Medium 16 / Large 16 / XLarge 24, header gap 8 / 12 / 16,
  // radius Large 16 / Large 16 / 2XLarge 24 (Rounded). Inset = padding − gap; trigger radius = box radius − inset.
  const cases = [
    { size: "md", padding: 16, inset: 8, radius: 16 },
    { size: "lg", padding: 16, inset: 4, radius: 16 },
    { size: "xl", padding: 24, inset: 8, radius: 24 },
  ] as const;

  for (const { size, padding, inset, radius } of cases) {
    it(`${size}: the whole header is the trigger and its corner is concentric with the box`, async () => {
      const screen = await render(
        <ZenProvider><div style={{ width: 480 }}><Accordion theme="box" size={size} title="Shipping">Ships in 2 days.</Accordion></div></ZenProvider>,
      );
      const trigger = screen.getByRole("button", { name: "Shipping" }).element() as HTMLElement;
      const box = trigger.closest(".zen-accordion") as HTMLElement;
      const title = box.querySelector(".zen-accordion__title") as HTMLElement;
      const b = rect(box);
      const t = rect(trigger);
      // The trigger covers the header up to the inset on every side (collapsed: the whole box).
      expect(t.left - b.left).toBeCloseTo(inset, 0);
      expect(b.right - t.right).toBeCloseTo(inset, 0);
      expect(t.top - b.top).toBeCloseTo(inset, 0);
      expect(b.bottom - t.bottom).toBeCloseTo(inset, 0);
      // The title stays where Figma puts it: the box padding from the edge.
      expect(rect(title).left - b.left).toBeCloseTo(padding, 0);
      // Concentric corners: box radius = trigger radius + inset.
      expect(px(getComputedStyle(box).borderTopLeftRadius)).toBe(radius);
      expect(px(getComputedStyle(trigger).borderTopLeftRadius) + inset).toBe(radius);
      // Points in the box padding — above, below and beside the title line, outside the trigger's rounded corners —
      // hit the trigger.
      const midX = b.left + b.width / 2;
      const midY = b.top + b.height / 2;
      for (const [x, y] of [[midX, b.top + inset + 1], [midX, b.bottom - inset - 1], [b.left + inset + 1, midY], [b.right - inset - 1, midY]]) {
        expect(document.elementFromPoint(x, y)?.closest("button")).toBe(trigger);
      }
    });
  }

  it("toggles from a click in the header padding, and the open content keeps Figma's gap and padding", async () => {
    const onExpandedChange = vi.fn();
    const screen = await render(
      <ZenProvider><div style={{ width: 480 }}><Accordion theme="box" title="Shipping" onExpandedChange={onExpandedChange}>Ships in 2 days.</Accordion></div></ZenProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Shipping" });
    const box = (trigger.element() as HTMLElement).closest(".zen-accordion") as HTMLElement;
    const b = rect(box);
    // 2px into the trigger's top padding: the box padding above the title line.
    await userEvent.click(trigger, { position: { x: 100, y: 2 } });
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    const title = box.querySelector(".zen-accordion__title") as HTMLElement;
    const content = box.querySelector(".zen-accordion__content") as HTMLElement;
    // Medium: Title → Contents gap XSmall 8, contents start at the 16px padding, box bottom padding 16; the header does
    // not move when the panel opens.
    const style = getComputedStyle(content);
    const c = rect(content);
    expect(c.top + px(style.paddingTop) - rect(title).bottom).toBeCloseTo(8, 0);
    expect(c.left + px(style.paddingLeft) - b.left).toBeCloseTo(16, 0);
    expect(rect(box).bottom - (c.bottom - px(style.paddingBottom))).toBeCloseTo(16, 0);
    expect(rect(title).top - rect(box).top).toBeCloseTo(16, 0);
  });
});

describe("BottomSheet form mode", () => {
  function RenameSheet({ onSubmit, onCancel }: { onSubmit?: (name: string) => void; onCancel?: () => void }) {
    const [open, setOpen] = useState(true);
    const [name, setName] = useState("Roadmap");
    return (
      <ZenProvider>
        <BottomSheet open={open} onOpenChange={setOpen} title="Rename project"
          onSubmit={onSubmit ? () => { onSubmit(name); setOpen(false); } : undefined}
          primaryAction={{ label: "Save name" }} secondaryAction={{ label: "Cancel", onClick: () => { onCancel?.(); setOpen(false); } }}>
          <InputField label="Project name" value={name} onChange={(event) => setName(event.target.value)} />
        </BottomSheet>
      </ZenProvider>
    );
  }

  it("Enter in a field submits the sheet form", async () => {
    const onSubmit = vi.fn();
    const screen = await render(<RenameSheet onSubmit={onSubmit} />);
    const field = screen.getByLabelText("Project name");
    await field.click();
    await userEvent.keyboard("{End} 2026{Enter}");
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Roadmap 2026");
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("the primary action is the submit button; the secondary does not submit", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const screen = await render(<RenameSheet onSubmit={onSubmit} onCancel={onCancel} />);
    const dialog = screen.getByRole("dialog", { name: "Rename project" });
    const save = dialog.getByRole("button", { name: "Save name" });
    await expect.element(save).toHaveAttribute("type", "submit");
    await expect.element(dialog.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
    expect((save.element() as HTMLButtonElement).form).toBe((dialog.getByLabelText("Project name").element() as HTMLInputElement).form);
    await save.click();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Cancel closes without submitting", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const screen = await render(<RenameSheet onSubmit={onSubmit} onCancel={onCancel} />);
    await screen.getByRole("button", { name: "Cancel" }).click();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("without onSubmit there is no form and the primary closes the sheet", async () => {
    const screen = await render(<RenameSheet />);
    const dialog = screen.getByRole("dialog", { name: "Rename project" });
    expect(dialog.element().querySelector("form")).toBeNull();
    await expect.element(dialog.getByRole("button", { name: "Save name" })).toHaveAttribute("type", "button");
    await dialog.getByRole("button", { name: "Save name" }).click();
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("the body still scrolls inside the form at size max", async () => {
    const screen = await render(
      <ZenProvider>
        <BottomSheet open onOpenChange={() => {}} title="Terms" size="max" onSubmit={() => {}} primaryAction={{ label: "Accept terms" }}>
          <div style={{ height: 2000, flexShrink: 0 }}>Long terms</div>
        </BottomSheet>
      </ZenProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "Terms" }).element() as HTMLElement;
    const body = dialog.querySelector(".zen-bottom-sheet__body") as HTMLElement;
    const footer = dialog.querySelector(".zen-bottom-sheet__footer") as HTMLElement;
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(rect(footer).bottom).toBeLessThanOrEqual(rect(dialog).bottom + 0.5);
  });
});

function Frame({ width, children }: { width: number; children: ReactNode }) {
  return <ZenProvider><div data-testid="frame" style={{ width }}>{children}</div></ZenProvider>;
}

describe("NpsScale one-row layout", () => {
  // Under 264px 0–10 switches to two rows (tests/interaction/uploader-accordion-rating-fixes.test.tsx).
  for (const width of [480, 392, 318, 290, 264]) {
    it(`0–10 stays one row in ${width}px with circular chips`, async () => {
      const screen = await render(<Frame width={width}><NpsScale aria-label="How likely are you to recommend us?" lowLabel="Not likely" highLabel="Very likely" /></Frame>);
      const scale = screen.container.querySelector(".zen-nps-scale") as HTMLElement;
      const chips = [...scale.querySelectorAll<HTMLElement>(".zen-chip")];
      expect(chips).toHaveLength(11);
      const rects = chips.map(rect);
      // One row, inside the container.
      for (const r of rects) expect(r.top).toBeCloseTo(rects[0].top, 0);
      expect(rect(scale).width).toBeLessThanOrEqual(width + 0.5);
      expect(rects[10].right).toBeLessThanOrEqual(rect(scale).right + 0.5);
      // Circles, never wider than Chip/Size/Small (32).
      for (const r of rects) { expect(r.width).toBeCloseTo(r.height, 0); expect(r.width).toBeLessThanOrEqual(32.5); }
      // Figma width (392 = 11 × 32 + 10 × 4) when there is room; ≥ 24px targets down to 264px.
      if (width >= 392) { expect(rects[0].width).toBeCloseTo(32, 0); expect(rects[1].left - rects[0].right).toBeCloseTo(4, 0); }
      expect(rects[0].width).toBeGreaterThanOrEqual(23.9);
      // End labels under the first and the last chip.
      const low = scale.querySelector('[data-end="low"]') as HTMLElement;
      const high = scale.querySelector('[data-end="high"]') as HTMLElement;
      expect(rect(low).left).toBeCloseTo(rects[0].left, 0);
      const highText = document.createRange();
      highText.selectNodeContents(high);
      expect(highText.getBoundingClientRect().right).toBeCloseTo(rects[10].right, 0);
    });
  }

  it("chips still toggle in a narrow container", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Frame width={246}><NpsScale aria-label="How likely are you to recommend us?" onValueChange={onValueChange} /></Frame>);
    const ten = screen.getByRole("button", { name: "10" });
    await ten.click();
    expect(onValueChange).toHaveBeenCalledWith(10);
    await expect.element(ten).toHaveAttribute("aria-pressed", "true");
  });
});

describe("OpinionScale one-row layout", () => {
  const cases = [
    { scale: 5, width: 246, labels: false },
    { scale: 5, width: 318, labels: false },
    { scale: 5, width: 700, labels: true },
    { scale: 3, width: 246, labels: false },
    { scale: 3, width: 318, labels: true },
  ] as const;

  for (const { scale, width, labels } of cases) {
    it(`${scale} faces stay one row in ${width}px (labels ${labels ? "shown" : "visually hidden"})`, async () => {
      const screen = await render(<Frame width={width}><OpinionScale scale={scale} aria-label="How was onboarding?" /></Frame>);
      const group = screen.getByRole("radiogroup", { name: "How was onboarding?" }).element() as HTMLElement;
      const items = [...group.querySelectorAll<HTMLElement>(".zen-opinion-item")];
      expect(items).toHaveLength(scale);
      const rects = items.map(rect);
      for (const r of rects) {
        expect(r.top).toBeCloseTo(rects[0].top, 0);
        // WCAG 2.5.8: every face is at least 24 × 24.
        expect(r.width).toBeGreaterThanOrEqual(24);
        expect(r.height).toBeGreaterThanOrEqual(24);
      }
      expect(rects[scale - 1].right).toBeLessThanOrEqual(rect(group).right + 0.5);
      expect(rect(group).width).toBeLessThanOrEqual(width + 0.5);
      // Each face fits its emoji.
      for (const item of items) {
        const emoji = item.querySelector(".zen-opinion-item__emoji") as HTMLElement;
        expect(rect(emoji).left).toBeGreaterThanOrEqual(rect(item).left - 0.5);
        expect(rect(emoji).right).toBeLessThanOrEqual(rect(item).right + 0.5);
      }
      const label = items[0].querySelector(".zen-opinion-item__label") as HTMLElement;
      if (labels) expect(rect(label).width).toBeGreaterThan(1);
      else expect(rect(label).width).toBeLessThanOrEqual(1);
      // The label still names the radio.
      await expect.element(screen.getByRole("radio", { name: scale === 5 ? "Very Disappointed" : "Disappointed" })).toBeInTheDocument();
    });
  }

  it("picks a face in the narrow layout", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Frame width={246}><OpinionScale scale={5} aria-label="How was onboarding?" onValueChange={onValueChange} /></Frame>);
    await screen.getByRole("radio", { name: "Very Happy" }).click();
    expect(onValueChange).toHaveBeenCalledWith("very-happy");
  });
});
