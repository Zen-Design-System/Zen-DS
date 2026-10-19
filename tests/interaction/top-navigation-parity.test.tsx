/**
 * TopNavigation parity with Figma Top-Navigation/Mobile as ◇ Master-Layout · Example draws it (file 9nZv4uW2LT21yuHabMTCh1,
 * page 15902:109717, read 2026-10-19): the large title's Capline and Subheading (F1–F12, D5), Top-bar=false without an
 * Expand-Heading (D2), and visuals (Badge, Avatar) in the Trailing-Slot (D3, D4).
 */
import { useRef, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Avatar, Badge, TopNavigation, ZenProvider, type TopNavigationAction } from "../../src/index";

const header = () => document.querySelector<HTMLElement>(".zen-top-nav")!;
const box = (el: Element) => el.getBoundingClientRect();
const back: TopNavigationAction = { icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => undefined };
const act = (label: string, group?: string): TopNavigationAction => ({ icon: "icon-star-01-line", label, onClick: () => undefined, group });
/** Resolves a colour token the way the component's CSS does (inside the same provider). */
const tokenColor = (name: string) => {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  header().appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};
/** A phone, as the Figma frames are: mobile type scale, Comfortable density. */
const Phone = ({ children }: { children: ReactNode }) => <ZenProvider typography="mobile" density="comfortable"><div style={{ width: 390 }}>{children}</div></ZenProvider>;

describe("TopNavigation largeTitleCapline / largeTitleSubheading (Figma Main-Heading-Text Capline · Subheading)", () => {
  it("draws the capline above and the subheading below the large title, 4 apart, in Body/Base/Regular Neutral/Light", async () => {
    const screen = await render(<Phone><TopNavigation type="transparent" leading={back} title="HomePod mini" largeTitle="HomePod mini" largeTitleCapline="Apple" largeTitleSubheading="Living room" /></Phone>);
    const heading = screen.getByRole("heading", { level: 1 }).element();
    // The heading is named by the title alone; the lines sit beside it in an hgroup.
    expect(heading.textContent).toBe("HomePod mini");
    const group = heading.closest("hgroup")!;
    expect(group).not.toBeNull();
    const capline = group.querySelector(".zen-top-nav__capline")!;
    const subheading = group.querySelector(".zen-top-nav__subheading")!;
    expect(capline.textContent).toBe("Apple");
    expect(subheading.textContent).toBe("Living room");
    expect(Math.round(box(heading).top - box(capline).bottom)).toBe(4);
    expect(Math.round(box(subheading).top - box(heading).bottom)).toBe(4);
    // Main-Heading-Text padding: Bar-Padding-H1 (12) above and below, the side margin (20) at the start.
    expect(Math.round(box(capline).top - box(group).top)).toBe(12);
    expect(Math.round(box(group).bottom - box(subheading).bottom)).toBe(12);
    expect(Math.round(box(capline).left - box(header()).left)).toBe(20);
    const neutralLight = tokenColor("--zen-color-content-neutral-light");
    for (const line of [capline, subheading]) {
      expect(getComputedStyle(line).color).toBe(neutralLight);
      expect(getComputedStyle(line).fontWeight).toBe("400");
    }
    expect(Number.parseFloat(getComputedStyle(capline).fontSize)).toBeLessThan(Number.parseFloat(getComputedStyle(heading).fontSize));
  });

  it("keeps the large-title actions level with the first line (Expand-Heading aligns to the top)", async () => {
    const screen = await render(<Phone><TopNavigation type="transparent" leading={back} title="Living room" largeTitle="Living room" largeTitleSubheading="6 devices · 4 on" largeTitleAction={act("Add device")} /></Phone>);
    const row = header().querySelector(".zen-top-nav__expand")!;
    const add = screen.getByRole("button", { name: "Add device" }).element();
    // Header-Trailing is the 64px row at the top of the taller Expand-Heading: the 44px action 10px below its top.
    expect(Math.round(box(add).top - box(row).top)).toBe(10);
    expect(box(row).height).toBeGreaterThan(64);
  });

  it("takes the overlay tone on an overlay type", async () => {
    await render(<Phone><TopNavigation type="transparent-on-color" title="Madelyn Dias" largeTitle="Madelyn Dias" largeTitleCapline="GOOD MORNING" /></Phone>);
    expect(getComputedStyle(header().querySelector(".zen-top-nav__capline")!).color).toBe(tokenColor("--zen-color-content-on-black-overlay-base"));
  });

  it("folds away with the large title (collapsed)", async () => {
    const screen = await render(<Phone><TopNavigation collapsed type="transparent" title="Home" largeTitle="Hi, Mai Anh" largeTitleCapline="Welcome home" largeTitleSubheading="4 devices on" /></Phone>);
    expect(header().querySelector(".zen-top-nav__capline")).toBeNull();
    expect(header().querySelector(".zen-top-nav__subheading")).toBeNull();
    await expect.element(screen.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  });

  it("slides under the bar with the scroll and leaves the outline once covered (scrollRef)", async () => {
    function Screen() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <div ref={ref} data-testid="screen" style={{ height: 480, overflow: "auto" }}>
          <TopNavigation sticky scrollRef={ref} type="alt" title="Home" largeTitle="Hi, Mai Anh" largeTitleCapline="Welcome home" largeTitleSubheading="4 devices on" trailing={[act("Notifications")]} />
          <div style={{ height: 2400 }} />
        </div>
      );
    }
    const screen = await render(<Phone><Screen /></Phone>);
    await expect.element(screen.getByRole("heading", { level: 1, name: "Hi, Mai Anh" })).toBeVisible();
    document.querySelector<HTMLElement>("[data-testid='screen']")!.scrollTo({ top: 400 });
    await expect.poll(() => header().dataset.collapsed).toBe("true");
    // The fold is inert and its copy aria-hidden: the bar title is the only heading, the lines are out of reach.
    const capline = header().querySelector(".zen-top-nav__capline")!;
    expect(capline.closest("[inert]")).not.toBeNull();
    expect(capline.closest("[aria-hidden='true']")).not.toBeNull();
    expect(document.querySelectorAll("h1, [role='heading']")).toHaveLength(1);
    await expect.element(screen.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  });

  it("draws no hgroup when neither line is set (the large title is the heading itself)", async () => {
    await render(<Phone><TopNavigation title="Inbox" largeTitle="Inbox" /></Phone>);
    expect(header().querySelector("hgroup")).toBeNull();
    expect(header().querySelector(".zen-top-nav__expand > h1")).not.toBeNull();
  });
});

