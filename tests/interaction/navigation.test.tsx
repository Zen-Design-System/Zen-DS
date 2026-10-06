/**
 * Interaction tests for TopNavigation's scroll-linked fold (`scrollRef`): the large title folds with the scroll, and
 * keeps folding after a screen swap unmounts and remounts the fold (root → child → root, Backlog G1).
 */
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { TopNavigation, ZenProvider, type TopNavigationAction } from "../../src/index";

/** One phone-like scroller whose sticky TopNavigation is shared by an Orders root and an order detail. */
function OrdersScreen() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div ref={screenRef} data-testid="screen" style={{ height: 480, overflow: "auto" }}>
      <TopNavigation sticky scrollRef={screenRef} title={open ? "Order #1042" : "Orders"} largeTitle={open ? undefined : "Orders"}
        type={open ? "compact" : "default"}
        leading={open ? { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setOpen(false) } : undefined}
        trailing={open ? [] : [{ icon: "icon-plus-line", label: "Open order", onClick: () => setOpen(true) }]} />
      <div style={{ height: 2400 }} />
    </div>
  );
}

const header = () => document.querySelector<HTMLElement>(".zen-top-nav")!;
const scrollScreen = (top: number) => document.querySelector<HTMLElement>("[data-testid='screen']")!.scrollTo({ top });

describe("TopNavigation scroll fold", () => {
  it("folds the large title with the scroll", async () => {
    await render(<ZenProvider><OrdersScreen /></ZenProvider>);
    expect(header().dataset.collapsed).toBeUndefined();
    scrollScreen(300);
    await expect.poll(() => header().dataset.collapsed).toBe("true");
    expect(parseFloat(getComputedStyle(header()).getPropertyValue("--zen-top-nav-fold"))).toBeGreaterThan(0);
  });

  it("keeps folding after root → child → root", async () => {
    const screen = await render(<ZenProvider><OrdersScreen /></ZenProvider>);
    await screen.getByRole("button", { name: "Open order" }).click();
    await expect.element(screen.getByRole("heading", { name: "Order #1042" })).toBeInTheDocument();
    await screen.getByRole("button", { name: "Back" }).click();
    await expect.element(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument();
    scrollScreen(300);
    await expect.poll(() => header().dataset.collapsed).toBe("true");
    expect(parseFloat(getComputedStyle(header()).getPropertyValue("--zen-top-nav-fold"))).toBeGreaterThan(0);
    scrollScreen(0);
    await expect.poll(() => header().dataset.collapsed).toBeUndefined();
  });
});

/** A root (large title, no leading) with one trailing action and a large-title action, scroll-linked or not. */
function RootScreen({ linked = false, topBar, collapsed, banner }: { linked?: boolean; topBar?: boolean; collapsed?: boolean; banner?: boolean }) {
  const screenRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={screenRef} data-testid="screen" style={{ height: 480, overflow: "auto" }}>
      <TopNavigation sticky scrollRef={linked ? screenRef : undefined} collapsed={collapsed} topBar={topBar} title="Inbox" largeTitle="Inbox"
        trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => undefined }]}
        largeTitleAction={{ icon: "icon-plus-line", label: "New message", onClick: () => undefined }}
        banner={banner ? <div data-testid="banner" style={{ height: 32 }}>You're offline.</div> : undefined} />
      <div style={{ height: 2400 }} />
    </div>
  );
}

const rowOf = (el: Element) => { const r = el.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; };

