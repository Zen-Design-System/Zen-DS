/**
 * Backlog (2026-10-07 sweep, P2): AppShell passed the rail state with cloneElement, so a Sidebar wrapped in an app
 * component never collapsed. Sidebar now reads the shell; the rail separates groups and shows a counter as a dot.
 * 2026-10-18 (user: expand/collapse broke once a template's Sidebar was customised): the shell found the Sidebar by its
 * element, so a wrapped one got no toggle, stayed a rail when it said `collapsed`, or met a dead top-bar toggle beside
 * its own control. The Sidebar now registers with the shell wherever it sits.
 */
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AppShell, AppShellHeader, Sidebar, SidebarMenuItem, Stack, useAppShell, type SidebarSection } from "../../src/index";

const sections: SidebarSection[] = [
  { items: [{ id: "home", label: "Home", icon: "icon-home-line" }, { id: "inbox", label: "Approvals", icon: "icon-inbox-line", counter: 3 }] },
  { label: "Apps", items: [{ id: "time", label: "Time off", icon: "icon-calendar-line" }] },
];

function AppNavigation({ collapsed }: { collapsed?: boolean }) {
  return <Sidebar aria-label="Main" sections={sections} collapsed={collapsed} />;
}

/** A wrapped Sidebar that keeps the rail itself (its own collapsed + onCollapsedChange). */
function OwnRail() {
  const [collapsed, setCollapsed] = useState(false);
  return <Sidebar aria-label="Main" sections={sections} collapsed={collapsed} onCollapsedChange={setCollapsed} />;
}

/** The app's own control in the page, through useAppShell. */
function PageToggle() {
  const shell = useAppShell();
  return <button type="button" onClick={() => shell?.toggleSidebar()}>Toggle from the page</button>;
}

const shellOf = (sidebar: React.ReactNode, props: Partial<React.ComponentProps<typeof AppShell>> = {}) => (
  <div style={{ width: 1280 }}><AppShell layout="desktop" sidebar={sidebar} header={<AppShellHeader leading={<span>Top</span>} />} {...props}><PageToggle /></AppShell></div>
);

describe("AppShell › Sidebar context", () => {
  it("collapses a wrapped Sidebar to the rail, with a dot for the counter and a divider between groups", async () => {
    const screen = await render(<div style={{ width: 1280 }}><AppShell layout="desktop" defaultSidebarCollapsed sidebar={<AppNavigation />} header={<AppShellHeader leading={<span>Top</span>} />}><p>Page</p></AppShell></div>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    await expect.element(nav).toHaveAttribute("data-collapsed", "true");
    await expect.element(screen.getByRole("button", { name: "Approvals, 3" })).toBeInTheDocument();
    expect(nav.element().querySelectorAll(".zen-sidebar__notification-dot").length).toBe(1);
    const second = nav.element().querySelectorAll(".zen-sidebar__section")[1];
    expect(getComputedStyle(second, "::before").height).toBe("1px");
    await screen.getByRole("button", { name: "Expand sidebar" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "false");
  });

  it("gives a wrapped Sidebar the header toggle without any shell prop", async () => {
    const screen = await render(shellOf(<AppNavigation />));
    const nav = screen.getByRole("navigation", { name: "Main" });
    await expect.element(nav).toHaveAttribute("data-collapsed", "false");
    await screen.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "true");
    await screen.getByRole("button", { name: "Expand sidebar" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "false");
  });

  it("starts the rail from a wrapped Sidebar's collapsed and expands it from there", async () => {
    const screen = await render(shellOf(<AppNavigation collapsed />));
    const nav = screen.getByRole("navigation", { name: "Main" });
    await expect.element(nav).toHaveAttribute("data-collapsed", "true");
    await screen.getByRole("button", { name: "Expand sidebar" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "false");
  });

  it("lets defaultSidebarCollapsed win over a wrapped Sidebar's collapsed", async () => {
    const screen = await render(shellOf(<AppNavigation collapsed />, { defaultSidebarCollapsed: false }));
    await expect.element(screen.getByRole("navigation", { name: "Main" })).toHaveAttribute("data-collapsed", "false");
  });

  it("collapses a Sidebar wrapped in a layout component (a Studio wrap)", async () => {
    const screen = await render(shellOf(<Stack><Sidebar aria-label="Main" sections={sections} /></Stack>));
    const nav = screen.getByRole("navigation", { name: "Main" });
    await screen.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "true");
  });

  it("keeps one control for a wrapped Sidebar that owns the rail, and sends the shell's requests to it", async () => {
    const screen = await render(shellOf(<OwnRail />, { defaultSidebarCollapsed: false }));
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(document.querySelectorAll(".zen-app-shell-header__toggle").length).toBe(0);
    expect(nav.element().querySelectorAll(".zen-sidebar__collapse").length).toBe(1);
    await screen.getByRole("button", { name: "Toggle from the page" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "true");
    await screen.getByRole("button", { name: "Expand sidebar" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "false");
  });

  it("hides a footer SidebarMenuItem's label in the rail and keeps it as the name", async () => {
    const screen = await render(shellOf(<Sidebar aria-label="Main" sections={sections} collapsed footer={<SidebarMenuItem id="apps" label="Apps" icon="icon-shop-store-line" />} />));
    const nav = screen.getByRole("navigation", { name: "Main" });
    await expect.element(nav).toHaveAttribute("data-collapsed", "true");
    await expect.element(screen.getByRole("button", { name: "Apps" })).toBeInTheDocument();
    expect(getComputedStyle(nav.element().querySelector(".zen-sidebar__footer-content .zen-sidebar__item-label")!).display).toBe("none");
    expect(Math.round(nav.element().getBoundingClientRect().width)).toBe(84);
  });
});
