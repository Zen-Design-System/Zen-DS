/**
 * Compatibility aliases for the props agents guess from other libraries (Chakra, MUI, React Aria): each alias renders
 * exactly like the Zen prop it stands for. The canonical API stays documented; the harness warns on the aliases.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { AlertBanner, Badge, Button, Dialog, Icon, InlineMessage, InputField, ModalForm, Table, Toast, ZenProvider } from "../../src/index";

describe("overlays: isOpen / onClose", () => {
  it("Dialog opens from isOpen and reports Escape through onClose", async () => {
    const onClose = vi.fn();
    const screen = await render(<ZenProvider><Dialog isOpen onClose={onClose} title="Discard draft?" /></ZenProvider>);
    await expect.element(screen.getByRole("dialog", { name: "Discard draft?" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("without open, a mounted Dialog shows (conditional rendering) and onClose unmounts it", async () => {
    function Confirm() {
      const [show, setShow] = useState(true);
      return show ? <Dialog title="Remove member?" onClose={() => setShow(false)} /> : <p>Closed</p>;
    }
    const screen = await render(<ZenProvider><Confirm /></ZenProvider>);
    await expect.element(screen.getByRole("dialog", { name: "Remove member?" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByText("Closed")).toBeVisible();
  });

  it("onOpenChange and onClose both hear a close request", async () => {
    const onOpenChange = vi.fn();
    const onClose = vi.fn();
    const screen = await render(<ZenProvider><Dialog open onOpenChange={onOpenChange} onClose={onClose} title="Leave page?" secondaryAction={{ label: "Stay" }} /></ZenProvider>);
    await screen.getByRole("button", { name: "Stay" }).click();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("an inline onClose does not pull focus back while the parent re-renders", async () => {
    function Invite() {
      const [open, setOpen] = useState(true);
      const [name, setName] = useState("");
      const [email, setEmail] = useState("");
      return (
        <ModalForm open={open} onClose={() => setOpen(false)} title="Invite member">
          <InputField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <InputField label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </ModalForm>
      );
    }
    const screen = await render(<ZenProvider><Invite /></ZenProvider>);
    const email = screen.getByLabelText("Email");
    await email.click();
    await userEvent.keyboard("ava@zen.dev");
    await expect.element(email).toHaveValue("ava@zen.dev");
    await expect.element(email).toHaveFocus();
  });
});

describe("feedback: status", () => {
  it("maps success / error / warning / info to Zen tones", async () => {
    const screen = await render(
      <ZenProvider>
        <Toast status="success" title="Invite sent" />
        <AlertBanner status="error">Sync failed</AlertBanner>
        <InlineMessage status="warning" title="Almost full" />
        <InlineMessage status="info" title="Heads up" />
      </ZenProvider>,
    );
    const root = screen.container;
    expect(root.querySelector(".zen-toast")?.getAttribute("data-type")).toBe("positive");
    expect(root.querySelector(".zen-alert-banner")?.getAttribute("data-tone")).toBe("negative");
    expect([...root.querySelectorAll(".zen-inline-message")].map((node) => node.getAttribute("data-tone"))).toEqual(["warning", "info"]);
  });

  it("the Zen prop wins over the alias", async () => {
    const screen = await render(<ZenProvider><Toast type="negative" status="success" title="Payment failed" /></ZenProvider>);
    expect(screen.container.querySelector(".zen-toast")?.getAttribute("data-type")).toBe("negative");
  });
});

describe("icon plain names", () => {
  it("icon-search-line and icon-x-line draw their Medium cut", async () => {
    const screen = await render(
      <ZenProvider>
        <Icon name="icon-search-line" title="Plain search" /><Icon name="icon-search-medium-line" title="Medium search" />
        <Icon name="icon-x-line" title="Plain close" /><Icon name="icon-x-medium-line" title="Medium close" />
      </ZenProvider>,
    );
    const drawing = (name: string) => screen.getByRole("img", { name }).element().querySelector("g")?.innerHTML ?? "";
    await expect.poll(() => drawing("Plain search")).not.toBe("");
    expect(drawing("Plain search")).toBe(drawing("Medium search"));
    await expect.poll(() => drawing("Plain close")).not.toBe("");
    expect(drawing("Plain close")).toBe(drawing("Medium close"));
  });
});

describe("Table data and default row ids, field errorMessage", () => {
  it("Table takes data, and without getRowId selects by each row's id", async () => {
    const onSelectionChange = vi.fn();
    const members = [{ id: "m-1", name: "Ava" }, { id: "m-2", name: "Ben" }];
    const screen = await render(
      <ZenProvider>
        <Table aria-label="Members" data={members} columns={[{ id: "name", header: "Name", cell: (row) => row.name }]} selectable selectedIds={[]} onSelectionChange={onSelectionChange} />
      </ZenProvider>,
    );
    await expect.element(screen.getByText("Ben")).toBeVisible();
    // The native input is visually hidden behind the Zen mark, as in every Zen checkbox.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 2" }), { force: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["m-2"]);
  });

  it("InputField shows errorMessage as its error", async () => {
    const screen = await render(<ZenProvider><InputField label="Email" errorMessage="Enter a valid email" /></ZenProvider>);
    await expect.element(screen.getByText("Enter a valid email")).toBeVisible();
    await expect.element(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Button leftIcon / rightIcon, Badge color", () => {
  it("Button draws leftIcon and rightIcon like startIcon and endIcon", async () => {
    const screen = await render(<ZenProvider><Button leftIcon="icon-plus-line" rightIcon="icon-chevron-right-line-small">Add member</Button></ZenProvider>);
    const button = screen.getByRole("button", { name: "Add member" }).element();
    expect(button.querySelector('svg[data-icon="icon-plus-line"]')).not.toBeNull();
    expect(button.querySelector('svg[data-icon="icon-chevron-right-line-small"]')).not.toBeNull();
    expect(button.hasAttribute("lefticon")).toBe(false);
  });

  it("Badge takes its colour from color", async () => {
    const screen = await render(<ZenProvider><Badge color="green">Active</Badge></ZenProvider>);
    const badge = screen.container.querySelector(".zen-badge");
    expect(badge?.getAttribute("data-tone")).toBe("green");
    expect(badge?.hasAttribute("color")).toBe(false);
  });
});