describe("TopNavigation root without a top bar (Figma Top-bar=false)", () => {
  it("puts the actions in the large-title row, one 64px row high", async () => {
    const screen = await render(<ZenProvider><RootScreen /></ZenProvider>);
    expect(header().dataset.bar).toBe("overlay");
    const heading = screen.getByRole("heading", { name: "Inbox" }).element();
    const bell = screen.getByRole("button", { name: "Notifications" }).element();
    const [top, bottom] = rowOf(heading.closest(".zen-top-nav__expand")!);
    const [bellTop, bellBottom] = rowOf(bell);
    expect(bellTop).toBeGreaterThanOrEqual(top);
    expect(bellBottom).toBeLessThanOrEqual(bottom);
    // Status inset (0 here) + the 64px large-title row: no empty bar row above it.
    expect(header().offsetHeight).toBeLessThanOrEqual(64);
    // The large-title action sits in the trailing slot too, before the others.
    await expect.element(screen.getByRole("button", { name: "New message" })).toBeVisible();
  });

  it("keeps the bar row above the large title with topBar", async () => {
    await render(<ZenProvider><RootScreen topBar /></ZenProvider>);
    expect(header().dataset.bar).toBeUndefined();
    expect(header().offsetHeight).toBeGreaterThanOrEqual(128);
  });

  it("shows the bar title in the same row once folded, with every action still in reach", async () => {
    const screen = await render(<ZenProvider><RootScreen linked /></ZenProvider>);
    const before = header().offsetHeight;
    scrollScreen(300);
    await expect.poll(() => header().dataset.collapsed).toBe("true");
    await expect.element(screen.getByRole("heading", { name: "Inbox" })).toBeVisible();
    expect(header().querySelector(".zen-top-nav__title")?.getAttribute("data-visible")).toBe("true");
    expect(header().offsetHeight).toBe(before);
    for (const name of ["New message", "Notifications"]) {
      const button = screen.getByRole("button", { name }).element();
      expect(button.closest("[inert]")).toBeNull();
      const r = button.getBoundingClientRect();
      expect(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("button")).toBe(button);
    }
  });

  it("pins a banner under the bar, in view after the title folds", async () => {
    const screen = await render(<ZenProvider><RootScreen linked banner /></ZenProvider>);
    const banner = screen.getByTestId("banner").element();
    expect(banner.closest(".zen-top-nav")).toBe(header());
    scrollScreen(600);
    await expect.poll(() => header().dataset.collapsed).toBe("true");
    const r = banner.getBoundingClientRect();
    const box = document.querySelector("[data-testid='screen']")!.getBoundingClientRect();
    expect(r.top).toBeGreaterThanOrEqual(box.top);
    expect(r.bottom).toBeLessThanOrEqual(box.top + header().offsetHeight + 1);
  });
});

/** Figma's Trailing-Slot takes three actions, in Top-Trailing and in Header-Trailing (2026-10-05). */
describe("TopNavigation actions (up to three per Trailing-Slot)", () => {
  const act = (label: string): TopNavigationAction => ({ icon: "icon-star-01-line", label, onClick: () => undefined });

  it("draws three trailing actions and drops a fourth", async () => {
    const screen = await render(<ZenProvider><TopNavigation type="compact" title="Files" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => undefined }} trailing={[act("One"), act("Two"), act("Three"), act("Four")]} /></ZenProvider>);
    for (const name of ["One", "Two", "Three"]) await expect.element(screen.getByRole("button", { name })).toBeVisible();
    expect(header().querySelector("[aria-label='Four']")).toBeNull();
    // The centred title keeps its own column clear of the actions.
    const title = header().querySelector(".zen-top-nav__title")!.getBoundingClientRect();
    const first = screen.getByRole("button", { name: "One" }).element().getBoundingClientRect();
    expect(title.right).toBeLessThanOrEqual(first.left + 1);
  });

  const back = { icon: "icon-chevron-left-line-medium" as const, label: "Back", onClick: () => undefined };

  it("keeps three Tertiary actions clear of a long title on a 390px bar (the title ellipsizes)", async () => {
    const screen = await render(<ZenProvider><div style={{ width: 390 }}><TopNavigation title="Quarterly budget review notes" leading={back} trailing={[act("One"), act("Two"), act("Three")]} /></div></ZenProvider>);
    const title = header().querySelector<HTMLElement>(".zen-top-nav__title")!;
    const first = screen.getByRole("button", { name: "One" }).element().getBoundingClientRect();
    expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(first.left + 1);
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
  });

  it("keeps a short title centred while both sides fit", async () => {
    await render(<ZenProvider><div style={{ width: 390 }}><TopNavigation title="Files" leading={back} trailing={[act("One"), act("Two")]} /></div></ZenProvider>);
    const bar = header().querySelector(".zen-top-nav__bar")!.getBoundingClientRect();
    const title = header().querySelector(".zen-top-nav__title")!.getBoundingClientRect();
    expect(Math.abs((title.left + title.right) / 2 - (bar.left + bar.right) / 2)).toBeLessThanOrEqual(1);
  });

  it("takes a list of large-title actions beside the large title (topBar keeps them out of the bar)", async () => {
    const screen = await render(<ZenProvider><TopNavigation topBar title="Inbox" largeTitle="Inbox" largeTitleAction={[act("New"), act("Filter"), act("More"), act("Hidden")]} /></ZenProvider>);
    const row = header().querySelector(".zen-top-nav__expand-trailing")!;
    expect([...row.querySelectorAll("button")].map((button) => button.getAttribute("aria-label"))).toEqual(["New", "Filter", "More"]);
    await expect.element(screen.getByRole("button", { name: "More" })).toBeVisible();
  });

  it("still takes one large-title action as an object", async () => {
    const screen = await render(<ZenProvider><TopNavigation topBar title="Inbox" largeTitle="Inbox" largeTitleAction={act("New")} /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "New" })).toBeVisible();
  });
});
