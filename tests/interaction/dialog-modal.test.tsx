/**
 * Dialog / ModalForm modal behaviour (useModal): Escape belongs to the innermost open thing (an inner popup, then the
 * topmost modal), a blocked ModalForm submit focuses the first invalid field, both open inside a device frame
 * (`[data-zen-overlay-root]`), and the Form focus helper picks an AutocompleteField's Error tag. Real browser (Chromium).
 */
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { AutocompleteField, Button, Dialog, InputField, ModalForm, SelectField, ZenProvider, focusFirstInvalidField } from "../../src/index";

const teams = [{ value: "design", label: "Design" }, { value: "product", label: "Product" }, { value: "sales", label: "Sales" }];
/** The SelectField's visible trigger (a button named by its value; the <label> names the hidden native select). */
const selectTrigger = () => document.querySelector<HTMLButtonElement>(".zen-select__trigger")!;

function InviteForm({ children, onOpenChange }: { children?: ReactNode; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <ModalForm open={open} onOpenChange={(next) => { setOpen(next); onOpenChange?.(next); }} title="Invite member"
      primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
      <SelectField label="Team" options={teams} />
      {children}
    </ModalForm>
  );
}

describe("useModal: Escape goes to the innermost open thing", () => {
  it("a SelectField list opened from the keyboard inside a ModalForm: the first Escape closes the list only, the second the modal", async () => {
    const onOpenChange = vi.fn();
    const screen = await render(<ZenProvider><InviteForm onOpenChange={onOpenChange} /></ZenProvider>);
    const modal = screen.getByRole("dialog", { name: "Invite member" });
    await expect.element(modal).toBeVisible();
    const trigger = selectTrigger();
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByRole("listbox")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await expect.element(trigger).toHaveFocus();
    await expect.element(modal).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    await expect.element(modal).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("a SelectField list opened with the pointer (focus stays on its trigger): Escape closes the list, not the modal", async () => {
    const screen = await render(<ZenProvider><InviteForm /></ZenProvider>);
    const modal = screen.getByRole("dialog", { name: "Invite member" });
    await expect.element(modal).toBeVisible();
    const trigger = selectTrigger();
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
    await expect.element(trigger).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await expect.element(modal).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect.element(modal).not.toBeInTheDocument();
  });

  it("an inner popup that handles Escape on document (preventDefault) keeps the modal open, even when it opened after the modal", async () => {
    function DocumentPopup() {
      // A popup that listens on document and is registered after the modal's own listener (it opens later).
      useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") event.preventDefault(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
      }, []);
      return null;
    }
    function Harness() {
      const [popup, setPopup] = useState(false);
      return <InviteForm><Button level="tertiary" onClick={() => setPopup(true)}>Open popup</Button>{popup ? <DocumentPopup /> : null}</InviteForm>;
    }
    const screen = await render(<ZenProvider><Harness /></ZenProvider>);
    await screen.getByRole("button", { name: "Open popup" }).click();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("dialog", { name: "Invite member" })).toBeInTheDocument();
  });

  it("a Dialog over a ModalForm: only the topmost modal answers Escape and traps Tab", async () => {
    function Guarded() {
      const [form, setForm] = useState(true);
      const [guard, setGuard] = useState(false);
      return (
        <>
          <ModalForm open={form} onOpenChange={(next) => (next ? setForm(true) : setGuard(true))} title="Edit profile" closeButton={false}
            primaryAction={{ label: "Save" }} secondaryAction={{ label: "Cancel", onClick: () => setGuard(true) }}>
            <InputField label="Name" defaultValue="Ava" />
          </ModalForm>
          <Dialog open={guard} onOpenChange={setGuard} theme="warning" title="Discard changes?"
            primaryAction={{ label: "Discard", onClick: () => { setGuard(false); setForm(false); } }} secondaryAction={{ label: "Keep editing" }} />
        </>
      );
    }
    const screen = await render(<ZenProvider><Guarded /></ZenProvider>);
    const form = screen.getByRole("dialog", { name: "Edit profile" });
    const cancel = form.getByRole("button", { name: "Cancel" });
    await cancel.click();
    const guard = screen.getByRole("alertdialog", { name: "Discard changes?" });
    await expect.element(guard).toBeVisible();
    // Tab cycles inside the guard only (Discard ↔ Keep editing), never back into the form underneath.
    for (let i = 0; i < 4; i += 1) {
      await userEvent.tab();
      expect(guard.element().contains(document.activeElement)).toBe(true);
    }
    await userEvent.keyboard("{Escape}");
    await expect.element(guard).not.toBeInTheDocument();
    await expect.element(form).toBeInTheDocument();
    await expect.element(cancel).toHaveFocus();
    // The form is topmost again: its Escape asks to close (the guard opens again).
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("alertdialog", { name: "Discard changes?" })).toBeVisible();
  });
});

