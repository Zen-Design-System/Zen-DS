/**
 * Interaction tests for AppShell (Figma ◇ Master-Layout AppShell patterns 16254:1057): the collapse toggle in the header,
 * in the Sidebar or none; the navigation drawer (modal dialog: focus, Tab, Escape, Close, choosing a page); the layout
 * from the shell's own width (desktop ≥ 1024, mobile with mobile parts, else drawer); the desktop patterns' parts
 * (List-Detail, Workspace, Docs, Focus, Top-Bar); the mobile patterns (Bar, Band, Band-Sheet, Media, Actions); the skip
 * link; AppShellPane; the header parts AppShellAction and AppShellAccount; and the Sidebar rail mark. Real browser (Chromium).
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import {
  ActionBar, AppShell, AppShellAccount, AppShellAction, AppShellHeader, AppShellPane, Avatar, BottomNavigation, Breadcrumbs, Button, Menu, PageHeader, Sidebar, Stack, Stepper, Text, TopNavigation, ZenProvider, useAppShell,
  type AppShellBand, type AppShellCollapse, type AppShellLayout, type AppShellMobileTop, type AppShellPattern, type SidebarSection,
} from "../../src/index";

const sections: SidebarSection[] = [
  { items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "members", label: "Members", icon: "icon-users-line" }] },
  { label: "Settings", items: [{ id: "billing", label: "Billing", icon: "icon-credit-card-line" }] },
];

function Shell({ layout = "auto", collapse, onCollapse, master = false }: { layout?: "auto" | AppShellLayout; collapse?: AppShellCollapse; onCollapse?: (collapsed: boolean) => void; master?: boolean }) {
  const [page, setPage] = useState("members");
  return (
    <ZenProvider>
      <AppShell layout={layout} collapse={collapse} mainId="test-main" onSidebarCollapsedChange={onCollapse}
        sidebar={<Sidebar sections={sections} selectedId={page} onItemClick={(item) => setPage(item.id)} />}
        header={(
          <AppShellHeader
            leading={<Breadcrumbs master={master} items={[{ id: "home", label: "Home" }, { id: page, label: page }]} onNavigate={(item, event) => { event.preventDefault(); setPage(item.id); }} />}
            actions={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={12} onClick={() => undefined} />}
            main={<PageHeader title="Members" />}
          />
        )}
      >
        <p>Page {page}</p>
      </AppShell>
    </ZenProvider>
  );
}

describe("AppShell collapse", () => {
  it("leads the header's top row with the toggle and collapses the Sidebar to its rail (collapse=header)", async () => {
    const onCollapse = vi.fn();
    const screen = await render(<Shell layout="desktop" onCollapse={onCollapse} />);
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle.element().closest(".zen-app-shell-header__top")).toBeTruthy();
    const controls = toggle.element().getAttribute("aria-controls");
    expect(controls && document.getElementById(controls)?.querySelector(".zen-sidebar")).toBeTruthy();
    await toggle.click();
    expect(onCollapse).toHaveBeenCalledWith(true);
    await expect.element(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".zen-sidebar")?.getAttribute("data-collapsed")).toBe("true");
  });

  it("draws the toggle in the Sidebar's header instead (collapse=sidebar), for a trail that starts with a Master crumb", async () => {
    const onCollapse = vi.fn();
    await render(<Shell layout="desktop" collapse="sidebar" master onCollapse={onCollapse} />);
    expect(document.querySelector(".zen-app-shell-header__toggle")).toBeNull();
    const toggle = document.querySelector<HTMLButtonElement>(".zen-sidebar__collapse")!;
    expect(toggle).toBeTruthy();
    toggle.click();
    expect(onCollapse).toHaveBeenCalledWith(true);
    await expect.poll(() => document.querySelector(".zen-sidebar")?.getAttribute("data-collapsed")).toBe("true");
    // The trail keeps its Master crumb (its home icon) at the start of the top row, now that the toggle is in the Sidebar.
    expect(document.querySelector(".zen-app-shell-header__top .zen-breadcrumbs, .zen-app-shell-header__top nav")).toBeTruthy();
  });

  it("draws no toggle at all with collapse=none", async () => {
    await render(<Shell layout="desktop" collapse="none" />);
    expect(document.querySelector(".zen-app-shell-header__toggle")).toBeNull();
    expect(document.querySelector(".zen-sidebar__collapse")).toBeNull();
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

  it("keeps its own width inside a scaled preview (a zoomed canvas draws 1440px at half size)", async () => {
    const screen = await render(<div style={{ width: 1440, transform: "scale(0.5)", transformOrigin: "0 0" }}><Shell /></div>);
    await expect.element(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(document.querySelector(".zen-app-shell")?.getAttribute("data-layout")).toBe("desktop");
  });
});

/** A page that runs on desktop, an upright iPad and phones (component-usage-rules §17): the header and its mobile parts. */
function Responsive({ width, mobileTop = "bar", band, actions = false }: { width: number; mobileTop?: AppShellMobileTop; band?: AppShellBand; actions?: boolean }) {
  return (
    <div style={{ width }}>
      <ZenProvider>
        <AppShell mainId="phone-main" mobileTop={mobileTop} band={band}
          sidebar={<Sidebar sections={sections} selectedId="members" />}
          header={<AppShellHeader leading={<Breadcrumbs master={false} items={[{ id: "home", label: "Home" }]} />} actions={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} />}
            main={<PageHeader title="Members" actions={<Button level="primary">Invite member</Button>} />} />}
          topNavigation={<TopNavigation title="Members" largeTitle="Members" trailing={[{ icon: "icon-plus-line", label: "Invite member" }, { icon: "icon-bell-01-line", label: "Notifications", dot: true }]} />}
          hero={mobileTop === "band" || mobileTop === "band-sheet" ? <Text>12 members</Text> : undefined}
          backdrop={mobileTop === "media" ? <img alt="Team offsite" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /> : undefined}
          bottomNavigation={actions ? undefined : <BottomNavigation value="members" onValueChange={() => undefined} items={[{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "members", label: "Members", icon: "icon-users-line" }, { id: "billing", label: "Billing", icon: "icon-credit-card-line" }]} />}
          actionBar={actions ? <ActionBar primaryAction={{ label: "Invite member" }} /> : undefined}
        >
          <MoreButton />
          <p>Page members</p>
        </AppShell>
      </ZenProvider>
    </div>
  );
}

