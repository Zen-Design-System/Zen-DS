/**
 * Backlog 2026-10-02 (group b3): where a modal starts (useModal initial focus on a SelectField trigger and on the checked
 * radio of a group; BottomSheet form mode and Search slot), ModalForm validates like Form (noValidate, the blocked-submit
 * announcement), and Dialog Device=Mobile placement (Figma 10153:7277: 350 of a 390 screen, the safe area cleared with or
 * without a device frame). Real browser (Chromium).
 */
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { BottomSheet, ColorSelector, Dialog, InputField, ModalForm, RadioButton, Search, SelectField, ZenProvider } from "../../src/index";

const teams = [{ value: "design", label: "Design" }, { value: "product", label: "Product" }];
const colours = [
  { value: "var(--zen-color-background-support-blue-solid)", label: "Blue" },
  { value: "var(--zen-color-background-support-green-solid)", label: "Green" },
  { value: "var(--zen-color-background-support-red-solid)", label: "Red" },
];

describe("useModal initial focus", () => {
  it("a ModalForm whose first field is a SelectField focuses its trigger (the native select is tabIndex -1)", async () => {
    const screen = await render(
      <ZenProvider>
        <ModalForm open onOpenChange={() => undefined} title="Invite member" primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
          <SelectField label="Team" options={teams} />
          <InputField label="Email" />
        </ModalForm>
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("dialog", { name: "Invite member" })).toBeVisible();
    await expect.element(document.querySelector<HTMLButtonElement>(".zen-select__trigger")!).toHaveFocus();
  });

  it("a ColorSelector first: focus lands on the checked swatch, not the first one", async () => {
    const screen = await render(
      <ZenProvider>
        <ModalForm open onOpenChange={() => undefined} title="Label colour" primaryAction={{ label: "Save" }}>
          <ColorSelector colors={colours} value={colours[1].value} />
        </ModalForm>
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("radio", { name: "Green" })).toHaveFocus();
  });

  it("a RadioButton group first: the checked radio, and Shift+Tab from it wraps to the end instead of leaving the modal", async () => {
    const screen = await render(
      <ZenProvider>
        <ModalForm open onOpenChange={() => undefined} title="Delivery" closeButton={false} primaryAction={{ label: "Save" }} secondaryAction={{ label: "Cancel" }}>
          <div role="radiogroup" aria-label="Speed">
            <RadioButton name="speed" value="standard" label="Standard" />
            <RadioButton name="speed" value="express" label="Express" defaultChecked />
          </div>
        </ModalForm>
      </ZenProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "Delivery" });
    await expect.element(screen.getByRole("radio", { name: "Express" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect.element(dialog.getByRole("button", { name: "Save" })).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole("radio", { name: "Express" })).toHaveFocus();
  });

  it("with no radio checked, the group's first radio (where Tab lands)", async () => {
    const screen = await render(
      <ZenProvider>
        <ModalForm open onOpenChange={() => undefined} title="Label colour" primaryAction={{ label: "Save" }}>
          <ColorSelector colors={colours} />
        </ModalForm>
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("radio", { name: "Blue" })).toHaveFocus();
  });
});

describe("ModalForm validates like Form", () => {
  function Rename({ onValid, noValidate, invalidMessage }: { onValid?: () => void; noValidate?: boolean; invalidMessage?: (count: number) => string }) {
    const [errors, setErrors] = useState<{ name?: string; team?: string }>({});
    const submit = (event: FormEvent<HTMLFormElement>) => {
      const data = new FormData(event.currentTarget);
      const next = { name: data.get("name") ? undefined : "Enter a name.", team: data.get("team") ? undefined : "Choose a team." };
      setErrors(next);
      if (!next.name && !next.team) onValid?.();
    };
    return (
      <ModalForm open onOpenChange={() => undefined} title="Add member" onSubmit={submit} noValidate={noValidate} invalidMessage={invalidMessage}
        primaryAction={{ label: "Add" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Name" name="name" required error={errors.name} />
        <SelectField label="Team" name="team" options={teams} placeholder="Choose a team" required error={errors.team} />
      </ModalForm>
    );
  }
  const live = () => document.querySelector<HTMLElement>(".zen-modal-form__live")!;

  it("is a <form noValidate>: required fields don't block the submit, so onSubmit runs and shows the errors", async () => {
    const onValid = vi.fn();
    const screen = await render(<ZenProvider><Rename onValid={onValid} /></ZenProvider>);
    const form = screen.getByRole("dialog", { name: "Add member" }).element().querySelector("form")!;
    expect(form.noValidate).toBe(true);
    await screen.getByRole("button", { name: "Add" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-invalid", "true");
    expect(onValid).not.toHaveBeenCalled();
  });

  it("a blocked submit focuses the first invalid field and announces how many need attention, again on a second try", async () => {
    const screen = await render(<ZenProvider><Rename /></ZenProvider>);
    expect(live().getAttribute("role")).toBe("status");
    expect(live().getAttribute("aria-live")).toBe("polite");
    expect(live().textContent).toBe("");
    await screen.getByRole("button", { name: "Add" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    await expect.poll(() => live().textContent).toBe("2 fields need attention");
    await userEvent.keyboard("Ava");
    await screen.getByRole("button", { name: "Add" }).click();
    await expect.poll(() => live().textContent).toBe("1 field needs attention");
    await expect.element(document.querySelector<HTMLButtonElement>(".zen-select__trigger")!).toHaveFocus();
  });

  it("the message follows the locale", async () => {
    const screen = await render(<ZenProvider locale="vi"><Rename /></ZenProvider>);
    await screen.getByRole("button", { name: "Add" }).click();
    await expect.poll(() => live().textContent).toBe("2 trường cần xem lại");
  });

  it("invalidMessage replaces the message", async () => {
    const screen = await render(<ZenProvider><Rename invalidMessage={(count) => `Fix ${count}`} /></ZenProvider>);
    await screen.getByRole("button", { name: "Add" }).click();
    await expect.poll(() => live().textContent).toBe("Fix 2");
  });

  it("a valid submit announces nothing and leaves focus alone", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <ZenProvider>
        <ModalForm open onOpenChange={() => undefined} title="Rename file" onSubmit={onSubmit} primaryAction={{ label: "Save" }}>
          <InputField label="File name" name="file" required defaultValue="Q3 report" />
        </ModalForm>
      </ZenProvider>,
    );
    const save = screen.getByRole("button", { name: "Save" });
    await save.click();
    expect(onSubmit).toHaveBeenCalledOnce();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(live().textContent).toBe("");
    await expect.element(save).toHaveFocus();
  });

  it("noValidate={false} hands validation back to the browser", async () => {
    const screen = await render(<ZenProvider><Rename noValidate={false} /></ZenProvider>);
    expect(screen.getByRole("dialog", { name: "Add member" }).element().querySelector("form")!.noValidate).toBe(false);
  });

  it("without onSubmit there is no form and no live region", async () => {
    const screen = await render(<ZenProvider><ModalForm open onOpenChange={() => undefined} title="Details" primaryAction={{ label: "Done" }}><InputField label="Name" /></ModalForm></ZenProvider>);
    const dialog = screen.getByRole("dialog", { name: "Details" }).element();
    expect(dialog.querySelector("form, .zen-modal-form__live")).toBeNull();
  });
});

describe("Dialog Device=Mobile placement (10153:7277)", () => {
  const frame: CSSProperties = { position: "relative", width: 390, height: 844, overflow: "hidden" };
  const box = (element: Element) => element.getBoundingClientRect();
  function Guard() {
    return (
      <Dialog open onOpenChange={() => undefined} title="Discard changes?" description="Your edits are not saved."
        primaryAction={{ label: "Discard" }} secondaryAction={{ label: "Keep editing" }} />
    );
  }

  afterEach(async () => {
    document.documentElement.style.removeProperty("--zen-safe-area-bottom");
    await page.viewport(1280, 900);
  });

  it("in a 390 phone frame: 350 wide, Padding/Large (20) side margins", async () => {
    const screen = await render(<ZenProvider><div data-zen-overlay-root="" data-testid="phone" style={frame}><Guard /></div></ZenProvider>);
    const panel = screen.getByRole("dialog", { name: "Discard changes?" }).element();
    const phone = box(screen.getByTestId("phone").element()), dialog = box(panel);
    expect(Math.round(dialog.width)).toBe(350);
    expect(Math.round(dialog.left - phone.left)).toBe(20);
    expect(Math.round(phone.right - dialog.right)).toBe(20);
    // Still Device=Mobile (stacked actions) at the new 440px container switch.
    expect(getComputedStyle(panel.querySelector(".zen-dialog__actions")!).flexDirection).toBe("column-reverse");
  });

  it("in a 480 frame the Mobile layout still applies; in a 520 frame the Desktop one", async () => {
    for (const [width, direction] of [[480, "column-reverse"], [520, "row"]] as const) {
      const screen = await render(<ZenProvider><div data-zen-overlay-root="" style={{ ...frame, width }}><Guard /></div></ZenProvider>);
      const panel = screen.getByRole("dialog", { name: "Discard changes?" }).element();
      expect(getComputedStyle(panel.querySelector(".zen-dialog__actions")!).flexDirection).toBe(direction);
      await screen.unmount();
    }
  });

  it("at a 390 viewport without a frame: 350 wide, 20 side margins, at the bottom clear of the safe area", async () => {
    await page.viewport(390, 844);
    const screen = await render(<ZenProvider><Guard /></ZenProvider>);
    const panel = screen.getByRole("dialog", { name: "Discard changes?" }).element();
    const overlay = box(panel.parentElement!), dialog = box(panel);
    expect(Math.round(dialog.width)).toBe(350);
    expect(Math.round(dialog.left - overlay.left)).toBe(20);
    // No safe area: Padding/Medium under the panel.
    expect(Math.round(overlay.bottom - dialog.bottom)).toBe(16);
    // A home indicator (the safe-area variable, else env(safe-area-inset-bottom)) pushes it up, as inside a frame.
    document.documentElement.style.setProperty("--zen-safe-area-bottom", "34px");
    await expect.poll(() => Math.round(box(panel.parentElement!).bottom - box(panel).bottom)).toBe(34);
  });

  it("ModalForm keeps Padding/Medium side margins on a phone", async () => {
    await page.viewport(390, 844);
    const screen = await render(<ZenProvider><ModalForm open onOpenChange={() => undefined} title="Rename file" primaryAction={{ label: "Save" }}><InputField label="File name" /></ModalForm></ZenProvider>);
    const panel = screen.getByRole("dialog", { name: "Rename file" }).element();
    expect(Math.round(box(panel).left - box(panel.parentElement!).left)).toBe(16);
  });
});

describe("BottomSheet initial focus", () => {
  /** Opens the sheet from a button, as apps do (the sheet mounts after the provider's portal exists). */
  function Opener({ sheet }: { sheet: (open: boolean, setOpen: (open: boolean) => void) => ReactNode }) {
    const [open, setOpen] = useState(false);
    return <><button type="button" onClick={() => setOpen(true)}>Open sheet</button>{sheet(open, setOpen)}</>;
  }
  const openSheet = async (sheet: (open: boolean, setOpen: (open: boolean) => void) => ReactNode) => {
    const screen = await render(<ZenProvider><Opener sheet={sheet} /></ZenProvider>);
    await screen.getByRole("button", { name: "Open sheet" }).click();
    return screen;
  };

  it("a form sheet starts on its first field", async () => {
    const screen = await openSheet((open, setOpen) => (
      <BottomSheet open={open} onOpenChange={setOpen} title="Rename project" onSubmit={() => undefined} primaryAction={{ label: "Save" }}>
        <InputField label="Project name" defaultValue="Roadmap" />
      </BottomSheet>
    ));
    await expect.element(screen.getByRole("textbox", { name: "Project name" })).toHaveFocus();
  });

  it("a form sheet whose first field is a SelectField starts on its trigger", async () => {
    const screen = await openSheet((open, setOpen) => (
      <BottomSheet open={open} onOpenChange={setOpen} title="Move task" onSubmit={() => undefined} primaryAction={{ label: "Move" }}>
        <SelectField label="Team" options={teams} />
      </BottomSheet>
    ));
    await expect.element(screen.getByRole("dialog", { name: "Move task" })).toBeVisible();
    await expect.element(document.querySelector<HTMLButtonElement>(".zen-select__trigger")!).toHaveFocus();
  });

  it("a sheet with a Search slot starts on the Search (action type)", async () => {
    const screen = await openSheet((open, setOpen) => (
      <BottomSheet open={open} onOpenChange={setOpen} type="action" title="Move to" search={<Search placeholder="Search folders" aria-label="Search folders" />}
        items={[{ id: "a", label: "Archive" }, { id: "b", label: "Drafts" }]} />
    ));
    await expect.element(screen.getByRole("searchbox", { name: "Search folders" })).toHaveFocus();
  });

  it("a form sheet with a Search starts on the Search, above the first field", async () => {
    const screen = await openSheet((open, setOpen) => (
      <BottomSheet open={open} onOpenChange={setOpen} title="Assign" search={<Search placeholder="Search people" aria-label="Search people" />} onSubmit={() => undefined} primaryAction={{ label: "Assign" }}>
        <InputField label="Note" />
      </BottomSheet>
    ));
    await expect.element(screen.getByRole("searchbox", { name: "Search people" })).toHaveFocus();
  });

  it("data-autofocus wins over the first field", async () => {
    const screen = await openSheet((open, setOpen) => (
      <BottomSheet open={open} onOpenChange={setOpen} title="Log time" onSubmit={() => undefined} primaryAction={{ label: "Log" }}>
        <InputField label="Project" />
        <InputField label="Hours" data-autofocus="" />
      </BottomSheet>
    ));
    await expect.element(screen.getByRole("textbox", { name: "Hours" })).toHaveFocus();
  });

  it("any other sheet focuses itself, not its first control", async () => {
    const screen = await openSheet((open, setOpen) => (
      <BottomSheet open={open} onOpenChange={setOpen} title="Details" primaryAction={{ label: "Done" }}>
        <InputField label="Note" />
      </BottomSheet>
    ));
    await expect.element(screen.getByRole("dialog", { name: "Details" })).toHaveFocus();
  });
});
