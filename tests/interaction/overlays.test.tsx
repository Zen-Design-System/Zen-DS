/**
 * Interaction tests for overlays: Menu (APG menu button), Dialog, Tooltip and useToast. Real browser (Chromium):
 * keyboard, focus and portals behave as in an app.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button, Dialog, IconButton, InputField, Menu, MenuItem, MenuSeparator, Tooltip, ZenProvider, useToast } from "../../src/index";

describe("Menu", () => {
  const renderMenu = (onSelect = vi.fn()) => render(
    <ZenProvider>
      <Menu trigger={<Button level="tertiary">Actions</Button>} aria-label="Invoice actions">
        <MenuItem id="edit" label="Edit" onSelect={() => onSelect("edit")} />
        <MenuItem id="duplicate" label="Duplicate" onSelect={() => onSelect("duplicate")} />
        <MenuSeparator />
        <MenuItem id="delete" label="Delete" danger onSelect={() => onSelect("delete")} />
      </Menu>
    </ZenProvider>,
  );

  it("opens from the trigger, is closed by default and names itself", async () => {
    const screen = await renderMenu();
    const trigger = screen.getByRole("button", { name: "Actions" });
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect.element(screen.getByRole("menu", { name: "Invoice actions" })).toBeVisible();
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("moves with the arrow keys, selects with Enter and returns focus to the trigger", async () => {
    const onSelect = vi.fn();
    const screen = await renderMenu(onSelect);
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.element().focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("duplicate");
    await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it("closes on Escape without selecting", async () => {
    const onSelect = vi.fn();
    const screen = await renderMenu(onSelect);
    await screen.getByRole("button", { name: "Actions" }).click();
    await expect.element(screen.getByRole("menu")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("Dialog", () => {
  function Confirm({ onDelete }: { onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <ZenProvider>
        <Button level="danger" onClick={() => setOpen(true)}>Delete project</Button>
        <Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete project?" description="This removes the project for everyone."
          primaryAction={{ label: "Delete", onClick: () => { onDelete(); setOpen(false); } }} secondaryAction={{ label: "Cancel", onClick: () => setOpen(false) }} />
      </ZenProvider>
    );
  }

  it("opens as a named modal alertdialog (negative theme) and closes on Escape, returning focus", async () => {
    const screen = await render(<Confirm onDelete={vi.fn()} />);
    const opener = screen.getByRole("button", { name: "Delete project" });
    await opener.click();
    const dialog = screen.getByRole("alertdialog", { name: "Delete project?" });
    await expect.element(dialog).toBeVisible();
    await expect.element(dialog).toHaveAttribute("aria-modal", "true");
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(opener).toHaveFocus();
  });

  it("runs the primary action", async () => {
    const onDelete = vi.fn();
    const screen = await render(<Confirm onDelete={onDelete} />);
    await screen.getByRole("button", { name: "Delete project" }).click();
    await screen.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    expect(onDelete).toHaveBeenCalledOnce();
    await expect.element(screen.getByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("moves focus inside even when the primary action starts disabled", async () => {
    function Invite() {
      const [open, setOpen] = useState(false);
      const [email, setEmail] = useState("");
      return (
        <ZenProvider>
          <Button level="primary" onClick={() => setOpen(true)}>Invite teammates</Button>
          <Dialog open={open} onOpenChange={setOpen} theme="info" title="Invite teammates"
            primaryAction={{ label: "Send invite", disabled: !email.includes("@") }} secondaryAction={{ label: "Cancel" }}>
            <InputField label="Work email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Dialog>
        </ZenProvider>
      );
    }
    const screen = await render(<Invite />);
    await screen.getByRole("button", { name: "Invite teammates" }).click();
    await expect.element(screen.getByLabelText("Work email")).toHaveFocus();
  });
});

describe("Tooltip", () => {
  it("shows at once on keyboard focus and names an icon-only button", async () => {
    const screen = await render(
      <ZenProvider>
        <IconButton icon="icon-plus-line" aria-label="Add member" onClick={() => undefined} />
        <Tooltip content="Export as CSV"><Button level="tertiary">Export</Button></Tooltip>
      </ZenProvider>,
    );
    await userEvent.tab();
    await expect.element(screen.getByRole("tooltip")).toHaveTextContent("Add member");
    await userEvent.tab();
    await expect.element(screen.getByRole("tooltip")).toHaveTextContent("Export as CSV");
  });
});

describe("useToast", () => {
  function Invite() {
    const { toast } = useToast();
    return <Button level="primary" onClick={() => toast({ title: "Invite sent", children: "ava@example.com can join now." })}>Invite</Button>;
  }

  it("queues a toast from anywhere under ZenProvider and dismisses it", async () => {
    const screen = await render(<ZenProvider><Invite /></ZenProvider>);
    await screen.getByRole("button", { name: "Invite" }).click();
    const status = screen.getByRole("status").filter({ hasText: "Invite sent" });
    await expect.element(status).toBeVisible();
    await status.getByRole("button", { name: "Dismiss" }).click();
    await expect.element(screen.getByText("Invite sent")).not.toBeInTheDocument();
  });
});