/** A control of the page's own that opens the drawer (a BottomNavigation More does the same). */
function MoreButton() {
  const shell = useAppShell();
  return <button type="button" onClick={() => shell?.openNav()}>All pages</button>;
}

describe("AppShell mobile patterns", () => {
  it("draws the TopNavigation and BottomNavigation on a phone, without the header (Top=Bar)", async () => {
    const screen = await render(<Responsive width={390} />);
    await expect.element(screen.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
    const shell = document.querySelector(".zen-app-shell");
    expect(shell?.getAttribute("data-layout")).toBe("mobile");
    expect(shell?.getAttribute("data-top")).toBe("bar");
    expect(shell?.querySelector(".zen-app-shell-header")).toBeNull();
    expect(shell?.querySelector(".zen-page-header")).toBeNull();
    // The bar takes Figma's type for the Top (Alt) when the screen's TopNavigation sets none.
    expect(shell?.querySelector(".zen-app-shell__top-nav .zen-top-nav")?.getAttribute("data-type")).toBe("alt");
    expect(shell?.querySelector(".zen-app-shell__bottom-nav .zen-bottom-nav, .zen-app-shell__bottom-nav nav")).toBeTruthy();
    // One h1 on the phone: the bar's title.
    expect(document.querySelectorAll("h1").length).toBe(1);
  });

  it("uses the mobile pattern on an iPad held upright (narrower than 1024)", async () => {
    await render(<Responsive width={820} />);
    await expect.poll(() => document.querySelector(".zen-app-shell")?.getAttribute("data-layout")).toBe("mobile");
    expect(document.querySelector(".zen-top-nav")).toBeTruthy();
  });

  it("keeps the full header on a desktop", async () => {
    const screen = await render(<Responsive width={1280} />);
    await expect.element(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(document.querySelector(".zen-app-shell")?.getAttribute("data-layout")).toBe("desktop");
    expect(document.querySelector(".zen-app-shell__bottom-nav, .zen-top-nav")).toBeNull();
  });

  it("puts the TopNavigation (transparent) and the hero in the band (Top=Band)", async () => {
    await render(<Responsive width={390} mobileTop="band" />);
    const band = document.querySelector(".zen-app-shell__band");
    expect(band?.querySelector(".zen-top-nav")?.getAttribute("data-type")).toBe("transparent");
    expect(band?.querySelector(".zen-app-shell__hero")?.textContent).toBe("12 members");
  });

  it("raises the page as a sheet over the band (Top=Band-Sheet)", async () => {
    await render(<Responsive width={390} mobileTop="band-sheet" />);
    expect(document.querySelector('.zen-app-shell__stage[data-top="band-sheet"] > .zen-app-shell__body')).toBeTruthy();
  });

  it("fills the band as the screen asks: Accent/Solid with a transparent-on-color bar; the default band says nothing", async () => {
    await render(<Responsive width={390} mobileTop="band-sheet" band="accent" />);
    const shell = document.querySelector(".zen-app-shell");
    expect(shell?.getAttribute("data-band")).toBe("accent");
    // The stage paints Background/Accent/Solid: a probe with that token inside the shell resolves to the same colour.
    const probe = document.createElement("div");
    probe.style.background = "var(--zen-color-background-accent-solid-default)";
    shell!.append(probe);
    expect(getComputedStyle(document.querySelector(".zen-app-shell__stage")!).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
    expect(document.querySelector(".zen-app-shell__stage .zen-top-nav")?.getAttribute("data-type")).toBe("transparent-on-color");
  });

  it("writes the bar's capline and title in On-Accent on the Accent band, each on one line", async () => {
    await render(
      <div style={{ width: 390 }}>
        <ZenProvider>
          <AppShell layout="mobile" mobileTop="band-sheet" band="accent"
            topNavigation={<TopNavigation largeTitleCapline="GOOD MORNING, IT'S A BRIGHT WEDNESDAY IN HANOI" largeTitle="Madelyn Dias" />}
            hero={<Text>Recent quiz</Text>}>
            <p>Live quizzes</p>
          </AppShell>
        </ZenProvider>
      </div>,
    );
    const shell = document.querySelector<HTMLElement>(".zen-app-shell")!;
    const probe = document.createElement("span");
    probe.style.color = "var(--zen-color-content-on-accent-default)";
    shell.append(probe);
    const onAccent = getComputedStyle(probe).color;
    probe.remove();
    const capline = document.querySelector<HTMLElement>(".zen-top-nav__capline")!;
    expect(getComputedStyle(capline).color).toBe(onAccent);
    expect(getComputedStyle(document.querySelector<HTMLElement>(".zen-top-nav__expand h1, .zen-top-nav h1")!).color).toBe(onAccent);
    expect(getComputedStyle(capline).whiteSpace).toBe("nowrap");
    expect(getComputedStyle(capline).textOverflow).toBe("ellipsis");
  });

  it("keeps the band's own fill and bar on the default band", async () => {
    await render(<Responsive width={390} mobileTop="band" />);
    expect(document.querySelector(".zen-app-shell")?.hasAttribute("data-band")).toBe(false);
    expect(document.querySelector(".zen-app-shell__band .zen-top-nav")?.getAttribute("data-type")).toBe("transparent");
  });

  it("raises the page as a sheet over the backdrop, under a liquid-overlay bar (Top=Media)", async () => {
    await render(<Responsive width={390} mobileTop="media" />);
    const stage = document.querySelector('.zen-app-shell__stage[data-top="media"]');
    expect(stage?.querySelector(".zen-app-shell__backdrop img")).toBeTruthy();
    expect(stage?.querySelector(".zen-top-nav")?.getAttribute("data-type")).toBe("liquid-overlay");
    expect(stage?.querySelector(".zen-app-shell__body")).toBeTruthy();
  });

  it("pins the Action bar at the bottom instead of the tabs (Bottom=Actions)", async () => {
    await render(<Responsive width={390} actions />);
    expect(document.querySelector(".zen-app-shell")?.getAttribute("data-bottom")).toBe("actions");
    expect(document.querySelector(".zen-app-shell__bottom .zen-action-bar")).toBeTruthy();
  });

  it("still opens the Sidebar as the drawer from the page (openNav)", async () => {
    const screen = await render(<Responsive width={390} />);
    await screen.getByRole("button", { name: "All pages" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  });
});

/** One app on a desktop pattern, with every part the patterns use. */
function Pattern({ pattern }: { pattern: AppShellPattern }) {
  return (
    <div style={{ width: 1440 }}>
      <ZenProvider>
        <AppShell pattern={pattern} layout="desktop"
          sidebar={<Sidebar sections={sections} selectedId="members" />}
          header={<AppShellHeader leading={<Breadcrumbs master={false} items={[{ id: "members", label: "Members" }]} />} />}
          leadingPane={<AppShellPane title="Members"><Text>List</Text></AppShellPane>}
          trailingPane={<AppShellPane title="Details"><Text>Ava Chen</Text></AppShellPane>}
          progress={<Stepper aria-label="Invite" steps={[{ id: "a", title: "Who" }, { id: "b", title: "Role" }]} current={0} />}
        >
          <p>Page</p>
        </AppShell>
      </ZenProvider>
    </div>
  );
}
const panes = () => [...document.querySelectorAll(".zen-app-shell__pane")].map((pane) => pane.getAttribute("data-side"));

describe("AppShell desktop patterns", () => {
  it("List-Detail: the Sidebar starts on its rail and the leading pane sits beside it", async () => {
    await render(<Pattern pattern="list-detail" />);
    await expect.poll(() => document.querySelector(".zen-sidebar")?.getAttribute("data-collapsed")).toBe("true");
    expect(panes()).toEqual(["leading"]);
    expect(document.querySelector(".zen-app-shell__progress")).toBeNull();
  });

  it("Workspace: no Sidebar beside the page, the header across the top and both panes the same width", async () => {
    await render(<Pattern pattern="workspace" />);
    expect(document.querySelector(".zen-app-shell__sidebar")).toBeNull();
    expect(document.querySelector('.zen-app-shell__frame[data-across="true"] > .zen-app-shell__main > .zen-app-shell__header > .zen-app-shell-header')).toBeTruthy();
    expect(panes()).toEqual(["leading", "trailing"]);
    const [leading, trailing] = [...document.querySelectorAll(".zen-app-shell__pane > .zen-app-shell-pane")].map((pane) => pane.getBoundingClientRect().width);
    expect(Math.abs(leading - trailing)).toBeLessThan(0.5);
  });

  it("Focus: the steps under the header and the summary pane beside the column, inside <main>", async () => {
    await render(<Pattern pattern="focus" />);
    expect(document.querySelector(".zen-app-shell__progress .zen-stepper, .zen-app-shell__progress ol")).toBeTruthy();
    expect(document.querySelector("main .zen-app-shell__column")).toBeTruthy();
    expect(document.querySelector('main .zen-app-shell__pane[data-side="trailing"]')).toBeTruthy();
    expect(panes()).toEqual(["trailing"]);
  });

  it("Top-Bar: no Sidebar and no panes", async () => {
    await render(<Pattern pattern="top-bar" />);
    expect(document.querySelector(".zen-app-shell__sidebar")).toBeNull();
    expect(panes()).toEqual([]);
  });
});

describe("AppShellPane", () => {
  it("is a region named by its title, with its action in the header", async () => {
    const screen = await render(<ZenProvider><AppShellPane title="Comments · 3" action={<Button level="tertiary" size="sm">Filter</Button>}><Text>Ava: looks good</Text></AppShellPane></ZenProvider>);
    await expect.element(screen.getByRole("region", { name: "Comments · 3" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { level: 2, name: "Comments · 3" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Filter" })).toBeVisible();
  });
});

describe("AppShell skip link", () => {
  it("moves focus to <main> without changing the URL", async () => {
    const screen = await render(<Shell layout="desktop" />);
    const before = window.location.href;
    await userEvent.keyboard("{Tab}");
    const skip = screen.getByRole("link", { name: "Skip to content" });
    await expect.element(skip).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement?.id).toBe("test-main");
    expect(window.location.href).toBe(before);
  });
});

describe("AppShell header parts", () => {
  it("AppShellAction adds the unread count to its name and caps the badge at 99+", async () => {
    const screen = await render(<ZenProvider><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={120} onClick={() => undefined} /><AppShellAction icon="icon-mail-01-line" aria-label="Inbox" dot onClick={() => undefined} /></ZenProvider>);
    await expect.element(screen.getByRole("button", { name: "Notifications, 120 new" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Inbox, new" })).toBeVisible();
    expect(document.querySelector(".zen-app-shell-action__number[data-style='number']")?.textContent).toBe("99+");
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
    const screen = await render(<ZenProvider><AppShell layout="desktop" sidebar={<Sidebar sections={sections} onItemClick={() => undefined} />}><RailReader /></AppShell></ZenProvider>);
    const button = screen.getByRole("button", { name: "Expanded · desktop" });
    await button.click();
    await expect.element(screen.getByRole("button", { name: "Rail · desktop" })).toBeVisible();
    expect(document.querySelector(".zen-sidebar")?.getAttribute("data-collapsed")).toBe("true");
  });
});

describe("Sidebar workspace switcher", () => {
  it("opens its list with ArrowDown, as with Enter (APG listbox button)", async () => {
    const screen = await render(
      <ZenProvider>
        <Sidebar variant="workspace" aria-label="Workspaces" sections={sections}
          workspaceItems={[{ id: "dizai", label: "Đìzai Studio", selected: true }, { id: "phin", label: "Phin & Co" }]} />
      </ZenProvider>,
    );
    // The rail lists the workspace too; the header trigger is the one that pops up a listbox.
    const trigger = () => document.querySelector<HTMLElement>(".zen-sidebar__workspace-trigger")!;
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(() => trigger().getAttribute("aria-expanded")).toBe("true");
    await expect.element(screen.getByRole("option", { name: "Phin & Co" })).toBeInTheDocument();
  });
});

describe("Sidebar rail mark", () => {
  // The workspace brand of an HR-style module Sidebar: a 32px square mark, then the name.
  const brand = (
    <Stack direction="row" gap="xs" align="center" style={{ width: "100%" }}>
      <Avatar size="small" shape="square" alt="">ĐS</Avatar>
      <Text as="span" textStyle="Body/Base/Bold" truncate>Đìzai Studio</Text>
    </Stack>
  );
  const offCentre = (mark: Element) => {
    const surface = document.querySelector(".zen-sidebar__surface")!.getBoundingClientRect();
    const box = mark.getBoundingClientRect();
    return Math.abs(box.left + box.width / 2 - (surface.left + surface.width / 2));
  };

  it("shows logoCollapsed centred in place of a custom brand", async () => {
    await render(<ZenProvider><Sidebar collapsed aria-label="Modules" brand={brand} logoCollapsed={<Avatar size="small" shape="square" alt="Đìzai Studio">ĐS</Avatar>} sections={sections} /></ZenProvider>);
    const mark = document.querySelector(".zen-sidebar__default-brand-collapsed .zen-avatar")!;
    expect(mark).toBeTruthy();
    expect(document.querySelector(".zen-sidebar__header")?.textContent).not.toContain("Đìzai Studio");
    expect(offCentre(mark)).toBeLessThan(0.5);
  });

  it("keeps a custom brand's first element centred and only hides the name visually", async () => {
    const screen = await render(<ZenProvider><Sidebar collapsed aria-label="Modules" brand={brand} sections={sections} /></ZenProvider>);
    expect(offCentre(document.querySelector(".zen-sidebar__header .zen-avatar")!)).toBeLessThan(0.5);
    const name = screen.getByText("Đìzai Studio");
    await expect.element(name).toBeInTheDocument();
    expect(name.element().getBoundingClientRect().width).toBeLessThanOrEqual(1);
    const items = [...document.querySelectorAll(".zen-sidebar__body .zen-sidebar__item")].filter((item) => item.getBoundingClientRect().width > 0);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(offCentre(item)).toBeLessThan(0.5);
  });
});

describe("AppShell › the Sidebar's own collapsed", () => {
  // Zen Studio's Collapsed toggle (and an edited `collapsed`) re-renders the same shell: the rail follows the prop.
  const page = (collapsed: boolean) => (
    <ZenProvider>
      <AppShell layout="desktop" sidebar={<Sidebar aria-label="Modules" collapsed={collapsed} sections={sections} />}>
        <Text>Home</Text>
      </AppShell>
    </ZenProvider>
  );

  it("starts from it and follows a change to it", async () => {
    const screen = await render(page(true));
    const rail = () => document.querySelector(".zen-sidebar")?.getAttribute("data-collapsed");
    expect(rail()).toBe("true");
    await screen.rerender(page(false));
    await expect.poll(rail).toBe("false");
    await screen.rerender(page(true));
    await expect.poll(rail).toBe("true");
  });
});
