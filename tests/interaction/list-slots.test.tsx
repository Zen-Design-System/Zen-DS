/**
 * Figma list slots as children (2026-10-09, user: "Children + giữ mảng"): Tabs, Breadcrumbs, Stepper and
 * BottomNavigation take children of their own item component as well as their arrays. Children render exactly what the
 * same array renders, and the parent still owns selection, keyboard and ids.
 */
import { useState, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import {
  BottomNavigation, BottomNavigationItem, BreadcrumbItem, Breadcrumbs, Stepper, StepperStep, TabItem, Tabs, ZenProvider,
} from "../../src/index";

/** The rendered markup, with useId() values (tab ids, icon clip paths) made comparable. */
const markup = (element: Element) => element.innerHTML.replace(/_r_[\w]+_/g, "_r_id_").replace(/zen-tabs-[\w-]+?-(tab|panel)/g, "zen-tabs-id-$1");

async function same(fromArray: ReactElement, fromChildren: ReactElement, selector: string) {
  const a = await render(<ZenProvider>{fromArray}</ZenProvider>);
  const arrayMarkup = markup(a.container.querySelector(selector)!);
  await a.unmount();
  const b = await render(<ZenProvider>{fromChildren}</ZenProvider>);
  expect(markup(b.container.querySelector(selector)!)).toBe(arrayMarkup);
  return b;
}

describe("Tabs › TabItem children", () => {
  it("render as the items array and keep the roving keyboard", async () => {
    const screen = await same(
      <Tabs aria-label="Project" idPrefix="p" items={[{ id: "overview", label: "Overview" }, { id: "files", label: "Files", badge: 3 }, { id: "notes", label: "Notes", disabled: true }]} />,
      <Tabs aria-label="Project" idPrefix="p">
        <TabItem value="overview" label="Overview" />
        <TabItem value="files" label="Files" badge={3} />
        <TabItem value="notes" label="Notes" disabled />
      </Tabs>,
      ".zen-tabs",
    );
    const overview = screen.getByRole("tab", { name: "Overview" });
    await userEvent.click(overview);
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(screen.getByRole("tab", { name: /Files/ })).toHaveAttribute("aria-selected", "true");
    // Notes is disabled: → wraps back to Overview.
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(overview).toHaveAttribute("aria-selected", "true");
  });

  it("call onValueChange with the child's value", async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <ZenProvider>
        <Tabs aria-label="Project" onValueChange={onValueChange}>
          <TabItem value="overview" label="Overview" />
          <TabItem value="files" label="Files" />
        </Tabs>
      </ZenProvider>,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Files" }));
    expect(onValueChange).toHaveBeenCalledWith("files");
  });
});

describe("Breadcrumbs › BreadcrumbItem children", () => {
  it("render as the items array, with the master level, the current page and collapsing", async () => {
    const items = [
      { id: "home", label: "Home", href: "#home" },
      { id: "projects", label: "Projects", href: "#projects" },
      { id: "lumen", label: "Lumen Bank", href: "#lumen" },
      { id: "brief", label: "Brief" },
    ];
    const screen = await same(
      <Breadcrumbs items={items} maxItems={3} />,
      <Breadcrumbs maxItems={3}>
        {items.map((item) => <BreadcrumbItem key={item.id} item={item} />)}
      </Breadcrumbs>,
      ".zen-breadcrumbs",
    );
    expect(screen.container.querySelector('[aria-current="page"]')?.textContent).toBe("Brief");
  });
});

describe("Stepper › StepperStep children", () => {
  it("render as the steps array and keep the states from current", async () => {
    const steps = [{ id: "details", title: "Details" }, { id: "payment", title: "Payment", caption: "Optional" }, { id: "review", title: "Review" }];
    const screen = await same(
      <Stepper steps={steps} current={1} />,
      <Stepper current={1}>
        <StepperStep id="details" title="Details" />
        <StepperStep id="payment" title="Payment" caption="Optional" />
        <StepperStep id="review" title="Review" />
      </Stepper>,
      ".zen-stepper",
    );
    expect(screen.container.querySelectorAll(".zen-stepper-item")[1]?.getAttribute("data-state")).toBe("focused");
  });

  it("StepperStep alone renders nothing", async () => {
    const screen = await render(<ZenProvider><div data-testid="alone"><StepperStep id="x" title="Alone" /></div></ZenProvider>);
    expect(screen.getByTestId("alone").element().innerHTML).toBe("");
  });
});

describe("BottomNavigation › BottomNavigationItem children", () => {
  function Bar({ children }: { children: boolean }) {
    const [value, setValue] = useState("home");
    const items = [{ id: "home", label: "Home", icon: "icon-home-03-line" as const }, { id: "inbox", label: "Inbox", icon: "icon-bell-01-line" as const, dot: true }, { id: "profile", label: "Profile", icon: "icon-user-circle-line" as const }];
    return children ? (
      <BottomNavigation value={value} onValueChange={setValue}>
        {items.map((item) => <BottomNavigationItem key={item.id} {...item} />)}
      </BottomNavigation>
    ) : <BottomNavigation value={value} onValueChange={setValue} items={items} />;
  }

  it("render as the items array and select on press", async () => {
    const screen = await same(<Bar children={false} />, <Bar children />, ".zen-bottom-nav");
    await userEvent.click(screen.getByRole("button", { name: "Inbox" }));
    await expect.element(screen.getByRole("button", { name: "Inbox" })).toHaveAttribute("aria-current", "page");
  });
});
