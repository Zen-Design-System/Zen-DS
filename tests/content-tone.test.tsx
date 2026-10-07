/**
 * Text, Heading and Icon `tone` (src/components/_shared/contentTone.ts): every tone paints with its Color/Content token,
 * every alias paints like the tone it names, and every resting Color/Content token in tokens.css has a tone.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { contentToneAliases, contentToneGroups, contentTones, contentToneVar, type ContentTone } from "../src/components/_shared/contentTone";
import { Icon } from "../src/components/Icon";
import { Heading, Text } from "../src/components/Text";

const canonical = contentToneGroups.flatMap(({ tones }) => tones);
/** Token states the components own (Hover, Pressed, Visited, Placeholder, Overlay/Inverse Disabled): no tone. */
const STATE = /-(hover|pressed|visited|placeholder)$|^--zen-color-content-placeholder$|-(overlay|inverse)-disabled$/;

/** The colour a token resolves to here, read from a probe element. */
function tokenColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

describe("content tones", () => {
  it("lists every tone once: canonical tones in groups, aliases outside them", () => {
    expect(new Set(canonical).size).toBe(canonical.length);
    const aliases = Object.keys(contentToneAliases);
    expect([...canonical, ...aliases].sort()).toEqual([...contentTones].sort());
    for (const alias of aliases) expect(canonical).toContain(contentToneAliases[alias as ContentTone]);
  });

  it("has a tone for every resting Color/Content token", () => {
    const declared = new Set<string>();
    for (const sheet of Array.from(document.styleSheets)) {
      for (const rule of Array.from(sheet.cssRules)) {
        const text = rule.cssText;
        for (const match of text.matchAll(/(--zen-color-content-[a-z0-9-]+)\s*:/g)) declared.add(match[1]);
      }
    }
    const resting = [...declared].filter((token) => !STATE.test(token));
    const covered = new Set(canonical.map((tone) => contentToneVar(tone)));
    expect(resting.length).toBeGreaterThan(70);
    expect(resting.filter((token) => !covered.has(token))).toEqual([]);
  });

  it("paints Text, Heading and Icon with the tone's token", async () => {
    const screen = await render(
      <div>
        {canonical.map((tone) => (
          <div key={tone} data-case={tone}>
            <Text tone={tone}>Aa</Text>
            <Heading level={3} tone={tone}>Aa</Heading>
            <Icon name="icon-check-circle-line" tone={tone} />
          </div>
        ))}
      </div>,
    );
    const root = screen.container;
    for (const tone of canonical) {
      const token = contentToneVar(tone);
      const box = root.querySelector(`[data-case="${tone}"]`)!;
      const expected = token ? tokenColour(token) : getComputedStyle(box).color;
      for (const selector of [".zen-text:not(.zen-heading)", ".zen-heading", ".zen-icon"]) {
        expect(getComputedStyle(box.querySelector(selector)!).color, `${selector} tone="${tone}"`).toBe(expected);
      }
    }
  });

  it("paints an alias like the tone it names, and leaves an Icon without a tone in its parent's colour", async () => {
    const aliases = Object.entries(contentToneAliases) as Array<[ContentTone, ContentTone]>;
    const screen = await render(
      <div>
        {aliases.map(([alias, tone]) => (
          <div key={alias} data-case={alias}><Text tone={alias}>Aa</Text><Text tone={tone}>Aa</Text></div>
        ))}
        <div data-case="icon" style={{ color: "var(--zen-color-content-positive-base)" }}><Icon name="icon-check-circle-line" /></div>
      </div>,
    );
    const root = screen.container;
    for (const [alias] of aliases) {
      const [written, named] = Array.from(root.querySelectorAll(`[data-case="${alias}"] .zen-text`));
      expect(getComputedStyle(written).color, alias).toBe(getComputedStyle(named).color);
      expect(written.getAttribute("data-tone"), alias).toBe(named.getAttribute("data-tone"));
    }
    const icon = root.querySelector('[data-case="icon"] .zen-icon')!;
    expect(icon.hasAttribute("data-tone")).toBe(false);
    expect(getComputedStyle(icon).color).toBe(tokenColour("--zen-color-content-positive-base"));
  });
});
