/**
 * Figma GLASS (Liquid Glass) and the progressive background blur (2026-10-10). In Chromium the glass components get an
 * SVG backdrop filter (frost → refraction → dispersion) and a light rim drawn for their size; the bars' progressive blur
 * is six stacked blurs whose σ² add up to a linear ramp.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AiChatField, BottomNavigation, TopNavigation, ZenProvider } from "../../src/index";
import { glassStyles } from "../../src/styles/generated/glass-styles";

const glassFilter = (element: Element) => {
  const match = /url\("?#([\w-]+)"?\)/.exec((element as HTMLElement).style.backdropFilter);
  return match ? document.getElementById(match[1]) : null;
};

describe("Liquid Glass", () => {
  it("gives AiChatField Style=Liquid Glass Liquid-Glass/Normal's filter and light, and takes them away with it", async () => {
    const screen = await render(<ZenProvider><div style={{ width: 360 }}><AiChatField fieldStyle="liquid-glass" placeholder="Ask Zen" onSubmit={() => {}} /></div></ZenProvider>);
    const field = screen.container.querySelector(".zen-ai-field")!;
    await expect.poll(() => glassFilter(field)?.tagName).toBe("filter");
    const filter = glassFilter(field)!;
    // Frost (Figma radius / 2), three displaced colours (dispersion: blue bends most), the map drawn at the field's size.
    expect(filter.querySelector("feGaussianBlur")?.getAttribute("stdDeviation")).toBe(String(glassStyles["liquid-glass-normal"].frost / 2));
    const scales = [...filter.querySelectorAll("feDisplacementMap")].map((node) => Number(node.getAttribute("scale")));
    expect(scales).toHaveLength(3);
    expect(scales[0]).toBeLessThan(scales[1]);
    expect(scales[2]).toBeGreaterThan(scales[1]);
    expect(filter.querySelector("feImage")?.getAttribute("width")).toBe(String((field as HTMLElement).offsetWidth));
    expect((field as HTMLElement).style.backgroundImage).toMatch(/^url\("data:image\/png/);
    await screen.unmount();
    expect(document.querySelectorAll("[data-zen-liquid-glass] filter")).toHaveLength(0);
  });

  it("leaves the default field style alone", async () => {
    const screen = await render(<ZenProvider><AiChatField placeholder="Ask Zen" onSubmit={() => {}} /></ZenProvider>);
    expect((screen.container.querySelector(".zen-ai-field") as HTMLElement).style.backdropFilter).toBe("");
  });

  it("puts Liquid-Glass/Normal on the Floating-Glass bar and its CTA, and only the Active/Neutral/Subtle fill on the selected item", async () => {
    const screen = await render(
      <ZenProvider>
        <BottomNavigation type="floating-glass" value="home" onValueChange={() => {}} action={{ icon: "icon-plus-line", label: "New" }}
          items={[{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "inbox", label: "Inbox", icon: "icon-bell-01-line" }, { id: "profile", label: "Profile", icon: "icon-user-circle-line" }]} />
      </ZenProvider>,
    );
    // Figma 9017:42211 Container and 9017:42216 Action: effect style Liquid-Glass/Normal.
    const pill = screen.container.querySelector(".zen-bottom-nav__pill")!;
    await expect.poll(() => glassFilter(pill)?.querySelector("feGaussianBlur")?.getAttribute("stdDeviation")).toBe(String(glassStyles["liquid-glass-normal"].frost / 2));
    expect(glassFilter(screen.container.querySelector(".zen-bottom-nav__fab")!)).not.toBeNull();
    // The selected item's own lightless GLASS has nothing to bend inside the pill (its backdrop root): no filter, so the
    // tab stays the light Active/Neutral/Subtle pill instead of a refracted grey one.
    expect((screen.container.querySelector('.zen-bottom-nav__item[data-selected="true"]') as HTMLElement).style.backdropFilter).toBe("");
    expect((screen.container.querySelector('.zen-bottom-nav__item[data-selected="false"]') as HTMLElement).style.backdropFilter).toBe("");
  });

  it("draws the dark light again when a plain element around the bar turns dark (a Zen Studio frame's own theme)", async () => {
    const screen = await render(
      <ZenProvider>
        <div data-testid="frame">
          <BottomNavigation type="floating-glass" value="home" onValueChange={() => {}}
            items={[{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "inbox", label: "Inbox", icon: "icon-bell-01-line" }]} />
        </div>
      </ZenProvider>,
    );
    const pill = screen.container.querySelector(".zen-bottom-nav__pill") as HTMLElement;
    await expect.poll(() => pill.style.backgroundImage).toMatch(/^url\(/);
    // Past the ResizeObserver's first callback (it fires once on observe and redraws): only the mode change may redraw.
    await new Promise((done) => setTimeout(done, 300));
    const light = pill.style.backgroundImage;
    // user 2026-11-23 "Darkmode glass vẫn còn bị trắng": the mode set on the frame (not on a ZenProvider) kept the light
    // mode's white rim; the dark Normal glass draws its light at a twentieth.
    screen.container.querySelector('[data-testid="frame"]')!.setAttribute("data-theme", "dark");
    await expect.poll(() => pill.style.backgroundImage).not.toBe(light);
    expect(getComputedStyle(pill).getPropertyValue("--zen-liquid-glass-light").trim()).toBe("0.05");
  });

  it("gives the Liquid Glass top bar's actions their glass", async () => {
    const screen = await render(<ZenProvider><TopNavigation type="liquid-glass" title="Trip" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => {} }} /></ZenProvider>);
    await expect.poll(() => glassFilter(screen.container.querySelector(".zen-top-nav__action")!)?.tagName).toBe("filter");
  });
});

describe("Progressive blur", () => {
  it("stacks six blurs whose σ² add up to the bar's blur, strongest at the Floating bar's bottom", async () => {
    const screen = await render(
      <ZenProvider>
        <BottomNavigation type="floating" value="home" onValueChange={() => {}}
          items={[{ id: "home", label: "Home", icon: "icon-home-03-line" }, { id: "inbox", label: "Inbox", icon: "icon-bell-01-line" }, { id: "profile", label: "Profile", icon: "icon-user-circle-line" }]} />
      </ZenProvider>,
    );
    const layers = [...screen.container.querySelectorAll(".zen-bottom-nav__progressive > i")];
    expect(layers).toHaveLength(6);
    const sigmas = layers.map((layer) => Number(/blur\(([\d.]+)px\)/.exec(getComputedStyle(layer).backdropFilter)?.[1]));
    // σ_k = 12px · √(2k − 1) / 6: the sum of squares is 12² (the bottom edge), each step adds the next sixth.
    expect(Math.sqrt(sigmas.reduce((sum, sigma) => sum + sigma * sigma, 0))).toBeCloseTo(12, 0);
    expect(screen.container.querySelector(".zen-bottom-nav__progressive")?.getAttribute("data-strong")).toBe("bottom");
  });
});
