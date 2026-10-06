/**
 * Backlog fixes (2026-10-02): FileUpload / UploaderFileItem keep focus in the list when a file is removed, the Accordion
 * Divider header row (block padding included) is the toggle's hit area, OpinionScale clamps long custom labels to two
 * lines, and NpsScale 0–10 falls back to two rows under 264px. Real browser (Chromium), so focus, layout and hit testing
 * are real.
 */
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Accordion, FileUpload, NpsScale, OpinionScale, UploaderFileItem, ZenProvider, type UploaderFile } from "../../src/index";

const rect = (el: Element) => el.getBoundingClientRect();
const px = (value: string) => Number.parseFloat(value);

const seed: UploaderFile[] = [
  { id: "a", name: "Brief.pdf", size: "1.2 MB", state: "uploaded" },
  { id: "b", name: "Moodboard.key", size: "42 MB", state: "uploading", progress: 30 },
  { id: "c", name: "Photos.zip", size: "86 MB", state: "alert", error: "Upload failed." },
];

function Files({ initial = seed, multiple = true, type }: { initial?: UploaderFile[]; multiple?: boolean; type?: "dropzone" | "button" }) {
  const [files, setFiles] = useState(initial);
  return (
    <ZenProvider>
      <FileUpload label="Kickoff files" type={type} multiple={multiple} files={files} onFilesAdd={() => {}}
        onRemove={(file) => setFiles((list) => list.filter((item) => item.id !== file.id))} onRetry={() => {}} />
      <button type="button">After</button>
    </ZenProvider>
  );
}

const active = () => document.activeElement as HTMLElement | null;

