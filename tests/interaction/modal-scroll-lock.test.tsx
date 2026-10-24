/**
 * Scroll lock (useModal → lockScroll): while a Dialog, ModalForm, modal SidePanel or BottomSheet is open, the page behind it
 * does not scroll. Besides the window, that is every box that scrolls around the place the modal renders in: Zen Studio's
 * Play stage scrolls a device frame (`[data-zen-overlay-root]`), and a wheel over a modal opened in that frame scrolled
 * the stage under it (the user 2026-10-24, page "Quản lý task": 67px under an open ModalForm). Real wheel (Playwright).
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { BottomSheet, Button, Dialog, InputField, ModalForm, SidePanel, ZenProvider } from "../../src/index";

/** Play's stage: a box that scrolls its overflow, holding a device frame 40px taller than it. */
const stage: CSSProperties = { width: 720, height: 600, overflow: "auto" };
const frame: CSSProperties = { position: "relative", width: 640, height: 640, overflow: "clip" };

function Stage({ children, isolationRoot = false }: { children: (open: boolean, setOpen: (open: boolean) => void) => ReactNode; isolationRoot?: boolean }) {
  const [open, setOpen] = useState(false);
  const device = (
    <div data-zen-overlay-root="" data-testid="device" style={frame}>
      <Button onClick={() => setOpen(true)}>Open</Button>
      {children(open, setOpen)}
    </div>
  );
  return <div data-testid="stage" style={stage}>{isolationRoot ? <div data-zen-isolation-root="">{device}</div> : device}</div>;
}

const stageOf = (screen: { getByTestId: (id: string) => { element: () => Element } }) => screen.getByTestId("stage").element() as HTMLElement;

const modals: Array<[string, (open: boolean, setOpen: (open: boolean) => void) => ReactNode, string]> = [
  ["Dialog", (open, setOpen) => <Dialog open={open} onOpenChange={setOpen} title="Discard task?" primaryAction={{ label: "Discard" }} secondaryAction={{ label: "Keep editing" }} />, ".zen-dialog"],
  ["ModalForm", (open, setOpen) => (
    <ModalForm open={open} onOpenChange={setOpen} title="Create task" primaryAction={{ label: "Create" }} secondaryAction={{ label: "Cancel" }}>
      <InputField label="Task name" />
    </ModalForm>
  ), ".zen-modal-form"],
  ["SidePanel (modal)", (open, setOpen) => <SidePanel type="modal" open={open} onOpenChange={setOpen} title="Task detail">Body</SidePanel>, ".zen-side-panel__header"],
  ["BottomSheet", (open, setOpen) => <BottomSheet open={open} onOpenChange={setOpen} title="Sort by" items={[{ id: "due", label: "Due date" }, { id: "name", label: "Name" }]} />, ".zen-bottom-sheet__header"],
];

