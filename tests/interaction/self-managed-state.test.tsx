/**
 * Self-managed state (2026-10-15, user: "các tính năng như chip advance, date input… hoạt động như bình thường trong
 * studio"): a page made from a template keeps no handlers, so a component that only showed what its parent decided
 * froze. Chip keeps its own choice without onPopoverSelect, Normal chips toggle from defaultSelected, Pagination and
 * Stepper keep their page and step from defaultPage / defaultCurrent, and the open state of a Chip or SelectField menu
 * has a defaultPopoverOpen twin, so a captured `popoverOpen={false}` no longer locks it.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { Chip, Pagination, SelectField, Stepper, ZenProvider } from "../../src/index";

const PHOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'/>";
const priorities = [{ id: "high", label: "High" }, { id: "low", label: "Low" }];
const statuses = [{ id: "todo", label: "To do", selected: true }, { id: "review", label: "In review" }, { id: "done", label: "Done" }];

const chipLabel = (screen: Awaited<ReturnType<typeof render>>) => screen.container.querySelector(".zen-chip__label")?.textContent;

describe("Chip keeps its own choice without onPopoverSelect", () => {
  it("shows the picked value as its label, marks it in the menu and clears it with × or Delete", async () => {
    const screen = await render(<ZenProvider><Chip variant="advanced" popoverLabel="Priority" popoverItems={priorities}>Priority</Chip></ZenProvider>);
    // The chip's name follows its label, so hold the element, not a query by name.
    const chip = screen.getByRole("button", { name: /Priority/ }).element() as HTMLElement;
    await userEvent.click(chip);
    await userEvent.click(page.getByRole("option", { name: "High" }));
    await expect.poll(() => chipLabel(screen)).toBe("High");
    expect(chip.getAttribute("data-select")).toBe("true");
    await userEvent.click(chip);
    await expect.element(page.getByRole("option", { name: "High" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Escape}");
    screen.container.querySelector<HTMLElement>(".zen-chip__remove")!.click();
    await expect.poll(() => chipLabel(screen)).toBe("Priority");
    expect(chip.getAttribute("data-select")).toBe("false");
    await userEvent.click(chip);
    await userEvent.click(page.getByRole("option", { name: "Low" }));
    await expect.poll(() => chipLabel(screen)).toBe("Low");
    chip.focus();
    await userEvent.keyboard("{Delete}");
    await expect.poll(() => chipLabel(screen)).toBe("Priority");
  });

  it("counts several picks for selectionMode multiple, starting from the items marked selected", async () => {
    const screen = await render(<ZenProvider><Chip variant="advanced" selectionMode="multiple" defaultSelected popoverMultiple popoverLabel="Status" popoverItems={statuses}>Status</Chip></ZenProvider>);
    const chip = screen.getByRole("button", { name: /Status/ });
    expect(chip.element().getAttribute("data-select")).toBe("true");
    await userEvent.click(chip);
    await userEvent.click(page.getByRole("option", { name: "Done" }));
    await expect.element(screen.getByRole("button", { name: "Status, 2 applied" })).toBeInTheDocument();
    await userEvent.click(page.getByRole("option", { name: "To do" }));
    await expect.poll(() => chipLabel(screen)).toBe("Done");
  });

  it("goes back to its popover label when it started on a picked value, and shows a picked person's photo", async () => {
    const people = [{ id: "an", label: "An Tran", photoSrc: PHOTO }, { id: "binh", label: "Binh Le", selected: true }];
    const screen = await render(<ZenProvider><Chip variant="advanced" defaultSelected popoverLabel="Owner" popoverItems={people}>Binh Le</Chip></ZenProvider>);
    const chip = screen.getByRole("button", { name: /Binh Le/ }).element() as HTMLElement;
    await userEvent.click(chip);
    await userEvent.click(page.getByRole("option", { name: "An Tran" }));
    await expect.poll(() => chipLabel(screen)).toBe("An Tran");
    await expect.poll(() => screen.container.querySelector(".zen-chip img")?.getAttribute("src")).toBe(PHOTO);
    screen.container.querySelector<HTMLElement>(".zen-chip__remove")!.click();
    await expect.poll(() => chipLabel(screen)).toBe("Owner");
    expect(screen.container.querySelector(".zen-chip img")).toBeNull();
  });

  it("only changes the value of a chip that starts on one without being Selected (a period picker)", async () => {
    const periods = [{ id: "7", label: "Last 7 days" }, { id: "30", label: "Last 30 days", selected: true }];
    const screen = await render(<ZenProvider><Chip variant="advanced" dropdown popoverLabel="Period" popoverItems={periods}>Last 30 days</Chip></ZenProvider>);
    const chip = screen.getByRole("button", { name: /Last 30 days/ }).element() as HTMLElement;
    await userEvent.click(chip);
    await userEvent.click(page.getByRole("option", { name: "Last 7 days" }));
    await expect.poll(() => chipLabel(screen)).toBe("Last 7 days");
    expect(chip.getAttribute("data-select")).toBe("false");
    expect(screen.container.querySelector(".zen-chip__remove")).toBeNull();
  });

  it("leaves the choice to the app when it listens with onPopoverSelect", async () => {
    const onPopoverSelect = vi.fn();
    const screen = await render(<ZenProvider><Chip variant="advanced" popoverLabel="Priority" popoverItems={priorities} onPopoverSelect={onPopoverSelect}>Priority</Chip></ZenProvider>);
    await userEvent.click(screen.getByRole("button", { name: /Priority/ }));
    await userEvent.click(page.getByRole("option", { name: "High" }));
    expect(onPopoverSelect).toHaveBeenCalledTimes(1);
    expect(chipLabel(screen)).toBe("Priority");
  });

  it("opens its menu from defaultPopoverOpen", async () => {
    await render(<ZenProvider><Chip variant="advanced" defaultPopoverOpen popoverLabel="Priority" popoverItems={priorities}>Priority</Chip></ZenProvider>);
    await expect.element(page.getByRole("option", { name: "High" })).toBeInTheDocument();
  });
});

describe("Normal chips and defaultSelected", () => {
  it("turns itself on and off from defaultSelected, and stays put without it", async () => {
    const screen = await render(<ZenProvider><Chip variant="normal" defaultSelected={false}>Unread</Chip><Chip variant="normal">Starred</Chip></ZenProvider>);
    const unread = screen.getByRole("button", { name: "Unread" });
    await expect.element(unread).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(unread);
    await expect.element(unread).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(unread);
    await expect.element(unread).toHaveAttribute("aria-pressed", "false");
    const starred = screen.getByRole("button", { name: "Starred" });
    await userEvent.click(starred);
    await expect.element(starred).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Pagination keeps its page from defaultPage", () => {
  it("moves the current page with the arrows and the page items", async () => {
    const screen = await render(<ZenProvider><Pagination pageCount={5} defaultPage={2} /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: /2/ })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await expect.element(screen.getByRole("button", { name: /3/ })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: /5/ }));
    await expect.element(screen.getByRole("button", { name: /5/ })).toHaveAttribute("aria-current", "page");
  });

  it("changes its page size itself and keeps the page's first row in view", async () => {
    const onPageSizeChange = vi.fn();
    const screen = await render(<ZenProvider><Pagination theme="inline" total={120} defaultPage={2} defaultPageSize={50} pageSizeOptions={[25, 50]} onPageSizeChange={onPageSizeChange} /></ZenProvider>);
    const range = () => screen.container.querySelector(".zen-pagination__range")?.textContent ?? "";
    expect(range()).toMatch(/51.100/);
    await userEvent.click(screen.getByRole("button", { name: /50/ }));
    await userEvent.click(page.getByRole("option", { name: /25/ }));
    await expect.poll(range).toMatch(/51.75/);
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });
});

describe("Stepper keeps its step from defaultCurrent", () => {
  it("goes back to a passed step when pressed; later steps stay inert", async () => {
    const steps = [{ id: "cart", title: "Cart" }, { id: "address", title: "Address" }, { id: "pay", title: "Payment" }];
    const screen = await render(<ZenProvider><Stepper aria-label="Checkout" steps={steps} defaultCurrent={2} /></ZenProvider>);
    await userEvent.click(screen.getByRole("button", { name: /Cart/ }));
    await expect.poll(() => screen.container.querySelector("[aria-current='step']")?.textContent).toContain("Cart");
    expect(screen.container.querySelectorAll("button.zen-stepper__hit").length).toBe(0);
  });
});

describe("SelectField defaultPopoverOpen", () => {
  it("opens its option list on mount", async () => {
    await render(<ZenProvider><SelectField label="Role" defaultPopoverOpen options={[{ label: "Editor", value: "editor" }, { label: "Viewer", value: "viewer" }]} /></ZenProvider>);
    await expect.element(page.getByRole("option", { name: "Editor" })).toBeInTheDocument();
  });
});