describe("TopNavigation topBar={false} without a large title (Figma Top-bar=false, Expand-Heading off: D2)", () => {
  it("draws no bar row: only the status inset, the title kept for screen readers", async () => {
    const screen = await render(<Phone><TopNavigation type="transparent" topBar={false} title="Welcome to zenio" leading={back} trailing={[act("Help")]} /></Phone>);
    expect(header().querySelector(".zen-top-nav__bar")).toBeNull();
    expect(header().offsetHeight).toBe(0);
    expect(header().tagName).toBe("HEADER");
    const heading = screen.getByRole("heading", { level: 1, name: "Welcome to zenio" }).element();
    expect(heading.classList.contains("zen-visually-hidden")).toBe(true);
    // The bar's actions are not drawn.
    expect(header().querySelector("button")).toBeNull();
  });

  it("is no landmark when it holds nothing", async () => {
    await render(<Phone><TopNavigation type="transparent" topBar={false} aria-label="Top bar" /></Phone>);
    expect(header().tagName).toBe("DIV");
    expect(header().hasAttribute("aria-label")).toBe(false);
    expect(document.querySelector("header, [role='banner']")).toBeNull();
    expect(document.querySelector("h1, [role='heading']")).toBeNull();
  });

  it("keeps a control bar under the status inset", async () => {
    await render(<Phone><TopNavigation type="transparent" topBar={false} controlBar={<div data-testid="control" style={{ height: 40 }} />} /></Phone>);
    expect(header().tagName).toBe("HEADER");
    expect(Math.round(box(document.querySelector("[data-testid='control']")!).top - box(header()).top)).toBe(8);
  });

  it("leaves a root with a large title as before (the bar folds into the large-title row)", async () => {
    await render(<Phone><TopNavigation topBar={false} title="Inbox" largeTitle="Inbox" trailing={[act("New")]} /></Phone>);
    expect(header().dataset.bar).toBe("overlay");
    expect(header().querySelector(".zen-top-nav__bar")).not.toBeNull();
  });
});

