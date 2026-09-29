/**
 * Interaction tests for AppShell (Figma ◇ Master-Layout, ◆ HR-Platform): the rail toggle, the navigation drawer (modal
 * dialog: focus, Tab, Escape, Close, choosing a page), the skip link, and the top-bar parts AppShellAction and
 * AppShellAccount. Real browser (Chromium).
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { AppShell, AppShellAccount, AppShellAction, Breadcrumbs, Menu, Sidebar, ZenProvider, useAppShell, type SidebarSection } from "../../src/index";

const sections: SidebarSection[] = [
  { items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "members", label: "Members", icon: "icon-users-line" }] },
  { label: "Settings", items: [{ id: "billing", label: "Billing", icon: "icon-credit-card-line" }] },
];

function Shell({ layout = "auto", onCollapse }: { layout?: "auto" | "sidebar" | "drawer"; onCollapse?: (collapsed: boolean) => void }) {
  const [page, setPage] = useState("members");
  return (
    <ZenProvider>
      <AppShell layout={layout} mainId="test-main" onSidebarCollapsedChange={onCollapse}
        sidebar={<Sidebar sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }, { id: page, label: page }]} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} />}
        headerActions={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={12} onClick={() => undefined} />}
      >
        <p>Page {page}</p>
      </AppShell>
    </ZenProvider>
  );
}

describe("AppShell rail toggle", () => {
  it("leads the top bar and collapses the Sidebar to its rail", async () => {
    const onCollapse = vi.fn();
    const screen = await render(<Shell layout="sidebar" onCollapse={onCollapse} />);
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    const controls = toggle.element().getAttribute("aria-controls");
    expect(controls && document.getElementById(controls)?.querySelector(".zen-sidebar")).toBeTruthy();
    await toggle.click();
    expect(onCollapse).toHaveBeenCalledWith(true);
    await expect.element(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".zen-sidebar")?.getAttribute("data-collapsed")).toBe("true");
  });
});

describe("AppShell drawer", () => {
  it("opens as a modal dialog with focus on the current page and the page behind inert", async () => {
    const screen = await render(<Shell layout="drawer" />);
    const menu = screen.getByRole("button", { name: "Open navigation" });
    await expect.element(menu).toHaveAttribute("aria-haspopup", "dialog");
    await menu.click();
    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    await expect.element(dialog).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Members" })).toHaveFocus();
    expect(document.querySelector(".zen-app-shell")?.hasAttribute("inert")).toBe(true);
    // The drawer shows the whole navigation: never the rail, and no collapse control inside the modal.
    expect(dialog.element().querySelector(".zen-sidebar")?.getAttribute("data-collapsed")).toBe("false");
    expect(dialog.element().querySelector(".zen-sidebar__collapse")).toBeNull();
  });

  it("keeps Tab inside, closes on Escape and returns focus to the menu button", async () => {
    const screen = await render(<Shell layout="drawer" />);
    const menu = screen.getByRole("button", { name: "Open navigation" });
    await menu.click();
    await expect.element(screen.getByRole("dialog")).toBeVisible();
    for (let i = 0; i < 6; i++) await userEvent.keyboard("{Tab}");
    expect(screen.getByRole("dialog").element().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    await expect.element(menu).toHaveFocus();
    expect(document.querySelector(".zen-app-shell")?.hasAttribute("inert")).toBe(false);
  });

  it("closes from its Close button", async () => {
    const screen = await render(<Shell layout="drawer" />);
    await screen.getByRole("button", { name: "Open navigation" }).click();
    await screen.getByRole("button", { name: "Close navigation" }).click();
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open on a section title, closes on a page and moves focus to <main>", async () => {
    const screen = await render(<Shell layout="drawer" />);
    await screen.getByRole("button", { name: "Open navigation" }).click();
    const dialog = screen.getByRole("dialog");
    (dialog.element().querySelector(".zen-sidebar__section-item") as HTMLElement).click();
    await expect.element(dialog).toBeVisible();
    await screen.getByRole("button", { name: "Billing" }).click();
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    await expect.element(screen.getByText("Page billing")).toBeVisible();
    expect(document.activeElement?.id).toBe("test-main");
  });

  it("follows the shell's own width in auto layout", async () => {
    const screen = await render(<div style={{ width: 600 }}><Shell /></div>);
    await expect.element(screen.getByRole("button", { name: "Open navigation" })).toBeVisible();
    expect(document.querySelector(".zen-app-shell")?.getAttribute("data-layout")).toBe("drawer");
  });
});

describe("AppShell skip link", () => {
  it("moves focus to <main> without changing the URL", async () => {
    const screen = await render(<Shell layout="sidebar" />);
    const before = window.location.href;
    await userEvent.keyboard("{Tab}");
    const skip = screen.getByRole("link", { name: "Skip to content" });
    await expect.element(skip).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement?.id).toBe("test-main");
    expect(window.location.href).toBe(before);
  });
});

describe("AppShell top-bar parts", () => {
  it("AppShellAction adds the unread count to its name and caps the badge at 99+", async () => {
    const screen = await render(<ZenProvider><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={120} onClick={() => undefined} /><AppShellAction icon="icon-mail-01-line" aria-label="Inbox" dot onClick={() => undefined} /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "Notifications, 120 new" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Inbox, new" })).toBeVisible();
    expect(document.querySelector(".zen-app-shell-action__notification[data-style='number']")?.textContent).toBe("99+");
  });

  it("names the count in Vietnamese with locale vi", async () => {
    const screen = await render(<ZenProvider locale="vi"><AppShellAction icon="icon-bell-01-line" aria-label="Thông báo" count={3} onClick={() => undefined} /><AppShellAccount name="Ava Chen" /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "Thông báo, 3 mục mới" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Tài khoản: Ava Chen" })).toBeVisible();
  });

  it("AppShellAccount opens a Menu as its trigger", async () => {
    const onSelect = vi.fn();
    const screen = await render(<ZenProvider><Menu align="end" trigger={<AppShellAccount name="Ava Chen" />} items={[{ id: "profile", label: "Profile" }, { id: "sign-out", label: "Sign out" }]} onSelect={(item) => onSelect(item.id)} /></ZenProvider>);
    const trigger = screen.getByRole("button", { name: "Account: Ava Chen" });
    await trigger.click();
    await screen.getByRole("menuitem", { name: "Sign out" }).click();
    expect(onSelect).toHaveBeenCalledWith("sign-out");
    await expect.element(trigger).toHaveFocus();
  });
});

describe("useAppShell", () => {
  function RailReader() {
    const shell = useAppShell();
    return <button type="button" onClick={() => shell?.toggleSidebar()}>{shell?.sidebarCollapsed ? "Rail" : "Expanded"} · {shell?.layout}</button>;
  }
  it("exposes the layout and the rail state to your own controls", async () => {
    const screen = await render(<ZenProvider><AppShell layout="sidebar" sidebar={<Sidebar sections={sections} onItemClick={() => undefined} />}><RailReader /></AppShell></ZenProvider>);
    const button = screen.getByRole("button", { name: "Expanded · sidebar" });
    await button.click();
    await expect.element(screen.getByRole("button", { name: "Rail · sidebar" })).toBeVisible();
    expect(document.querySelector(".zen-sidebar")?.getAttribute("data-collapsed")).toBe("true");
  });
});
