/**
 * Figma sync, 2026-10-21 (the user updated Pattern Sidebar, AppShell and Header/AppShell and approved the code props):
 * - Header/AppShell (16783:71068) Theme = Default | Border & Divider and Density = Medium | Small;
 * - Patterns/Sidebar (6040:67524) Theme = Default | Border;
 * - Pattern/AppShell/Desktop Layout=Grid (`pattern="grid"`), which draws both in lines;
 * - Primitives/Sub-Header-Sidebar (16823:88101), the Sidebar's `subHeader`.
 * Real browser (Chromium); the measures are Figma's.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AppShell, AppShellHeader, Sidebar, SidebarSubHeader, ZenProvider, type SidebarSection } from "../../src/index";

const sections: SidebarSection[] = [{ items: [{ id: "home", label: "Home", icon: "icon-home-line" }, { id: "work", label: "Work", icon: "icon-folder-line" }] }];
const px = (el: Element, prop: string) => parseFloat(getComputedStyle(el).getPropertyValue(prop));

const shell = (props: Partial<React.ComponentProps<typeof AppShell>> = {}, sidebar = <Sidebar aria-label="Main" sections={sections} />, header = <AppShellHeader leading={<span>Top</span>} main={<span>Page</span>} />) => (
  <ZenProvider><div style={{ width: 1280 }}><AppShell layout="desktop" sidebar={sidebar} header={header} {...props}><p>Body</p></AppShell></div></ZenProvider>
);

describe("AppShellHeader Theme and Density", () => {
  it("Default · Medium: Main pads 24 · 24 · 12 · 24 with Gap/Large (24) between the rows", async () => {
    const { container } = await render(shell());
    const header = container.querySelector(".zen-app-shell-header")!;
    expect(header.hasAttribute("data-theme")).toBe(false);
    const main = header.querySelector(".zen-app-shell-header__main")!;
    expect([px(main, "padding-top"), px(main, "padding-bottom"), px(main, "row-gap")]).toEqual([24, 12, 24]);
  });

  it("Density=Small: Margin-Compact (20) above", async () => {
    const { container } = await render(shell({}, undefined, <AppShellHeader density="small" leading={<span>Top</span>} />));
    expect(px(container.querySelector(".zen-app-shell-header__main")!, "padding-top")).toBe(20);
  });

  it("Theme=Border & Divider: the top row pads 12 · 24 over a 1px Pale line, the Main row 16 · 24", async () => {
    const { container } = await render(shell({}, undefined, <AppShellHeader theme="border-divider" leading={<span>Top</span>} main={<span>Page</span>} />));
    const header = container.querySelector(".zen-app-shell-header")!;
    expect(header.getAttribute("data-theme")).toBe("border-divider");
    const main = header.querySelector(".zen-app-shell-header__main")!;
    expect([px(main, "padding-top"), px(main, "row-gap")]).toEqual([0, 0]);
    const top = header.querySelector(".zen-app-shell-header__top")!;
    expect([px(top, "padding-top"), px(top, "padding-left"), px(top, "border-bottom-width")]).toEqual([12, 24, 1]);
    expect(top.getBoundingClientRect().height).toBe(65);
    const element = header.querySelector(".zen-app-shell-header__element")!;
    expect([px(element, "padding-top"), px(element, "padding-left")]).toEqual([16, 24]);
  });
});

describe("Sidebar Theme=Border and the sub-header", () => {
  it("theme=\"border\": flush with the edge, no fill, corners or shadow, a 1px line on the inner edge", async () => {
    const { container } = await render(<ZenProvider><div style={{ height: 600 }}><Sidebar aria-label="Main" theme="border" sections={sections} /></div></ZenProvider>);
    const nav = container.querySelector(".zen-sidebar")!;
    expect(nav.getAttribute("data-theme")).toBe("border");
    expect(px(nav, "padding-left")).toBe(0);
    const surface = nav.querySelector(".zen-sidebar__surface")!;
    expect(getComputedStyle(surface).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(surface).boxShadow).toBe("none");
    expect(px(surface, "border-top-left-radius")).toBe(0);
    expect(getComputedStyle(nav, "::after").width).toBe("1px");
  });

  it("borderless, carved and carved-floating follow Figma's Patterns/Sidebar themes", async () => {
    const carved = getComputedStyle(document.documentElement).getPropertyValue("--zen-color-background-carved").trim();
    const { container } = await render(<ZenProvider>
      <div style={{ height: 400, display: "flex" }}><Sidebar aria-label="A" theme="borderless" sections={sections} /></div>
      <div style={{ height: 400, display: "flex" }}><Sidebar aria-label="B" theme="carved" sections={sections} /></div>
      <div style={{ height: 400, display: "flex" }}><Sidebar aria-label="C" theme="carved-floating" sections={sections} /></div>
    </ZenProvider>);
    const [borderless, carvedNav, floating] = [...container.querySelectorAll(".zen-sidebar")];
    expect(px(borderless, "padding-left")).toBe(0);
    expect(getComputedStyle(borderless, "::after").content).toBe("none");
    expect(px(carvedNav, "padding-left")).toBe(0);
    const probe = document.createElement("div"); probe.style.background = `var(--zen-color-background-carved)`; container.appendChild(probe);
    const want = getComputedStyle(probe).backgroundColor;
    expect(carved).not.toBe("");
    expect(getComputedStyle(carvedNav.querySelector(".zen-sidebar__surface")!).backgroundColor).toBe(want);
    expect(px(floating, "padding-left")).toBe(8);
    const panel = floating.querySelector(".zen-sidebar__surface")!;
    expect(getComputedStyle(panel).backgroundColor).toBe(want);
    expect(getComputedStyle(panel).boxShadow).toBe("none");
    expect(px(panel, "border-top-left-radius")).toBe(20);
  });

  it("density=\"small\" alone is the Basic panel at Density=Small, not the old Small-Density variant", async () => {
    const { container } = await render(<ZenProvider><div style={{ height: 400 }}><Sidebar aria-label="Main" density="small" sections={sections} /></div></ZenProvider>);
    const nav = container.querySelector(".zen-sidebar")!;
    expect(nav.getAttribute("data-variant")).toBe("basic");
    expect(nav.getAttribute("data-sidebar-density")).toBe("small");
    expect(container.querySelector(".zen-sidebar__item")!.getBoundingClientRect().height).toBe(36);
  });

  it("subHeader: the back control over the level's title, at the top of the body", async () => {
    let back = 0;
    const { container, getByRole } = await render(<ZenProvider><Sidebar aria-label="Main" sections={sections} subHeader={<SidebarSubHeader title="Brand refresh" onBack={() => { back += 1; }} />} /></ZenProvider>);
    const body = container.querySelector(".zen-sidebar__body")!;
    expect(body.firstElementChild?.classList.contains("zen-sidebar__sub-header")).toBe(true);
    expect(getByRole("heading", { name: "Brand refresh" }).element().tagName).toBe("H2");
    await getByRole("button", { name: "Back" }).click();
    expect(back).toBe(1);
    const sub = body.firstElementChild!;
    expect([px(sub, "padding-top"), px(sub, "padding-left"), px(sub, "padding-bottom"), px(sub, "row-gap")]).toEqual([4, 12, 8, 16]);
  });
});

describe("Sidebar rail, Density=Medium (Patterns/Sidebar Expand=No; user 2026-10-21: \"Sửa rail Medium theo Figma\")", () => {
  it("is 80 wide: the Padding/XSmall inset on the outer edge only, the logo and collapse control Gap/Large apart", async () => {
    const { container } = await render(<ZenProvider><div style={{ height: 600, display: "flex" }}><Sidebar aria-label="Main" collapsed onCollapsedChange={() => undefined} sections={sections} /></div></ZenProvider>);
    const nav = container.querySelector(".zen-sidebar")!;
    expect(nav.getBoundingClientRect().width).toBe(80);
    expect([px(nav, "padding-left"), px(nav, "padding-right")]).toEqual([8, 0]);
    expect(px(nav.querySelector(".zen-sidebar__default-brand")!, "row-gap")).toBe(24);
  });
});

describe("AppShell pattern=\"grid\"", () => {
  it("draws the Sidebar Border · Small and the header Border & Divider · Small", async () => {
    const { container } = await render(shell({ pattern: "grid" }));
    const nav = container.querySelector(".zen-sidebar")!;
    expect(nav.getAttribute("data-theme")).toBe("border");
    expect(nav.getAttribute("data-sidebar-density")).toBe("small");
    expect(nav.getAttribute("data-variant")).toBe("basic");
    expect(container.querySelector(".zen-sidebar__item")!.getBoundingClientRect().height).toBe(36);
    const header = container.querySelector(".zen-app-shell-header")!;
    expect(header.getAttribute("data-theme")).toBe("border-divider");
    expect(header.getAttribute("data-density")).toBe("small");
  });

  it("a theme or density set on the Sidebar or the header wins over the pattern's", async () => {
    const { container } = await render(shell({ pattern: "grid" }, <Sidebar aria-label="Main" theme="default" sections={sections} />, <AppShellHeader theme="default" density="medium" leading={<span>Top</span>} />));
    expect(container.querySelector(".zen-sidebar")!.hasAttribute("data-theme")).toBe(false);
    const header = container.querySelector(".zen-app-shell-header")!;
    expect(header.hasAttribute("data-theme")).toBe(false);
    expect(header.hasAttribute("data-density")).toBe(false);
  });
});
