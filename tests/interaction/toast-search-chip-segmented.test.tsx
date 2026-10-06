/**
 * Approved backlog fixes (2026-10-02, group b1): a Toast action dismisses its toast (opt out with action.keepOpen),
 * Search's clear button keeps focus in the field and its filter affordance carries aria-haspopup / aria-expanded with a
 * ≥ 24px hit area, a Chip with a visible count is named "Filters, 2 applied", and icon-only Segmented options show the
 * 1s name tooltip.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { Button, Chip, Search, Segmented, Toast, ZenProvider, useToast } from "../../src/index";

describe("Toast action", () => {
  function Archive({ keepOpen = false, dismissInAction = false, onUndo }: { keepOpen?: boolean; dismissInAction?: boolean; onUndo: () => void }) {
    const { toast, dismiss } = useToast();
    return (
      <>
        <Button onClick={() => toast({ title: "Other toast", duration: null })}>Other</Button>
        <Button onClick={() => {
          const id = toast({ title: "Project archived", duration: null, action: { label: "Undo", keepOpen, onClick: () => { onUndo(); if (dismissInAction) dismiss(id); } } });
        }}>Archive</Button>
      </>
    );
  }

  it("runs onClick, then dismisses the toast", async () => {
    const onUndo = vi.fn();
    const screen = await render(<ZenProvider><Archive onUndo={onUndo} /></ZenProvider>);
    await screen.getByRole("button", { name: "Archive" }).click();
    await screen.getByRole("button", { name: "Undo" }).click();
    expect(onUndo).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByText("Project archived")).not.toBeInTheDocument();
  });

  it("an action that already calls dismiss(id) still works, and other toasts stay", async () => {
    const onUndo = vi.fn();
    const screen = await render(<ZenProvider><Archive dismissInAction onUndo={onUndo} /></ZenProvider>);
    await screen.getByRole("button", { name: "Other" }).click();
    await screen.getByRole("button", { name: "Archive" }).click();
    await screen.getByRole("button", { name: "Undo" }).click();
    expect(onUndo).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByText("Project archived")).not.toBeInTheDocument();
    await expect.element(screen.getByText("Other toast")).toBeVisible();
  });

  it("action.keepOpen leaves the toast open", async () => {
    const onUndo = vi.fn();
    const screen = await render(<ZenProvider><Archive keepOpen onUndo={onUndo} /></ZenProvider>);
    await screen.getByRole("button", { name: "Archive" }).click();
    await screen.getByRole("button", { name: "Undo" }).click();
    expect(onUndo).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByText("Project archived")).toBeVisible();
  });

  it("a standalone Toast calls onClick before onClose; without onClose the action just runs", async () => {
    const calls: string[] = [];
    const screen = await render(
      <ZenProvider>
        <Toast title="Export ready" action={{ label: "Download", onClick: () => calls.push("download") }} onClose={() => calls.push("close")} />
        <Toast title="Storage almost full" action={{ label: "Upgrade", onClick: () => calls.push("upgrade") }} />
      </ZenProvider>,
    );
    await screen.getByRole("button", { name: "Download" }).click();
    expect(calls).toEqual(["download", "close"]);
    await screen.getByRole("button", { name: "Upgrade" }).click();
    expect(calls).toEqual(["download", "close", "upgrade"]);
  });
});

describe("Search", () => {
  it("the clear button returns focus to the field", async () => {
    const screen = await render(<ZenProvider><Search aria-label="Search members" defaultValue="ava" /></ZenProvider>);
    const field = screen.getByRole("searchbox", { name: "Search members" });
    await screen.getByRole("button", { name: "Clear search" }).click();
    await expect.element(field).toHaveValue("");
    await expect.element(field).toHaveFocus();
    await expect.element(screen.getByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("an onClear that moves focus elsewhere still wins", async () => {
    function Clearable() {
      const [query, setQuery] = useState("ava");
      return <><Search aria-label="Search members" value={query} onValueChange={setQuery} onClear={() => document.getElementById("next")?.focus()} /><button id="next" type="button">Next</button></>;
    }
    const screen = await render(<ZenProvider><Clearable /></ZenProvider>);
    await screen.getByRole("button", { name: "Clear search" }).click();
    await expect.element(screen.getByRole("searchbox", { name: "Search members" })).toHaveValue("");
    await expect.element(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  });

  it("the filter affordance carries filterHasPopup / filterExpanded (Filter-Icon and Filter-Dropdown)", async () => {
    function Filters() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Search aria-label="Search files" theme="filter-icon" filterActionLabel="Filter by type" filterHasPopup="dialog" filterExpanded={open} onFilterClick={() => setOpen(true)} />
          <Search aria-label="Search people" theme="filter-dropdown" filterActionLabel="Team" filterLabel="All" filterHasPopup="dialog" filterExpanded={false} onFilterClick={() => undefined} />
          <Search aria-label="Search docs" theme="filter-dropdown" filterActionLabel="Scope" filterOptions={[{ value: "all", label: "All" }, { value: "tokens", label: "Tokens" }]} filterValue="all" filterHasPopup="dialog" />
        </>
      );
    }
    const screen = await render(<ZenProvider><Filters /></ZenProvider>);
    const icon = screen.getByRole("button", { name: "Filter by type" });
    await expect.element(icon).toHaveAttribute("aria-haspopup", "dialog");
    await expect.element(icon).toHaveAttribute("aria-expanded", "false");
    await icon.click();
    await expect.element(icon).toHaveAttribute("aria-expanded", "true");
    const dropdown = screen.getByRole("button", { name: "Team: All" });
    await expect.element(dropdown).toHaveAttribute("aria-haspopup", "dialog");
    await expect.element(dropdown).toHaveAttribute("aria-expanded", "false");
    // The picker owns its listbox semantics.
    const picker = screen.getByRole("button", { name: "Scope: All" });
    await expect.element(picker).toHaveAttribute("aria-haspopup", "listbox");
    await expect.element(picker).toHaveAttribute("aria-expanded", "false");
  });

  it("the Filter-Icon trailing keeps its Figma box and has a ≥ 24×24 hit area at every size", async () => {
    await render(
      <ZenProvider>
        <Search aria-label="Small" size="sm" theme="filter-icon" onFilterClick={() => undefined} />
        <Search aria-label="Medium" size="md" theme="filter-icon" onFilterClick={() => undefined} />
      </ZenProvider>,
    );
    const buttons = [...document.querySelectorAll<HTMLElement>(".zen-search .zen-input-leading-trailing--interactive[data-icon-only='true']")];
    expect(buttons).toHaveLength(2);
    const [small, medium] = buttons;
    // Visual box unchanged: icon (Element-Size/Popular Small 16 · Base 20) + Spacing/Padding/2XSmall on each side.
    expect(small.getBoundingClientRect().width).toBeCloseTo(24, 0);
    expect(medium.getBoundingClientRect().width).toBeCloseTo(28, 0);
    for (const button of buttons) {
      const after = getComputedStyle(button, "::after");
      expect(after.content).not.toBe("none");
      expect(after.position).toBe("absolute");
      expect(parseFloat(after.width)).toBeGreaterThanOrEqual(24);
      expect(parseFloat(after.height)).toBeGreaterThanOrEqual(24);
      expect(after.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    }
  });
});

describe("Chip count in the accessible name", () => {
  it("names an Advanced counter and a Multiple count 'Label, N applied', never 'Label2'", async () => {
    const screen = await render(
      <ZenProvider>
        <Chip variant="advanced" counter={2} onClick={() => undefined}>Filters</Chip>
        <Chip variant="advanced" selectionMode="multiple" selected selectionCount={3} onClearSelection={() => undefined}>Owner</Chip>
        <Chip variant="advanced" selectionMode="multiple" selected selectionCount={1} onClearSelection={() => undefined}>Status</Chip>
        <Chip variant="normal" counter={4} selected={false} onClick={() => undefined}>Unread</Chip>
        <Chip variant="advanced" counter={5} aria-label="All filters" onClick={() => undefined}>Filters</Chip>
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("button", { name: "Filters, 2 applied", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Owner, 3 applied", exact: true })).toBeVisible();
    // One value shows no count (the remove affordance instead): the name is the label.
    await expect.element(screen.getByRole("button", { name: "Status", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Unread, 4", exact: true })).toBeVisible();
    // The caller's own name wins.
    await expect.element(screen.getByRole("button", { name: "All filters", exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /Filters2|Owner3|Unread4/ }).elements()).toHaveLength(0);
  });

  it("uses the locale (vi) and a hidden suffix for a non-text label", async () => {
    const screen = await render(
      <ZenProvider locale="vi">
        <Chip variant="advanced" counter={2} onClick={() => undefined}>Bộ lọc</Chip>
        <Chip variant="advanced" counter={2} onClick={() => undefined}><span>Owner</span></Chip>
      </ZenProvider>,
    );
    await expect.element(screen.getByRole("button", { name: "Bộ lọc, 2 mục đã áp dụng", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /^Owner\s?, 2 mục đã áp dụng$/ })).toBeVisible();
  });
});

describe("Segmented icon-only options", () => {
  const views = [
    { id: "list", label: null, leading: "icon-list-line", "aria-label": "List view" },
    { id: "grid", label: null, leading: "icon-grid-01-line", "aria-label": "Grid view" },
  ];

  it("show their name as a tooltip at once on keyboard focus and after 1s of hover", async () => {
    const screen = await render(<ZenProvider><Segmented aria-label="View" defaultValue="list" options={views} /></ZenProvider>);
    await userEvent.tab();
    await expect.element(screen.getByRole("button", { name: "List view" })).toHaveFocus();
    await expect.element(screen.getByRole("tooltip")).toHaveTextContent("List view");
    await userEvent.tab();
    await expect.element(screen.getByRole("tooltip")).toHaveTextContent("Grid view");
    (document.activeElement as HTMLElement | null)?.blur();
    await expect.element(screen.getByRole("tooltip")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "List view" }).hover();
    await expect.element(screen.getByRole("tooltip"), { timeout: 3000 }).toHaveTextContent("List view");
  });

  it("labelled options show no tooltip", async () => {
    const screen = await render(<ZenProvider><Segmented aria-label="Period" options={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }]} /></ZenProvider>);
    await userEvent.tab();
    await expect.element(screen.getByRole("button", { name: "Day" })).toHaveFocus();
    expect(document.querySelector("[role='tooltip']")).toBeNull();
  });
});