describe("TopNavigation trailing visuals (Figma Trailing-Slot with a Badge and an Avatar: D3, D4)", () => {
  const streak = <Badge size="md" theme="orange" background="solid" leading="icon-zap-line">3</Badge>;
  const me = (size: "md" | "lg" | "xl" = "md") => <Avatar size={size} alt="Max Rivera">MR</Avatar>;

  it("draws a Badge and an Avatar as they are, 8 apart, in a 64px bar", async () => {
    await render(<Phone><TopNavigation type="alt" leading={back} title="Home" trailing={[streak, me()]} /></Phone>);
    const trailing = header().querySelector(".zen-top-nav__bar .zen-top-nav__trailing")!;
    const badge = trailing.querySelector(".zen-badge")!;
    const avatar = trailing.querySelector(".zen-avatar")!;
    expect(badge).not.toBeNull();
    expect(avatar).not.toBeNull();
    expect(Math.round(box(avatar).left - box(badge).right)).toBe(8);
    // Margin-Comfortable (20) after the last place; the Avatar is Image-Size/Medium (48 at Comfortable density).
    expect(Math.round(box(trailing).right - box(avatar).right)).toBe(20);
    expect(Math.round(box(avatar).height)).toBe(48);
    expect(Math.round(header().querySelector<HTMLElement>(".zen-top-nav__bar")!.offsetHeight)).toBe(64);
    // A visual is not turned into a button.
    expect(header().querySelectorAll("button")).toHaveLength(1);
  });

  it("keeps the bar 64 high with a 56 Avatar, centred (it overhangs the slot padding)", async () => {
    await render(<ZenProvider><div style={{ width: 390 }}><TopNavigation type="alt" leading={back} title="Profile" trailing={[me("xl")]} /></div></ZenProvider>);
    const bar = header().querySelector<HTMLElement>(".zen-top-nav__bar")!;
    const avatar = bar.querySelector(".zen-avatar")!;
    expect(Math.round(box(avatar).height)).toBe(56);
    expect(bar.offsetHeight).toBe(64);
    expect(Math.round(box(avatar).top - box(bar).top)).toBe(4);
  });

  it("counts a visual as one of the three places and skips empty items", async () => {
    await render(<Phone><TopNavigation leading={back} title="Files" trailing={[act("One"), false, streak, null, act("Two"), me(), act("Hidden")]} /></Phone>);
    const trailing = header().querySelector(".zen-top-nav__bar .zen-top-nav__trailing")!;
    expect(trailing.children).toHaveLength(3);
    expect(trailing.querySelector(".zen-avatar")).toBeNull();
    expect(trailing.querySelector("[aria-label='Hidden']")).toBeNull();
    expect([...trailing.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"))).toEqual(["One", "Two"]);
  });

  it("keeps grouped actions in one pill, and a visual between them keeps them apart", async () => {
    await render(<Phone><TopNavigation leading={back} title="Ava" trailing={[act("Audio", "call"), act("Video", "call"), me()]} /></Phone>);
    expect(header().querySelectorAll(".zen-top-nav__bar .zen-top-nav__group")).toHaveLength(1);
    await render(<Phone><TopNavigation leading={back} title="Ava" trailing={[act("Audio", "call"), me(), act("Video", "call")]} /></Phone>);
    expect(document.querySelectorAll(".zen-top-nav")[1].querySelectorAll(".zen-top-nav__group")).toHaveLength(0);
  });

  it("sits at the right of a root's large title and keeps the title clear of it", async () => {
    await render(<Phone><TopNavigation type="transparent" title="Home" largeTitle="Home sweet home, and a very long title" trailing={[streak, me()]} /></Phone>);
    expect(header().dataset.bar).toBe("overlay");
    const visible = header().querySelector(".zen-top-nav__bar .zen-badge")!;
    const heading = header().querySelector<HTMLElement>(".zen-top-nav__heading")!;
    expect(box(heading).right).toBeLessThanOrEqual(box(visible).left + 1);
    // The room's copies are hidden from everyone and take no focus.
    const room = header().querySelector(".zen-top-nav__trailing--room")!;
    expect(room.getAttribute("aria-hidden")).toBe("true");
    expect(room.hasAttribute("inert")).toBe(true);
    expect(getComputedStyle(room).visibility).toBe("hidden");
    // Only the drawn Avatar is in the accessibility tree.
    expect([...document.querySelectorAll(".zen-avatar")].filter((a) => !a.closest("[aria-hidden='true']"))).toHaveLength(1);
  });

  it("takes visuals beside the large title too (largeTitleAction, Figma Header-Trailing)", async () => {
    await render(<Phone><TopNavigation topBar leading={back} title="Home" largeTitle="Home" largeTitleAction={[streak, me()]} /></Phone>);
    const row = header().querySelector(".zen-top-nav__expand-trailing")!;
    expect(row.querySelector(".zen-badge")).not.toBeNull();
    expect(row.querySelector(".zen-avatar")).not.toBeNull();
  });
});
