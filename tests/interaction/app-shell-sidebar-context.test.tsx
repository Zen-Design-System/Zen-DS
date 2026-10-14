/**
 * Backlog (2026-10-07 sweep, P2): AppShell passed the rail state with cloneElement, so a Sidebar wrapped in an app
 * component never collapsed. Sidebar now reads the shell; the rail separates groups and shows a counter as a dot.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AppShell, Sidebar, type SidebarSection } from "../../src/index";

const sections: SidebarSection[] = [
  { items: [{ id: "home", label: "Home", icon: "icon-home-line" }, { id: "inbox", label: "Approvals", icon: "icon-inbox-line", counter: 3 }] },
  { label: "Apps", items: [{ id: "time", label: "Time off", icon: "icon-calendar-line" }] },
];

function AppNavigation() {
  return <Sidebar aria-label="Main" sections={sections} />;
}

describe("AppShell › Sidebar context", () => {
  it("collapses a wrapped Sidebar to the rail, with a dot for the counter and a divider between groups", async () => {
    const screen = await render(<div style={{ width: 1280 }}><AppShell layout="sidebar" defaultSidebarCollapsed sidebar={<AppNavigation />} header={<span>Top</span>}><p>Page</p></AppShell></div>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    await expect.element(nav).toHaveAttribute("data-collapsed", "true");
    await expect.element(screen.getByRole("button", { name: "Approvals, 3" })).toBeInTheDocument();
    expect(nav.element().querySelectorAll(".zen-sidebar__notification-dot").length).toBe(1);
    const second = nav.element().querySelectorAll(".zen-sidebar__section")[1];
    expect(getComputedStyle(second, "::before").height).toBe("1px");
    await screen.getByRole("button", { name: "Expand sidebar" }).click();
    await expect.element(nav).toHaveAttribute("data-collapsed", "false");
  });
});
