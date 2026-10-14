/**
 * Sidebar Figma slots (2026-10-09): Body-Content as `<SidebarMenuItem>` / `<SidebarMenuSection>` children, Footer-Content
 * rows and Sub-Item rows. Slot rows render the same rows as a `sections` array and share selectedId, the rail and
 * onItemClick.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { Sidebar, SidebarMenuItem, SidebarMenuSection, SidebarSubMenu, ZenProvider, type SidebarItem, type SidebarSection } from "../../src/index";

const sections: SidebarSection[] = [
  { items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "inbox", label: "Inbox", icon: "ic-inbox-01-line", counter: 3 }] },
  { label: "Handbook", items: [{ id: "people", label: "People", icon: "icon-users-line", children: [{ id: "leave", label: "Leave" }, { id: "reviews", label: "Reviews" }] }] },
];

const slotBody = (
  <>
    <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />
    <SidebarMenuItem id="inbox" label="Inbox" icon="ic-inbox-01-line" counter={3} />
    <SidebarMenuSection label="Handbook">
      <SidebarMenuItem id="people" label="People" icon="icon-users-line">
        <SidebarMenuItem id="leave" label="Leave" />
        <SidebarMenuItem id="reviews" label="Reviews" />
      </SidebarMenuItem>
    </SidebarMenuSection>
  </>
);

describe("Sidebar Body-Content slot", () => {
  it("renders children rows exactly like the same sections array", async () => {
    const fromArray = await render(<ZenProvider><Sidebar aria-label="Array" selectedId="reviews" sections={sections} /></ZenProvider>);
    // Icons carry useId() clip-path ids, which differ between the two renders.
    const bodyOf = (container: HTMLElement) => container.querySelector(".zen-sidebar__body")!.innerHTML.replace(/_r_[\w]+_/g, "_r_id_");
    const arrayBody = bodyOf(fromArray.container);
    await fromArray.unmount();
    const fromSlot = await render(<ZenProvider><Sidebar aria-label="Slot" selectedId="reviews">{slotBody}</Sidebar></ZenProvider>);
    expect(bodyOf(fromSlot.container)).toBe(arrayBody);
    // selectedId opened the group that holds the nested slot row.
    expect(fromSlot.container.querySelector('[aria-current="page"]')?.textContent).toBe("Reviews");
  });

  it("calls onItemClick with the row's fields and toggles nested rows", async () => {
    const onItemClick = vi.fn<(item: SidebarItem) => void>();
    const screen = await render(<ZenProvider><Sidebar aria-label="Main" onItemClick={onItemClick}>{slotBody}</Sidebar></ZenProvider>);
    await screen.getByRole("button", { name: /^Inbox/ }).click();
    expect(onItemClick).toHaveBeenLastCalledWith(expect.objectContaining({ id: "inbox", label: "Inbox", counter: 3 }));
    const people = screen.getByRole("button", { name: "People" });
    await expect.element(people).toHaveAttribute("aria-expanded", "false");
    await people.click();
    await expect.element(people).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByRole("button", { name: "Leave" })).toBeVisible();
  });

  it("keeps other content where it is, between the row groups", async () => {
    const screen = await render(
      <ZenProvider>
        <Sidebar aria-label="Main">
          <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />
          <p className="storage">2 GB of 5 GB used</p>
          <SidebarMenuItem id="files" label="Files" icon="icon-folder-line" />
        </Sidebar>
      </ZenProvider>,
    );
    const blocks = [...screen.container.querySelector(".zen-sidebar__items")!.children];
    expect(blocks.map((block) => block.className)).toEqual(["zen-sidebar__section", "storage", "zen-sidebar__section"]);
  });
});

describe("Sidebar Footer-Content slot", () => {
  const footer = <><SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" /><SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" /></>;

  it("marks the selected footer row and reports it through onItemClick", async () => {
    const onItemClick = vi.fn<(item: SidebarItem) => void>();
    const screen = await render(<ZenProvider><Sidebar aria-label="Main" sections={sections} selectedId="settings" onItemClick={onItemClick} footer={footer} /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    await screen.getByRole("button", { name: "Help" }).click();
    expect(onItemClick).toHaveBeenLastCalledWith(expect.objectContaining({ id: "help" }));
    const row = screen.getByRole("button", { name: "Help" }).element().getBoundingClientRect();
    const body = screen.getByRole("button", { name: "Home" }).element().getBoundingClientRect();
    expect(row.width).toBe(body.width);
  });

  it("sizes footer rows like the body's on the collapsed rail and keeps their names", async () => {
    const screen = await render(<ZenProvider><Sidebar aria-label="Main" collapsed onCollapsedChange={() => undefined} sections={sections} footer={footer} /></ZenProvider>);
    const help = screen.getByRole("button", { name: "Help" }).element();
    const home = screen.getByRole("button", { name: "Home" }).element();
    expect(help.getBoundingClientRect().width).toBe(home.getBoundingClientRect().width);
    expect(getComputedStyle(help.querySelector(".zen-sidebar__item-label")!).display).toBe("none");
  });
});

describe("SidebarSubMenu Sub-Item slot", () => {
  it("renders children rows as one list sharing the flyout's onItemClick", async () => {
    const onItemClick = vi.fn<(item: SidebarItem) => void>();
    const screen = await render(
      <ZenProvider>
        <SidebarSubMenu onItemClick={onItemClick}>
          <SidebarMenuItem id="lumen" label="Lumen Banking" icon="icon-cube-line" />
          <SidebarMenuItem id="phin" label="Phin Loyalty" icon="icon-cube-line" />
        </SidebarSubMenu>
      </ZenProvider>,
    );
    expect(screen.container.querySelectorAll(".zen-sidebar__sub-items")).toHaveLength(1);
    await screen.getByRole("button", { name: "Phin Loyalty" }).click();
    expect(onItemClick).toHaveBeenLastCalledWith(expect.objectContaining({ id: "phin" }));
  });
});
