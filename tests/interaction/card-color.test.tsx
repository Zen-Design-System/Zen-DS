/**
 * Card Theme=Pale / Solid × Color (Figma Card 6643:51021, 2026-10-14). Pale fills Support/<Color>/Pale; Solid fills
 * Background/Neutral/Solid/Default (Neutral), Support/<Color>/Solid (Brand, Cyan, Yellow, Orange) or
 * Background/Accent/Solid/Default (Accent, 2026-10-17). A Solid card keeps the page mode: it re-points the neutral tokens
 * its content reads to its fill's family (Content/Inverse/* on Neutral, On-Colors on Brand/Cyan/Orange, On-Brights on
 * Yellow, On-Accent on Accent: content follows the fill, user 2026-10-17), and a control with its own Inverse fill gets
 * the page's neutral content back. Axe checks the text contrast in light and dark of every combination but the white
 * On-Colors / On-Accent solids, which measure about 3:1 (the user accepted it, 2026-10-17).
 */
import type { CSSProperties } from "react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge, Button, Card, cardColors, cardSolidColors, Heading, ProgressBar, Text, ZenProvider, type CardColor } from "../../src/index";

const token = (element: Element, name: string) => getComputedStyle(element).getPropertyValue(name).trim();
/** The colour a token resolves to, read through a probe element's computed `color`. */
const resolve = (scope: Element, name: string) => {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  scope.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
};

const Widget = ({ theme, color }: { theme: "pale" | "subtle" | "solid"; color: CardColor }) => (
  <Card theme={theme} color={color} subAction={{ label: "More actions", onClick: () => undefined }} data-testid={`${theme}-${color}`}>
    <Heading level={3} textStyle="Heading/Subheading">Invoiced this year</Heading>
    <Text textStyle="Heading/2">$798,300</Text>
    <Text textStyle="Body/Small/Regular" tone="base">Across 14 clients</Text>
    <Badge theme="on-color" background="solid" size="sm">+18% vs. 2025</Badge>
    <ProgressBar value={68} aria-label="Goal reached" />
    <Button appearance="overlay" level="inverse" size="sm" onClick={() => undefined}>View report</Button>
  </Card>
);

