/**
 * Each crumb on its own, as Figma's Item-List instances (2026-10-10, user: "breadcrumb vẫn lỗi nested edit - thiếu props
 * nested" → "Mỗi crumb riêng như Figma"): an item's level, emphasis, state and dash win over Breadcrumbs' master /
 * emphasis and the trail's own chevrons; unset fields keep the old trail exactly.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { BreadcrumbItem, Breadcrumbs, ZenProvider } from "../../src/index";

const crumbs = (root: Element) => [...root.querySelectorAll(".zen-breadcrumbs__item")];
const crumb = (item: Element) => item.querySelector(".zen-breadcrumb")!;
const isMedium = (item: Element) => item.querySelector(".zen-breadcrumb__label")!.className.includes("medium");
const hasDash = (item: Element) => Boolean(item.querySelector(".zen-breadcrumbs__separator"));

describe("Breadcrumbs › per-crumb Level, Emphasis, State, Dash", () => {
  it("unset fields keep Breadcrumbs' master, emphasis and a chevron after all but the last", async () => {
    const screen = await render(<ZenProvider><Breadcrumbs emphasis="medium" items={[{ id: "a", label: "Projects" }, { id: "b", label: "Lumen" }, { id: "c", label: "Brief" }]} /></ZenProvider>);
    const items = crumbs(screen.container);
    expect(items.map((item) => crumb(item).getAttribute("data-level"))).toEqual(["master", "sub", "sub"]);
    expect(items.map(isMedium)).toEqual([true, true, true]);
    expect(items.map(hasDash)).toEqual([true, true, false]);
  });

  it("an item's own fields win: Sub first crumb, one Medium crumb, a Hover crumb, no chevron after the second", async () => {
    const screen = await render(
      <ZenProvider>
        <Breadcrumbs
          items={[
            { id: "a", label: "Projects", level: "sub" },
            { id: "b", label: "Lumen", emphasis: "medium", state: "hover", dash: false },
            { id: "c", label: "Brief", level: "master" },
          ]}
        />
      </ZenProvider>,
    );
    const items = crumbs(screen.container);
    expect(items.map((item) => crumb(item).getAttribute("data-level"))).toEqual(["sub", "sub", "master"]);
    expect(items.map(isMedium)).toEqual([false, true, false]);
    expect(crumb(items[1]).getAttribute("data-state")).toBe("hover");
    expect(items.map(hasDash)).toEqual([true, false, false]);
    // A Master crumb draws the leading icon wherever it sits; the current page stays the last.
    expect(items[2].querySelector(".zen-breadcrumb__icon")).not.toBeNull();
    expect(screen.container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe("Brief");
  });

  it("a BreadcrumbItem child's own level / emphasis / state count as its item's", async () => {
    const screen = await render(
      <ZenProvider>
        <Breadcrumbs>
          <BreadcrumbItem item={{ id: "a", label: "Projects" }} level="sub" />
          <BreadcrumbItem item={{ id: "b", label: "Brief" }} emphasis="medium" />
        </Breadcrumbs>
      </ZenProvider>,
    );
    const items = crumbs(screen.container);
    expect(items.map((item) => crumb(item).getAttribute("data-level"))).toEqual(["sub", "sub"]);
    expect(items.map(isMedium)).toEqual([false, true]);
  });
});
