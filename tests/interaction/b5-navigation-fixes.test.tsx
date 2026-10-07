/**
 * Approved backlog fixes (2026-10-02, group b5): Breadcrumbs "…" focus, the collapsed Sidebar footer's names and rail
 * tooltip, the vertical Stepper's outer line space, Bottom Navigation floating idle labels and ListItem `titleLines`.
 */
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BottomNavigation, Breadcrumbs, Icon, List, ListItem, Sidebar, Stepper, ZenProvider, type SidebarSection } from "../../src/index";

/** sRGB channels (0–255) and alpha of a computed `rgb()` / `rgba()` / `color(srgb …)` value. */
function parseColor(value: string): [number, number, number, number] {
  const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
  const parts = value.match(/[\d.]+/g)!.map(Number);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}
/** `top` alpha-composited over the opaque `bottom`, as an opaque rgb() string. */
function over(top: string, bottom: string) {
  const [tr, tg, tb, ta] = parseColor(top);
  const [br, bg, bb] = parseColor(bottom);
  return `rgb(${tr * ta + br * (1 - ta)}, ${tg * ta + bg * (1 - ta)}, ${tb * ta + bb * (1 - ta)})`;
}
const luminance = ([r, g, b]: number[]) => {
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
/** WCAG contrast of `fg` (alpha-composited) over the opaque `bg`. */
function contrast(fg: string, bg: string) {
  const mixed = parseColor(over(fg, bg));
  const [l1, l2] = [luminance(mixed), luminance(parseColor(bg))].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
const rect = (el: Element) => el.getBoundingClientRect();

describe("Breadcrumbs ellipsis", () => {
  const crumbs = [
    { id: "home", label: "Home", href: "#home" },
    { id: "hr", label: "People", href: "#hr" },
    { id: "teams", label: "Teams" },
    { id: "design", label: "Design", href: "#design" },
    { id: "ava", label: "Ava Nguyen" },
  ];
  it("moves focus to the first revealed crumb when “Show N more” is activated from the keyboard", async () => {
    const screen = await render(<ZenProvider><Breadcrumbs items={crumbs} maxItems={3} /></ZenProvider>);
    const more = screen.getByRole("button", { name: "Show 2 more" }).element() as HTMLButtonElement;
    more.focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => document.activeElement?.textContent).toBe("People");
    expect(document.activeElement?.tagName).toBe("A");
    expect(document.querySelectorAll(".zen-breadcrumbs__item")).toHaveLength(5);
  });
  it("also on a click, and reveals a button crumb the same way", async () => {
    const screen = await render(<ZenProvider><Breadcrumbs items={[crumbs[0], crumbs[2], crumbs[1], crumbs[3], crumbs[4]]} maxItems={2} /></ZenProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Show 3 more" }));
    await expect.poll(() => document.activeElement?.textContent).toBe("Teams");
    expect(document.activeElement?.tagName).toBe("BUTTON");
  });
});

describe("Sidebar collapsed footer", () => {
  const sections: SidebarSection[] = [{ items: [{ id: "home", label: "Home", icon: "icon-home-02-line" }] }];
  const footer = (
    <>
      <button type="button"><Icon name="icon-settings-01-line" size="base" /><span>Settings</span></button>
      <button type="button"><Icon name="icon-help-circle-line" size="base" /><span>Help</span></button>
    </>
  );
  for (const variant of ["basic", "small-density"] as const) {
    it(`keeps each footer button's name and its icon-only size in the ${variant} rail`, async () => {
      const screen = await render(<ZenProvider><Sidebar variant={variant} collapsed onCollapsedChange={() => {}} sections={sections} footer={footer} /></ZenProvider>);
      const settings = screen.getByRole("button", { name: "Settings" }).element() as HTMLElement;
      expect(screen.getByRole("button", { name: "Help" }).element()).toBeTruthy();
      // The label is visually hidden (1px clipped, out of the flow), never display: none; the button stays square.
      const label = settings.querySelector("span:not(.zen-icon)")!;
      expect(getComputedStyle(label).display).not.toBe("none");
      expect(getComputedStyle(label).position).toBe("absolute");
      expect(rect(label).width).toBeLessThanOrEqual(1);
      expect(Math.round(rect(settings).width)).toBe(Math.round(rect(settings).height));
    });
  }
  it("shows the name as the rail tooltip at once on keyboard focus and hides it on blur", async () => {
    const screen = await render(<ZenProvider><Sidebar collapsed onCollapsedChange={() => {}} sections={sections} footer={footer} /></ZenProvider>);
    const settings = screen.getByRole("button", { name: "Settings" }).element() as HTMLElement;
    const help = screen.getByRole("button", { name: "Help" }).element() as HTMLElement;
    help.focus();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toBe(settings);
    await expect.poll(() => document.querySelector(".zen-sidebar__rail-tooltip")?.textContent).toBe("Settings");
    const tip = document.querySelector<HTMLElement>(".zen-sidebar__rail-tooltip")!;
    expect(tip.getAttribute("aria-hidden")).toBe("true");
    // Beside the rail, vertically centred on the button.
    expect(rect(tip).left).toBeGreaterThan(rect(settings).right);
    expect(Math.abs((rect(tip).top + rect(tip).bottom) / 2 - (rect(settings).top + rect(settings).bottom) / 2)).toBeLessThan(1.5);
    await userEvent.keyboard("{Tab}");
    await expect.poll(() => document.querySelector(".zen-sidebar__rail-tooltip")?.textContent).toBe("Help");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.querySelector(".zen-sidebar__rail-tooltip")).toBeNull();
  });
  it("shows the name after the 1s hover delay, not before", async () => {
    const screen = await render(<ZenProvider><Sidebar collapsed onCollapsedChange={() => {}} sections={sections} footer={footer} /></ZenProvider>);
    await userEvent.hover(screen.getByRole("button", { name: "Help" }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(document.querySelector(".zen-sidebar__rail-tooltip")).toBeNull();
    await expect.poll(() => document.querySelector(".zen-sidebar__rail-tooltip")?.textContent, { timeout: 2000 }).toBe("Help");
    await userEvent.unhover(screen.getByRole("button", { name: "Help" }));
    await expect.poll(() => document.querySelector(".zen-sidebar__rail-tooltip")).toBeNull();
  });
  it("shows no rail tooltip while expanded (the label is visible)", async () => {
    const screen = await render(<ZenProvider><Sidebar onCollapsedChange={() => {}} sections={sections} footer={footer} /></ZenProvider>);
    const settings = screen.getByRole("button", { name: "Settings" }).element() as HTMLElement;
    const label = settings.querySelector("span:not(.zen-icon)")!;
    expect(getComputedStyle(label).position).not.toBe("absolute");
    (screen.getByRole("button", { name: "Help" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toBe(settings);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.querySelector(".zen-sidebar__rail-tooltip")).toBeNull();
  });
});

describe("Stepper vertical", () => {
  const steps = [
    { id: "cart", title: "Cart", caption: "3 items" },
    { id: "pay", title: "Payment", caption: "Card or transfer" },
    { id: "done", title: "Done", caption: "Receipt" },
  ];
  const markers = () => Array.from(document.querySelectorAll<HTMLElement>(".zen-stepper-item"));
  it("starts at its first marker and ends at its last (no hidden outer line space)", async () => {
    await render(<ZenProvider><div style={{ width: 320 }}><Stepper aria-label="Checkout" orientation="vertical" current={1} steps={steps.map(({ id, title }) => ({ id, title }))} /></div></ZenProvider>);
    const bar = rect(document.querySelector(".zen-stepper")!);
    const [first, , last] = markers();
    expect(Math.round(rect(first).top - bar.top)).toBe(0);
    expect(Math.round(bar.bottom - rect(last).bottom)).toBe(0);
    expect(document.querySelectorAll(".zen-stepper__step")[0].querySelector<HTMLElement>("[data-part='before']")!.getBoundingClientRect().height).toBe(0);
  });
  it("keeps the contents centred on each marker and Figma's 82px middle step, with captions", async () => {
    // current=2: the middle step is Passed (no 6px ring room), as in Figma's 82px Step-Vertical.
    await render(<ZenProvider><div style={{ width: 320 }}><Stepper aria-label="Checkout" orientation="vertical" current={2} steps={steps} /></div></ZenProvider>);
    const contents = Array.from(document.querySelectorAll(".zen-stepper__contents"));
    markers().forEach((marker, index) => {
      const m = rect(marker), c = rect(contents[index]);
      expect(Math.abs((m.top + m.bottom) / 2 - (c.top + c.bottom) / 2)).toBeLessThan(1);
    });
    // Title + caption (38px) is taller than the 24px marker: the first step holds just the 7px it needs above it.
    const bar = rect(document.querySelector(".zen-stepper")!);
    expect(Math.round(rect(markers()[0]).top - bar.top)).toBe(7);
    expect(Math.round(rect(document.querySelectorAll(".zen-stepper__step")[1]).height)).toBe(82);
    // The connecting lines keep Figma's XSmall (8px) gap from the markers and reach the next step's line.
    const firstAfter = rect(document.querySelectorAll(".zen-stepper__step")[0].querySelector("[data-part='after']")!);
    const secondBefore = rect(document.querySelectorAll(".zen-stepper__step")[1].querySelector("[data-part='before']")!);
    expect(Math.round(firstAfter.top - rect(markers()[0]).bottom)).toBe(8);
    expect(Math.round(secondBefore.top - firstAfter.bottom)).toBe(0);
    expect(firstAfter.height).toBeGreaterThanOrEqual(21);
  });
  it("leaves room for the focus ring of a current first step", async () => {
    await render(<ZenProvider><div style={{ width: 320 }}><Stepper aria-label="Checkout" orientation="vertical" current={0} steps={steps.map(({ id, title }) => ({ id, title }))} /></div></ZenProvider>);
    const bar = rect(document.querySelector(".zen-stepper")!);
    expect(Math.round(rect(markers()[0]).top - bar.top)).toBe(6);
  });
  it("leaves the horizontal bar as it was", async () => {
    await render(<ZenProvider><div style={{ width: 600 }}><Stepper aria-label="Checkout" current={1} steps={steps} /></div></ZenProvider>);
    const before = document.querySelectorAll(".zen-stepper__step")[0].querySelector<HTMLElement>("[data-part='before']")!;
    expect(getComputedStyle(before).visibility).toBe("hidden");
    expect(rect(before).width).toBeGreaterThan(0);
  });
});

describe("BottomNavigation floating idle labels", () => {
  const navItems = [
    { id: "home", label: "Home", icon: "icon-home-02-line" as const },
    { id: "alerts", label: "Alerts", icon: "icon-bell-01-line" as const },
    { id: "me", label: "Profile", icon: "icon-user-line" as const },
  ];
  for (const theme of ["light", "dark"] as const) {
    for (const type of ["floating", "floating-glass"] as const) {
      // User decision (2026-10-02): Floating idle labels are Content/Neutral/Light (as Figma); Floating-Glass keeps
      // Figma's Strongest, which reaches 4.5:1 on its pill.
      it(`${type} idle labels follow the decided colour on the pill over Surface (${theme})`, async () => {
        await render(
          <ZenProvider theme={theme}>
            <BottomNavigation type={type} items={navItems} value="home" onValueChange={() => {}} showLabels />
          </ZenProvider>,
        );
        const nav = document.querySelector<HTMLElement>(".zen-bottom-nav")!;
        const surface = getComputedStyle(nav).getPropertyValue("--zen-color-background-surface-default").trim();
        const probe = document.createElement("span");
        probe.style.color = surface;
        nav.append(probe);
        const surfaceRgb = getComputedStyle(probe).color;
        probe.remove();
        const pill = getComputedStyle(document.querySelector(".zen-bottom-nav__pill")!).backgroundColor;
        const background = over(pill, surfaceRgb);
        const idle = document.querySelector<HTMLElement>(".zen-bottom-nav__item[data-selected='false']")!;
        const label = idle.querySelector<HTMLElement>(".zen-bottom-nav__label")!;
        if (type === "floating-glass") expect(contrast(getComputedStyle(label).color, background)).toBeGreaterThanOrEqual(4.5);
        else {
          const token = document.createElement("span");
          token.style.color = "var(--zen-color-content-neutral-light)";
          nav.append(token);
          expect(getComputedStyle(label).color).toBe(getComputedStyle(token).color);
          token.remove();
        }
      });
    }
  }
  it("keeps the idle icons' colour (Floating: Content/Neutral/Light) and Figma's Strongest label on Floating-Glass", async () => {
    await render(
      <ZenProvider>
        <div data-testid="floating"><BottomNavigation type="floating" items={navItems} value="home" onValueChange={() => {}} showLabels /></div>
        <div data-testid="glass"><BottomNavigation type="floating-glass" items={navItems} value="home" onValueChange={() => {}} showLabels /></div>
      </ZenProvider>,
    );
    const probe = (token: string) => { const el = document.createElement("span"); el.style.color = `var(${token})`; document.body.append(el); const value = getComputedStyle(el).color; el.remove(); return value; };
    const floating = document.querySelector<HTMLElement>("[data-testid='floating'] .zen-bottom-nav__item[data-selected='false']")!;
    expect(getComputedStyle(floating).color).toBe(probe("--zen-color-content-neutral-light"));
    expect(getComputedStyle(floating.querySelector(".zen-bottom-nav__label")!).color).toBe(probe("--zen-color-content-neutral-light"));
    const glass = document.querySelector<HTMLElement>("[data-testid='glass'] .zen-bottom-nav__item[data-selected='false']")!;
    expect(getComputedStyle(glass.querySelector(".zen-bottom-nav__label")!).color).toBe(probe("--zen-color-content-neutral-strongest"));
    // The selected label still follows its item (Neutral/Strongest on Surface, Bold).
    const selected = document.querySelector<HTMLElement>("[data-testid='floating'] .zen-bottom-nav__item[data-selected='true']")!;
    expect(getComputedStyle(selected.querySelector(".zen-bottom-nav__label")!).color).toBe(getComputedStyle(selected).color);
  });
});

describe("ListItem titleLines", () => {
  const long = "Quarterly performance review for the platform design team and partners";
  it("keeps Figma's one truncating line by default and wraps to two lines with titleLines={2}", async () => {
    await render(
      <ZenProvider>
        <div style={{ width: 280 }}>
          <List inset="none" aria-label="Documents">
            <ListItem data-testid="one" title={long} caption="Updated today" />
            <ListItem data-testid="two" titleLines={2} title={long} caption="Updated today" />
            <ListItem data-testid="clamp" titleLines={2} title={`${long} ${long} ${long}`} />
            <ListItem data-testid="short" titleLines={2} title="Payroll" />
          </List>
        </div>
      </ZenProvider>,
    );
    const title = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}'] .zen-list-item__title`)!;
    const line = parseFloat(getComputedStyle(title("one")).lineHeight);
    expect(Math.round(title("one").getBoundingClientRect().height)).toBe(Math.round(line));
    expect(title("one").scrollWidth).toBeGreaterThan(title("one").clientWidth);
    expect(Math.round(title("two").getBoundingClientRect().height)).toBe(Math.round(2 * line));
    expect(Math.round(title("clamp").getBoundingClientRect().height)).toBe(Math.round(2 * line));
    expect(title("clamp").scrollHeight).toBeGreaterThan(title("clamp").clientHeight);
    expect(Math.round(title("short").getBoundingClientRect().height)).toBe(Math.round(line));
    expect(document.querySelector("[data-testid='one']")!.hasAttribute("data-title-lines")).toBe(false);
    expect(document.querySelector("[data-testid='two']")!.getAttribute("data-title-lines")).toBe("2");
  });
});