describe("a modal in a device frame holds the scrolling stage around it still", () => {
  for (const [name, modal, target] of modals) {
    it(`${name}: a wheel over the open modal does not move the stage; closed, the stage scrolls again`, async () => {
      const screen = await render(<ZenProvider><Stage>{modal}</Stage></ZenProvider>);
      const box = stageOf(screen);
      await screen.getByRole("button", { name: "Open" }).click();
      const find = () => document.querySelector<HTMLElement>(`[data-testid="device"] ${target}`);
      await expect.poll(find).toBeTruthy();
      const panel = find()!;
      expect(box.style.overflow).toBe("hidden");
      // Opening may scroll the stage once, to show the panel it focuses (a BottomSheet at the frame's foot); the wheel may not.
      const opened = box.scrollTop;
      for (const y of [400, -400]) {
        await userEvent.wheel(panel, { delta: { y } });
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(box.scrollTop).toBe(opened);
      }
      await userEvent.keyboard("{Escape}");
      await expect.poll(find).toBeNull();
      // The lock is gone with the modal: the box's own style is back and a wheel scrolls it (the test can see a scroll).
      expect(box.style.overflow).toBe("auto");
      box.scrollTop = 0;
      await userEvent.wheel(screen.getByRole("button", { name: "Open" }), { delta: { y: 400 } });
      await expect.poll(() => box.scrollTop).toBe(40);
    });
  }

  it("a Dialog over a ModalForm: closing the Dialog keeps the lock, closing the form releases it", async () => {
    function Nested() {
      const [form, setForm] = useState(true);
      const [confirm, setConfirm] = useState(false);
      return (
        <div data-testid="stage" style={stage}>
          <div data-zen-overlay-root="" style={frame}>
            <ModalForm open={form} onOpenChange={setForm} title="Create task" primaryAction={{ label: "Create" }} secondaryAction={{ label: "Cancel", onClick: () => setConfirm(true) }}>
              <InputField label="Task name" />
            </ModalForm>
            <Dialog open={confirm} onOpenChange={setConfirm} title="Discard task?" primaryAction={{ label: "Discard", onClick: () => { setConfirm(false); setForm(false); } }} secondaryAction={{ label: "Keep editing" }} />
          </div>
        </div>
      );
    }
    const screen = await render(<ZenProvider><Nested /></ZenProvider>);
    const box = stageOf(screen);
    await expect.element(screen.getByRole("dialog", { name: "Create task" })).toBeVisible();
    await screen.getByRole("button", { name: "Cancel" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Discard task?" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("dialog", { name: "Discard task?" })).not.toBeInTheDocument();
    expect(box.style.overflow).toBe("hidden");
    await userEvent.wheel(screen.getByRole("dialog", { name: "Create task" }), { delta: { y: 400 } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(box.scrollTop).toBe(0);
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("dialog", { name: "Create task" })).not.toBeInTheDocument();
    expect(box.style.overflow).toBe("auto");
  });

  it("content does not shift by the stage's scrollbar while it is locked", async () => {
    const screen = await render(<ZenProvider><Stage>{modals[0][1]}</Stage></ZenProvider>);
    const box = stageOf(screen);
    const device = screen.getByTestId("device").element() as HTMLElement;
    const left = device.getBoundingClientRect().left, room = box.clientWidth;
    await screen.getByRole("button", { name: "Open" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Discard task?" })).toBeVisible();
    // A classic scrollbar's width goes to padding; an overlay scrollbar (0px) adds none. Either way the content stays put.
    expect(box.clientWidth - parseFloat(getComputedStyle(box).paddingRight)).toBe(room);
    expect(device.getBoundingClientRect().left).toBe(left);
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("dialog", { name: "Discard task?" })).not.toBeInTheDocument();
    expect(box.style.paddingRight).toBe("");
  });

  it("stops at an isolation root: what scrolls outside it (Zen Studio's canvas and chrome) stays live", async () => {
    const screen = await render(<ZenProvider><Stage isolationRoot>{modals[0][1]}</Stage></ZenProvider>);
    await screen.getByRole("button", { name: "Open" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Discard task?" })).toBeVisible();
    expect(stageOf(screen).style.overflow).toBe("auto");
    expect(document.body.style.overflow).toBe("hidden");
  });
});

describe("a modal portalled to the page holds the window still", () => {
  it("Dialog: a wheel over it does not scroll the page; closed, the page scrolls again", async () => {
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <div style={{ height: 3000 }}>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <Dialog open={open} onOpenChange={setOpen} title="Discard task?" primaryAction={{ label: "Discard" }} secondaryAction={{ label: "Keep editing" }} />
        </div>
      );
    }
    const screen = await render(<ZenProvider><Page /></ZenProvider>);
    await screen.getByRole("button", { name: "Open" }).click();
    const dialog = screen.getByRole("dialog", { name: "Discard task?" });
    await expect.element(dialog).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.wheel(dialog, { delta: { y: 400 } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(window.scrollY).toBe(0);
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    await userEvent.wheel(screen.getByRole("button", { name: "Open" }), { delta: { y: 400 } });
    await expect.poll(() => window.scrollY).toBeGreaterThan(0);
    window.scrollTo(0, 0);
  });
});