describe("ModalForm: a blocked submit focuses the first invalid field", () => {
  function EditMember({ delay = 0 }: { delay?: number }) {
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
    const validate = (event: FormEvent<HTMLFormElement>) => {
      const data = new FormData(event.currentTarget);
      const next = { name: data.get("name") ? undefined : "Enter a name.", email: String(data.get("email")).includes("@") ? undefined : "Enter an email address, like ava@example.com." };
      if (!delay) { setErrors(next); return undefined; }
      return new Promise<void>((resolve) => { setTimeout(() => { setErrors(next); resolve(); }, delay); });
    };
    return (
      <ModalForm open onOpenChange={() => undefined} title="Edit member" onSubmit={validate} primaryAction={{ label: "Save" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Name" name="name" defaultValue="Ava" error={errors.name} />
        <InputField label="Email" name="email" defaultValue="ava" error={errors.email} />
      </ModalForm>
    );
  }

  it("moves focus to the first field in error after the submit is blocked", async () => {
    const screen = await render(<ZenProvider><EditMember /></ZenProvider>);
    await expect.element(screen.getByLabelText("Name")).toHaveFocus();
    await screen.getByRole("button", { name: "Save" }).click();
    await expect.element(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    await expect.element(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("waits for an async handler before looking for errors", async () => {
    const screen = await render(<ZenProvider><EditMember delay={50} /></ZenProvider>);
    await screen.getByRole("button", { name: "Save" }).click();
    await expect.element(screen.getByLabelText("Email")).toHaveFocus();
  });
});

describe("Dialog / ModalForm inside a device frame ([data-zen-overlay-root])", () => {
  const frame: CSSProperties = { position: "relative", width: 390, height: 844, overflow: "hidden", ["--zen-safe-area-bottom" as string]: "28px" };

  function Guard({ inFrame }: { inFrame: boolean }) {
    const [open, setOpen] = useState(false);
    const content = (
      <>
        <Button level="tertiary" onClick={() => setOpen(true)}>Back</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Discard changes?" description="Your edits to this profile are not saved."
          primaryAction={{ label: "Discard" }} secondaryAction={{ label: "Keep editing" }} />
      </>
    );
    return inFrame ? <div data-zen-overlay-root="" data-testid="phone" style={frame}>{content}</div> : content;
  }

  it("renders nothing while closed", async () => {
    const screen = await render(<ZenProvider><Guard inFrame /></ZenProvider>);
    expect(screen.getByTestId("phone").element().querySelector("template, .zen-dialog-overlay")).toBeNull();
  });

  it("opens in the frame with the Device=Mobile layout, under the frame's chrome and clear of its safe area", async () => {
    const screen = await render(<ZenProvider><Guard inFrame /></ZenProvider>);
    await screen.getByRole("button", { name: "Back" }).click();
    const phone = screen.getByTestId("phone").element() as HTMLElement;
    const dialog = screen.getByRole("dialog", { name: "Discard changes?" });
    await expect.element(dialog).toBeVisible();
    const panel = dialog.element() as HTMLElement;
    const overlay = panel.parentElement as HTMLElement;
    expect(overlay.parentElement).toBe(phone);
    expect(overlay.dataset.contained).toBe("true");
    expect(getComputedStyle(overlay).position).toBe("absolute");
    // The scrim covers the frame, not the viewport.
    const box = phone.getBoundingClientRect(), scrim = overlay.getBoundingClientRect();
    expect([scrim.left, scrim.top, scrim.width, scrim.height]).toEqual([box.left, box.top, box.width, box.height]);
    // Device=Mobile (10153:7277): Heading/4 title, stacked full-width actions, at the bottom above the 28px safe area.
    const title = panel.querySelector<HTMLElement>(".zen-dialog__title")!;
    const heading4 = getComputedStyle(document.documentElement).getPropertyValue("--zen-typography-font-size-heading-4").trim();
    expect(getComputedStyle(title).fontSize).toBe(heading4 || "20px");
    expect(getComputedStyle(panel.querySelector(".zen-dialog__actions")!).flexDirection).toBe("column-reverse");
    expect(Math.round(box.bottom - panel.getBoundingClientRect().bottom)).toBe(28);
    await expect.element(screen.getByRole("button", { name: "Discard" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    expect(phone.querySelector("template, .zen-dialog-overlay")).toBeNull();
  });

  it("keeps the page portal and the Desktop layout outside a frame", async () => {
    const screen = await render(<ZenProvider><Guard inFrame={false} /></ZenProvider>);
    await screen.getByRole("button", { name: "Back" }).click();
    const panel = screen.getByRole("dialog", { name: "Discard changes?" }).element() as HTMLElement;
    const overlay = panel.parentElement as HTMLElement;
    expect(overlay.closest("[data-zen-overlay-root]")).toBeNull();
    expect(overlay.dataset.contained).toBeUndefined();
    expect(getComputedStyle(overlay).position).toBe("fixed");
    expect(getComputedStyle(panel.querySelector(".zen-dialog__actions")!).flexDirection).toBe("row");
  });

  it("ModalForm opens in the frame too", async () => {
    const screen = await render(
      <ZenProvider>
        <div data-zen-overlay-root="" data-testid="phone" style={frame}>
          <ModalForm open onOpenChange={() => undefined} title="Rename file" primaryAction={{ label: "Save" }} secondaryAction={{ label: "Cancel" }}>
            <InputField label="File name" defaultValue="Q3 report" />
          </ModalForm>
        </div>
      </ZenProvider>,
    );
    const panel = screen.getByRole("dialog", { name: "Rename file" }).element() as HTMLElement;
    expect(panel.parentElement?.parentElement).toBe(screen.getByTestId("phone").element());
    expect(getComputedStyle(panel.querySelector(".zen-modal-form__footer")!).flexDirection).toBe("column-reverse");
    await expect.element(screen.getByLabelText("File name")).toHaveFocus();
  });
});

describe("focusFirstInvalidField: AutocompleteField in error", () => {
  const people = [{ id: "ava", label: "Ava Chen" }, { id: "ben", label: "Ben Ortiz" }, { id: "cara", label: "Cara Lim" }];

  it("focuses the first Error tag (its Remove button), not the first tag's", async () => {
    const screen = await render(<ZenProvider><form data-testid="form"><AutocompleteField label="Reviewers" options={people} defaultValue={["ava", "ben", "cara"]} invalidValues={["ben", "cara"]} error="Ben and Cara can't review this file." /></form></ZenProvider>);
    focusFirstInvalidField(screen.getByTestId("form").element());
    await expect.element(screen.getByRole("button", { name: "Remove Ben Ortiz" })).toHaveFocus();
  });

  it("focuses the Add button when the field is blank", async () => {
    const screen = await render(<ZenProvider><form data-testid="form"><AutocompleteField label="Reviewers" options={people} error="Add at least one reviewer." /></form></ZenProvider>);
    focusFirstInvalidField(screen.getByTestId("form").element());
    await expect.element(screen.getByRole("button", { name: "Add Item" })).toHaveFocus();
  });

  it("focuses the Add button, not a valid tag's Remove, when no tag is in error", async () => {
    const screen = await render(<ZenProvider><form data-testid="form"><AutocompleteField label="Reviewers" options={people} defaultValue={["ava"]} error="Add at least two reviewers." /></form></ZenProvider>);
    focusFirstInvalidField(screen.getByTestId("form").element());
    await expect.element(screen.getByRole("button", { name: "Add Item" })).toHaveFocus();
  });
});
