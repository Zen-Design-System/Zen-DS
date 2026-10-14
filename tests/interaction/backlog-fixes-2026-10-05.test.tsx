/**
 * Backlog fixes of 2026-10-05 outside the input family: a Menu shifted into a phone window, SidePanel submit actions, the
 * Chip's portalled Popover and the PageHeader's phone order. Real browser (Chromium).
 */
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { Button, Chip, InputField, Menu, PageHeader, SidePanel, ZenProvider } from "../../src/index";

const query = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);

describe("Menu and SidePanel (backlog batch 5)", () => {
  it("Menu that fits on neither side of its trigger shifts into a 390px window", async () => {
    await page.viewport(390, 844);
    await render(
      <ZenProvider>
        <div style={{ paddingLeft: 170, paddingTop: 40 }}>
          <Menu aria-label="Document actions" trigger={<Button>More</Button>}
            items={[{ id: "copy", label: "Copy a link to this document to your clipboard", onSelect: () => {} }, { id: "move", label: "Move this document to another project", onSelect: () => {} }]} />
        </div>
      </ZenProvider>,
    );
    await userEvent.click(page.getByRole("button", { name: "More" }));
    await expect.poll(() => document.querySelector("[role='menu']")).not.toBeNull();
    const menu = document.querySelector("[role='menu']")!.getBoundingClientRect();
    expect(menu.width).toBeGreaterThan(390 - 170 - 8);
    expect(menu.left).toBeGreaterThanOrEqual(8 - 0.5);
    expect(menu.right).toBeLessThanOrEqual(390 - 8 + 0.5);
  });

  it("SidePanel primaryAction type=submit submits the body's form (Enter in a field too)", async () => {
    let submits = 0;
    await render(
      <ZenProvider>
        <SidePanel open onOpenChange={() => {}} title="Rename project" primaryAction={{ label: "Save", type: "submit", form: "rename" }} secondaryAction={{ label: "Cancel" }}>
          <form id="rename" onSubmit={(event) => { event.preventDefault(); submits += 1; }}><InputField label="Name" defaultValue="Loyalty app" /></form>
        </SidePanel>
      </ZenProvider>,
    );
    await userEvent.click(page.getByRole("button", { name: "Save" }));
    await expect.poll(() => submits).toBe(1);
    await userEvent.click(page.getByRole("textbox", { name: "Name" }));
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => submits).toBe(2);
  });
});

describe("Chip popoverPortal (backlog batch 6)", () => {
  function ScrollRow() {
    const [status, setStatus] = useState<string[]>([]);
    return (
      <ZenProvider>
        <div data-testid="row" style={{ display: "flex", width: 160, overflowX: "auto" }}>
          <Chip variant="advanced" dropdown popoverPortal popoverLabel="Status" selectionMode="multiple" popoverMultiple selected={status.length > 0}
            popoverItems={["To do", "In review", "Done"].map((value) => ({ id: value, label: value, selected: status.includes(value) }))}
            onPopoverSelect={(item) => setStatus((list) => (list.includes(item.id) ? list.filter((id) => id !== item.id) : [...list, item.id]))}>Status</Chip>
        </div>
        <output data-testid="picked">{status.join(",")}</output>
      </ZenProvider>
    );
  }

  it("opens the menu outside a clipping scroll row, keeps picks working and returns focus on Escape", async () => {
    await render(<ScrollRow />);
    const chip = page.getByRole("button", { name: /Status/ });
    await userEvent.click(chip);
    await expect.poll(() => document.querySelector(".zen-popover")).not.toBeNull();
    const popover = document.querySelector<HTMLElement>(".zen-popover")!;
    expect(query("[data-testid='row']")!.contains(popover)).toBe(false);
    const box = popover.getBoundingClientRect();
    const chipBox = chip.element().getBoundingClientRect();
    expect(box.height).toBeGreaterThan(40);
    expect(Math.round(box.top)).toBeGreaterThanOrEqual(Math.round(chipBox.bottom));
    await userEvent.click(page.getByRole("option", { name: "In review" }));
    await expect.poll(() => query("[data-testid='picked']")?.textContent).toBe("In review");
    expect(document.querySelector(".zen-popover")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.activeElement).toBe(chip.element());
  });
});

describe("PageHeader on a phone (backlog batch 6)", () => {
  const header = (breakpoint: "mobile" | "desktop") => (
    <ZenProvider breakpoint={breakpoint}>
      <div style={{ width: 350 }}>
        <PageHeader title="Loyalty app" description="Points, rewards and checkout for the Phin & Co coffee app."
          actions={<><Button level="tertiary">Share</Button><Button level="primary">New task</Button></>} />
      </div>
    </ZenProvider>
  );
  const top = (selector: string) => query(selector)!.getBoundingClientRect().top;

  it("puts the description under the title and the actions after it on a phone", async () => {
    await render(header("mobile"));
    expect(top(".zen-page-header__description")).toBeLessThan(top(".zen-page-header__actions"));
    expect(top(".zen-page-header__titles")).toBeLessThan(top(".zen-page-header__description"));
  });

  it("keeps the title row (title and actions) above the description on desktop", async () => {
    await render(header("desktop"));
    expect(top(".zen-page-header__actions")).toBeLessThan(top(".zen-page-header__description"));
  });

  // Figma Header-Text (2026-10-09): the title and the description sit Spacing/Gap/2XSmall (4px) apart, on both.
  for (const breakpoint of ["desktop", "mobile"] as const) {
    it(`sets the description 4px under the title (${breakpoint})`, async () => {
      await render(<ZenProvider breakpoint={breakpoint}><PageHeader title="Studio overview" description="Money, capacity and delivery across the client work." /></ZenProvider>);
      const title = query(".zen-page-header .zen-heading")!.getBoundingClientRect();
      expect(Math.round(top(".zen-page-header__description") - title.bottom)).toBe(4);
    });
  }
});