describe("Card colour", () => {
  it("takes data-color on Pale and Solid only; a Solid hue Figma does not draw renders as Solid Neutral", async () => {
    const screen = await render(
      <ZenProvider>
        <Card theme="pale" color="violet">a</Card>
        <Card theme="solid" color="violet">b</Card>
        <Card theme="solid" color="brand">c</Card>
        <Card theme="default" color="brand">d</Card>
        <Card theme="semi-pale" color="cyan">e</Card>
        <Card theme="pale" color="accent">f</Card>
        <Card theme="solid" color="accent">g</Card>
        <Card theme="subtle" color="green">h</Card>
        <Card theme="subtle" color="accent">i</Card>
      </ZenProvider>,
    );
    const cards = [...screen.container.querySelectorAll(".zen-card")];
    expect(cards.map((card) => [card.getAttribute("data-tone"), card.getAttribute("data-color")])).toEqual([
      ["pale", "violet"], ["solid", "neutral"], ["solid", "brand"], ["default", null], ["pale", "cyan"], ["pale", "neutral"], ["solid", "accent"],
      ["subtle", "green"], ["subtle", "neutral"],
    ]);
  });

  it("fills Pale with Support/<Color>/Pale and Solid with Neutral/Solid or Support/<Color>/Solid", async () => {
    const screen = await render(
      <ZenProvider theme="light">
        {cardColors.map((color) => <Card key={color} theme="pale" color={color} data-testid={`pale-${color}`}>x</Card>)}
        {cardColors.map((color) => <Card key={`s-${color}`} theme="subtle" color={color} data-testid={`subtle-${color}`}>x</Card>)}
        {cardSolidColors.map((color) => <Card key={color} theme="solid" color={color} data-testid={`solid-${color}`}>x</Card>)}
      </ZenProvider>,
    );
    const page = screen.container.querySelector("[data-theme]")!;
    for (const color of cardColors) {
      const card = screen.container.querySelector(`[data-testid="pale-${color}"]`)!;
      // Figma has no Pale Accent: it draws as Pale Neutral.
      expect(getComputedStyle(card).backgroundColor, `pale ${color}`).toBe(resolve(page, `--zen-color-background-support-${color === "accent" ? "neutral" : color}-pale`));
    }
    for (const color of cardColors) {
      // Subtle (user rule 2026-10-17): Support/<Color>/Subtle; no Subtle Accent either.
      const card = screen.container.querySelector(`[data-testid="subtle-${color}"]`)!;
      expect(getComputedStyle(card).backgroundColor, `subtle ${color}`).toBe(resolve(page, `--zen-color-background-support-${color === "accent" ? "neutral" : color}-subtle`));
    }
    for (const color of cardSolidColors) {
      const card = screen.container.querySelector(`[data-testid="solid-${color}"]`)!;
      const fill = color === "neutral" ? "--zen-color-background-neutral-solid-default" : color === "accent" ? "--zen-color-background-accent-solid-default" : `--zen-color-background-support-${color}-solid`;
      expect(getComputedStyle(card).backgroundColor, `solid ${color}`).toBe(resolve(page, fill));
    }
  });

  it("Solid Neutral: content reads Content/Inverse/*, the Inverse button keeps its dark label, the page mode stays", async () => {
    const screen = await render(<ZenProvider theme="light"><Widget theme="solid" color="neutral" /></ZenProvider>);
    const page = screen.container.querySelector("[data-theme]")!;
    const card = screen.container.querySelector(".zen-card")!;
    expect(card.closest("[data-theme]")).toBe(page);
    expect(card.querySelector("[data-theme]")).toBeNull();
    const value = [...card.querySelectorAll(".zen-text")][0];
    expect(getComputedStyle(value).color).toBe(resolve(page, "--zen-color-content-inverse-strongest"));
    const meta = card.querySelector('.zen-text[data-tone="base"]')!;
    expect(getComputedStyle(meta).color).toBe(resolve(page, "--zen-color-content-inverse-base"));
    // Sub-Action (Button/Icon-Flat Secondary): Content/Inverse/Light, as Figma overrides it on Solid Neutral.
    const more = card.querySelector(".zen-card__sub-action .zen-button")!;
    expect(getComputedStyle(more).color).toBe(resolve(page, "--zen-color-content-inverse-light"));
    // Button Level=Inverse: Background/Inverse/Solid with the page's Content/Neutral/Strongest label.
    const button = card.querySelector('.zen-button[data-level="inverse"]')!;
    expect(getComputedStyle(button).color).toBe(resolve(page, "--zen-color-content-neutral-strongest"));
    expect(token(card, "--zen-color-content-neutral-strongest")).toBe(token(page, "--zen-color-content-neutral-strongest"));
    // Marks drawn on the fill (the Hero sparkline's area, 15487:89034) read Background/Inverse/Solid; a Neutral Solid
    // Badge keeps the page's Neutral/Solid fill.
    const content = card.querySelector(".zen-card__content")!;
    expect(resolve(content, "--zen-color-background-neutral-solid-default")).toBe(resolve(page, "--zen-color-background-inverse-solid-default"));
    expect(resolve(content, "--zen-color-border-neutral-solid-default")).toBe(resolve(page, "--zen-color-border-inverse"));
    const badge = card.querySelector(".zen-badge")!;
    expect(resolve(badge, "--zen-color-background-neutral-solid-default")).toBe(resolve(page, "--zen-color-background-neutral-solid-default"));
  });

  it("Flat-Border is Surface/Flat inside its Pale frame, whatever the surface; Default and Border take theirs", async () => {
    const screen = await render(
      <ZenProvider theme="dark">
        <Card theme="flat-border" data-testid="flat-border">a</Card>
        <Card theme="flat-border" surface="alt" data-testid="flat-border-alt">b</Card>
        <Card theme="default" data-testid="default">c</Card>
        <Card theme="border" surface="alt" data-testid="border-alt">d</Card>
      </ZenProvider>,
    );
    const page = screen.container.querySelector("[data-theme]")!;
    const card = (id: string) => screen.container.querySelector(`[data-testid="${id}"]`)!;
    expect(getComputedStyle(card("flat-border")).backgroundColor).toBe(resolve(page, "--zen-color-background-surface-flat"));
    expect(getComputedStyle(card("flat-border")).boxShadow).toContain("inset");
    expect(getComputedStyle(card("flat-border-alt")).backgroundColor).toBe(resolve(page, "--zen-color-background-surface-flat"));
    expect(getComputedStyle(card("default")).backgroundColor).toBe(resolve(page, "--zen-color-background-surface-default"));
    expect(getComputedStyle(card("default")).boxShadow).toBe("none");
    expect(getComputedStyle(card("border-alt")).backgroundColor).toBe(resolve(page, "--zen-color-background-surface-alt"));
  });

  it("selected keeps the Active look and the page tokens", async () => {
    const screen = await render(<ZenProvider theme="light"><Card theme="solid" color="neutral" selected><Text>Plan</Text></Card></ZenProvider>);
    const page = screen.container.querySelector("[data-theme]")!;
    const text = screen.container.querySelector(".zen-text")!;
    expect(getComputedStyle(text).color).toBe(resolve(page, "--zen-color-content-neutral-strongest"));
  });

  for (const theme of ["light", "dark"] as const) {
    it(`a colour Solid: content reads its fill's family, the page mode stays (${theme})`, async () => {
      const families = { brand: "--zen-color-content-on-colors", cyan: "--zen-color-content-on-colors", orange: "--zen-color-content-on-colors", yellow: "--zen-color-content-on-brights", accent: "--zen-color-content-on-accent-default" } as const;
      const screen = await render(
        <ZenProvider theme={theme}>
          {(Object.keys(families) as (keyof typeof families)[]).map((color) => <Widget key={color} theme="solid" color={color} />)}
        </ZenProvider>,
      );
      const page = screen.container.querySelector("[data-theme]")!;
      for (const [color, family] of Object.entries(families)) {
        const card = screen.container.querySelector(`[data-testid="solid-${color}"]`)!;
        const texts = [...card.querySelectorAll(".zen-card__content > .zen-text, .zen-card__content > .zen-heading")];
        expect(texts.map((text) => getComputedStyle(text).color), `solid ${color}`).toEqual(texts.map(() => resolve(page, family)));
        // An Inverse button keeps the page's dark label on its white fill.
        expect(getComputedStyle(card.querySelector('.zen-button[data-level="inverse"]')!).color).toBe(resolve(page, "--zen-color-content-neutral-strongest"));
      }
    });

    it(`passes axe colour contrast for every Pale and Subtle colour, Solid Neutral and Solid Yellow (${theme})`, async () => {
      // White On-Colors / On-Accent text measures about 3:1 on Brand, Cyan, Orange and Accent: the user chose the tokens'
      // own family there (2026-10-17), so those solids are left out of the contrast check.
      const checked = cardSolidColors.filter((color) => color === "neutral" || color === "yellow");
      const screen = await render(
        <ZenProvider theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 240px)", gap: 16, padding: 16 }}>
            {cardColors.map((color) => <Widget key={`p-${color}`} theme="pale" color={color} />)}
            {cardColors.map((color) => <Widget key={`t-${color}`} theme="subtle" color={color} />)}
            {checked.map((color) => <Widget key={`s-${color}`} theme="solid" color={color} />)}
          </div>
        </ZenProvider>,
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const result = await axe.run(screen.container, { runOnly: { type: "rule", values: ["color-contrast"] } });
      const failures = result.violations.flatMap((violation) => violation.nodes.map((node) => `${node.target.join(" ")}: ${node.any.map((check) => check.message).join(" ")}`));
      expect(failures).toEqual([]);
    });
  }
});

describe("Card Shadow on an alt page scope", () => {
  // A page scope that makes its cards Surface/Alt (the platform's .pe-shell[data-canvas="alt"]) sets --zen-card-shadow
  // with it: Surface-Alt casts no shadow (component-usage-rules §9); a card that picks surface="default" gets it back.
  const scope = { "--zen-card-surface": "var(--zen-color-background-surface-alt)", "--zen-card-shadow": "0 0 transparent" } as CSSProperties;
  const shadowOf = (testId: string) => getComputedStyle(document.querySelector(`[data-testid="${testId}"]`)!).boxShadow;

  it("drops the shadow for an inherited alt surface, keeps it for an explicit default", async () => {
    await render(<ZenProvider><div style={scope}>
      <Card theme="shadow" data-testid="inherited"><Text>Inherited alt</Text></Card>
      <Card theme="shadow" surface="default" data-testid="default"><Text>Explicit default</Text></Card>
    </div><Card theme="shadow" data-testid="page"><Text>No scope</Text></Card></ZenProvider>);
    expect(shadowOf("inherited")).toMatch(/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$|^none$/);
    expect(shadowOf("default")).not.toMatch(/^none$|^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/);
    expect(shadowOf("default")).toBe(shadowOf("page"));
  });
});
