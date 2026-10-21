/**
 * A phone's built-in search is Rounded by default (user 2026-10-17: "mặc định nhưng cho sửa"): a Search in a
 * TopNavigation control bar, a BottomSheet or an AppShell on a phone (user 2026-10-21) takes shape="rounded" unless it
 * sets its own shape; elsewhere it keeps the default shape.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AppShell, BottomSheet, Search, TopNavigation, ZenProvider } from "../../src/index";

const shapeOf = (root: ParentNode, label: string) => {
  const input = root.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
  return input?.closest(".zen-search")?.classList.contains("zen-search--rounded") ? "rounded" : "default";
};

describe("Search shape on phones", () => {
  it("keeps the default shape on its own", async () => {
    const screen = await render(<ZenProvider><Search aria-label="Find files" /></ZenProvider>);
    expect(shapeOf(screen.container, "Find files")).toBe("default");
  });

  it("is rounded in a TopNavigation control bar unless it says shape", async () => {
    const screen = await render(
      <ZenProvider>
        <TopNavigation title="Files" controlBar={<Search aria-label="Search files" />} />
        <TopNavigation title="Mail" controlBar={<Search aria-label="Search mail" shape="default" />} />
      </ZenProvider>,
    );
    expect(shapeOf(screen.container, "Search files")).toBe("rounded");
    expect(shapeOf(screen.container, "Search mail")).toBe("default");
  });

  it("is rounded in a BottomSheet's search", async () => {
    await render(
      <ZenProvider>
        <BottomSheet open onOpenChange={() => {}} title="Country" search={<Search aria-label="Search countries" />} items={[{ id: "vn", label: "Vietnam" }]} />
      </ZenProvider>,
    );
    expect(shapeOf(document, "Search countries")).toBe("rounded");
  });

  it("is rounded in an AppShell on a phone unless it says shape, and keeps its shape on a desktop", async () => {
    const screen = await render(
      <ZenProvider>
        <AppShell layout="mobile" topNavigation={<TopNavigation title="Home" />}>
          <Search aria-label="Search food" />
          <Search aria-label="Search places" shape="default" />
        </AppShell>
        <AppShell layout="desktop"><Search aria-label="Search people" /></AppShell>
      </ZenProvider>,
    );
    expect(shapeOf(screen.container, "Search food")).toBe("rounded");
    expect(shapeOf(screen.container, "Search places")).toBe("default");
    expect(shapeOf(screen.container, "Search people")).toBe("default");
  });
});