describe("FileUpload: focus after removing a file", () => {
  it("moves to the next file's Remove button (Cancel upload while it uploads)", async () => {
    const screen = await render(<Files />);
    await screen.getByRole("button", { name: "Remove Brief.pdf" }).click();
    await expect.poll(() => active()?.getAttribute("aria-label")).toBe("Cancel upload of Moodboard.key");
  });

  it("moves to the previous file's Remove button when the last file goes (keyboard)", async () => {
    const screen = await render(<Files />);
    (screen.getByRole("button", { name: "Remove Photos.zip" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => active()?.getAttribute("aria-label")).toBe("Cancel upload of Moodboard.key");
    // Keep going: Space on the focused Cancel removes it, then Brief.pdf is the only one left.
    await userEvent.keyboard(" ");
    await expect.poll(() => active()?.getAttribute("aria-label")).toBe("Remove Brief.pdf");
  });

  it("moves to the drop zone when the list empties", async () => {
    const screen = await render(<Files initial={[seed[0]]} />);
    await screen.getByRole("button", { name: "Remove Brief.pdf" }).click();
    await expect.poll(() => active()?.classList.contains("zen-dropzone")).toBe(true);
  });

  it("single-file field: the Choose File button comes back and takes focus", async () => {
    const screen = await render(<Files initial={[seed[0]]} multiple={false} type="button" />);
    await screen.getByRole("button", { name: "Remove Brief.pdf" }).click();
    await expect.poll(() => active()?.textContent).toBe("Choose File");
  });

  it("does not take focus when a file is removed while focus is elsewhere", async () => {
    function Remote() {
      const [files, setFiles] = useState(seed);
      return (
        <ZenProvider>
          <FileUpload label="Kickoff files" multiple files={files} onFilesAdd={() => {}} onRemove={() => {}} />
          <button type="button" onClick={() => setFiles((list) => list.slice(1))}>Drop first</button>
        </ZenProvider>
      );
    }
    const screen = await render(<Remote />);
    const drop = screen.getByRole("button", { name: "Drop first" });
    await drop.click();
    await expect.element(screen.getByRole("button", { name: "Remove Brief.pdf" })).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(active()).toBe(drop.element());
  });

  it("works for UploaderFileItem lists an app renders itself", async () => {
    function OwnList() {
      const [files, setFiles] = useState(seed);
      return (
        <ZenProvider>
          <ul>{files.map((file) => <UploaderFileItem key={file.id} file={file} onRemove={(gone) => setFiles((list) => list.filter((item) => item.id !== gone.id))} />)}</ul>
        </ZenProvider>
      );
    }
    const screen = await render(<OwnList />);
    await screen.getByRole("button", { name: "Cancel upload of Moodboard.key" }).click();
    await expect.poll(() => active()?.getAttribute("aria-label")).toBe("Remove Photos.zip");
  });
});

describe("Accordion Divider hit area", () => {
  // Figma Accordion/Text 239:16847 Theme=Divider: block padding Medium 16 / Large 16 / XLarge 24, no inline padding;
  // Title → Contents gap XSmall 8 / Small 12 / Medium 16.
  const cases = [
    { size: "md", padding: 16, gap: 8 },
    { size: "lg", padding: 16, gap: 12 },
    { size: "xl", padding: 24, gap: 16 },
  ] as const;

  for (const { size, padding, gap } of cases) {
    it(`${size}: the whole header row, block padding included, hits the trigger; the layout keeps Figma's padding`, async () => {
      const screen = await render(
        <ZenProvider><div style={{ width: 480 }}><Accordion size={size} title="Shipping">Ships in 2 days.</Accordion></div></ZenProvider>,
      );
      const trigger = screen.getByRole("button", { name: "Shipping" }).element() as HTMLElement;
      const root = trigger.closest(".zen-accordion") as HTMLElement;
      const r = rect(root);
      // Layout unchanged: Figma's block padding on the root, the trigger on the title row.
      expect(px(getComputedStyle(root).paddingTop)).toBe(padding);
      expect(rect(trigger).top - r.top).toBeCloseTo(padding, 0);
      expect(r.bottom - rect(trigger).bottom).toBeCloseTo(padding, 0);
      // Collapsed: the top and bottom padding, at both ends of the row, hit the trigger.
      for (const [x, y] of [[r.left + 1, r.top + 1], [r.right - 1, r.top + 1], [r.left + r.width / 2, r.top + padding / 2], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1]]) {
        expect(document.elementFromPoint(x, y)?.closest("button")).toBe(trigger);
      }
      // Open: the Title → Contents gap still toggles, the content and the bottom padding under it do not.
      await userEvent.click(trigger, { position: { x: 4, y: 4 } });
      await expect.element(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute("aria-expanded", "true");
      await expect.poll(() => rect(root).height).toBeGreaterThan(r.height + gap);
      const t = rect(trigger);
      const content = root.querySelector(".zen-accordion__content") as HTMLElement;
      const c = rect(content);
      expect(document.elementFromPoint(t.left + 10, t.bottom + gap - 1)?.closest("button")).toBe(trigger);
      expect(document.elementFromPoint(t.left + 10, c.top + px(getComputedStyle(content).paddingTop) + 2)?.closest("button")).toBeNull();
      expect(document.elementFromPoint(t.left + 10, rect(root).bottom - 2)?.closest("button")).toBeNull();
    });
  }

  it("a click in the top padding toggles", async () => {
    const onExpandedChange = vi.fn();
    const screen = await render(
      <ZenProvider><div style={{ width: 480 }}><Accordion title="Shipping" onExpandedChange={onExpandedChange}>Ships in 2 days.</Accordion></div></ZenProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Shipping" });
    // 10px above the trigger: inside the root's 16px top padding.
    await userEvent.click(trigger, { position: { x: 300, y: -10 } });
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
  });
});

function Frame({ width, children }: { width: number; children: ReactNode }) {
  return <ZenProvider><div style={{ width }}>{children}</div></ZenProvider>;
}

describe("OpinionScale long labels", () => {
  const long = { "very-disappointed": "Not at all what I expected from the onboarding flow this week", happy: "Pretty good overall, thanks" } as const;

  for (const width of [700, 560]) {
    it(`clamps a long custom label to two lines in ${width}px and keeps the full text as the radio name`, async () => {
      const screen = await render(<Frame width={width}><OpinionScale scale={5} labels={long} aria-label="How was onboarding?" /></Frame>);
      const group = screen.getByRole("radiogroup", { name: "How was onboarding?" }).element() as HTMLElement;
      const labels = [...group.querySelectorAll<HTMLElement>(".zen-opinion-item__label")];
      const lineHeight = px(getComputedStyle(labels[0]).lineHeight);
      for (const label of labels) expect(rect(label).height).toBeLessThanOrEqual(lineHeight * 2 + 0.5);
      // The long one really is clamped (its text needs more than two lines here).
      expect(labels[0].scrollHeight).toBeGreaterThan(lineHeight * 2 + 0.5);
      // Faces stay one row and one height.
      const items = [...group.querySelectorAll<HTMLElement>(".zen-opinion-item")].map(rect);
      for (const r of items) { expect(r.top).toBeCloseTo(items[0].top, 0); expect(r.height).toBeCloseTo(items[0].height, 0); }
      await expect.element(screen.getByRole("radio", { name: "Not at all what I expected from the onboarding flow this week" })).toBeInTheDocument();
      await expect.element(screen.getByRole("radio", { name: "Pretty good overall, thanks" })).toBeInTheDocument();
    });
  }

  it("built-in labels keep their one or two lines unclamped", async () => {
    const screen = await render(<Frame width={700}><OpinionScale scale={5} aria-label="How was onboarding?" /></Frame>);
    const labels = [...screen.container.querySelectorAll<HTMLElement>(".zen-opinion-item__label")];
    for (const label of labels) expect(label.scrollHeight).toBeLessThanOrEqual(rect(label).height + 0.5);
  });
});

describe("NpsScale narrow fallback", () => {
  for (const width of [262, 246, 212, 180]) {
    it(`0–10 in ${width}px: two rows 0–5 / 6–10 with ≥ 24px circles, labels next to their end values`, async () => {
      const screen = await render(<Frame width={width}><NpsScale aria-label="How likely are you to recommend us?" lowLabel="Not likely" highLabel="Very likely" /></Frame>);
      const scale = screen.container.querySelector(".zen-nps-scale") as HTMLElement;
      const chips = [...scale.querySelectorAll<HTMLElement>(".zen-chip")];
      const rects = chips.map(rect);
      // Row 1: 0–5, row 2: 6–10, columns aligned, Gap/2XSmall (4) both ways.
      for (let i = 1; i <= 5; i += 1) expect(rects[i].top).toBeCloseTo(rects[0].top, 0);
      for (let i = 7; i <= 10; i += 1) expect(rects[i].top).toBeCloseTo(rects[6].top, 0);
      expect(rects[6].top - rects[0].bottom).toBeCloseTo(4, 0);
      expect(rects[6].left).toBeCloseTo(rects[0].left, 0);
      expect(rects[1].left - rects[0].right).toBeCloseTo(4, 0);
      const chip = Math.min(32, (width - 20) / 6);
      for (const r of rects) {
        expect(r.width).toBeCloseTo(chip, 0);
        expect(r.height).toBeCloseTo(r.width, 0);
        expect(r.width).toBeGreaterThanOrEqual(23.9);
        expect(r.right).toBeLessThanOrEqual(rect(scale).right + 0.5);
      }
      // Low label above 0 (start-aligned), high label under 10 (end-aligned to it).
      const low = scale.querySelector('[data-end="low"]') as HTMLElement;
      const high = scale.querySelector('[data-end="high"]') as HTMLElement;
      expect(rect(low).bottom).toBeLessThanOrEqual(rects[0].top);
      expect(rect(low).left).toBeCloseTo(rects[0].left, 0);
      expect(rect(high).top).toBeGreaterThanOrEqual(rects[10].bottom);
      const highText = document.createRange();
      highText.selectNodeContents(high);
      expect(highText.getBoundingClientRect().right).toBeCloseTo(rects[10].right, 0);
    });
  }

  it("264px and wider keeps the single Figma row", async () => {
    const screen = await render(<Frame width={264}><NpsScale aria-label="How likely are you to recommend us?" /></Frame>);
    const rects = [...screen.container.querySelectorAll<HTMLElement>(".zen-chip")].map(rect);
    for (const r of rects) expect(r.top).toBeCloseTo(rects[0].top, 0);
  });

  it("0–5 stays one row in 246px at full chip size", async () => {
    const screen = await render(<Frame width={246}><NpsScale scale={5} aria-label="How likely are you to recommend us?" /></Frame>);
    const rects = [...screen.container.querySelectorAll<HTMLElement>(".zen-chip")].map(rect);
    expect(rects).toHaveLength(6);
    for (const r of rects) { expect(r.top).toBeCloseTo(rects[0].top, 0); expect(r.width).toBeCloseTo(32, 0); }
  });

  it("chips still toggle in two rows", async () => {
    const onValueChange = vi.fn();
    const screen = await render(<Frame width={246}><NpsScale aria-label="How likely are you to recommend us?" onValueChange={onValueChange} /></Frame>);
    const ten = screen.getByRole("button", { name: "10" });
    await ten.click();
    expect(onValueChange).toHaveBeenCalledWith(10);
    await expect.element(ten).toHaveAttribute("aria-pressed", "true");
  });
});
