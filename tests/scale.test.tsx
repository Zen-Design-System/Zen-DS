/**
 * Every size prop takes the short scale (sm, md…) and the long Figma spelling (small, medium…), and both spellings
 * must render exactly the same DOM. Generated from docs/api: every prop named `size` or `spacing` whose type lists a
 * step in both spellings. Required props come from the smoke-test fixtures.
 */
import { createElement, type ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import * as Zen from "../src/index";
import { fixtures } from "./smoke/fixtures";

type ApiProp = { name: string; type: string; required: boolean };
type ApiComponent = { name: string; props: ApiProp[] };
const apiFiles = import.meta.glob<{ components: ApiComponent[] }>("../docs/api/*.json", { eager: true, import: "default" });
const LONG: Record<string, string> = { "2xs": "2xsmall", xs: "xsmall", sm: "small", md: "medium", lg: "large", xl: "xlarge", "2xl": "2xlarge", "3xl": "3xlarge" };

const cases = Object.values(apiFiles)
  .flatMap((file) => file.components)
  .filter((component, index, all) => all.findIndex((other) => other.name === component.name) === index)
  .flatMap((component) => component.props
    .filter((prop) => prop.name === "size" || prop.name === "spacing")
    .map((prop) => {
      // Literals the prop accepts: skip the ones inside Exclude<…, "xlarge" | "xl"> (TextAreaField has no xl).
      const accepted = prop.type.replace(/Exclude<[^>]*>/g, (m) => m.replace(/,\s*("[^"]*"(\s*\|\s*"[^"]*")*)\s*>$/, ">"));
      const excluded = [...(prop.type.match(/Exclude<[^,]+,\s*([^>]+)>/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      const literals = [...accepted.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((l) => !excluded.includes(l));
      const pairs = Object.entries(LONG).filter(([short, long]) => literals.includes(short) && literals.includes(long));
      return { component, prop: prop.name, pairs };
    })
    .filter((c) => c.pairs.length > 0));

/** React ids differ between two renders (useId: `_r_0_` in React 19.1+, `«r0»` / `:r0:` before); everything else must match. */
const normalise = (html: string) => html.replace(/_r_[0-9a-z]+_|«[^»]+»|:r[0-9a-z]+:|(?<=[-_#"])r[0-9][0-9a-z]{0,2}(?=[-_")])/g, "«id»");

describe("size props: short and long spellings render the same", () => {
  it("finds the size props to check", () => {
    // Guards against the docs format changing and this test silently checking nothing.
    expect(cases.length).toBeGreaterThan(20);
  });

  for (const { component, prop, pairs } of cases) {
    const fixture = fixtures[component.name] ?? {};
    if (fixture.skip) continue;
    const Component = (Zen as Record<string, unknown>)[component.name] as ComponentType<Record<string, unknown>>;
    it(`${component.name} ${prop}: ${pairs.map(([s, l]) => `${s}=${l}`).join(" · ")}`, async () => {
      const base: Record<string, unknown> = { ...fixture.props };
      for (const p of component.props.filter((p) => p.required && !(p.name in base))) {
        if (p.type.includes("=>")) base[p.name] = () => undefined;
        else if (/^"/.test(p.type)) base[p.name] = p.type.match(/^"([^"]+)"/)![1];
        else if (/^(string|ReactNode)/.test(p.type)) base[p.name] = "Sample";
        else if (/^number/.test(p.type)) base[p.name] = 1;
        else if (/^boolean/.test(p.type)) base[p.name] = false;
      }
      const html = async (value: string) => {
        const element = createElement(Component, { ...base, [prop]: value });
        const screen = await render(<>{fixture.wrap ? fixture.wrap(element) : element}</>);
        const out = normalise(screen.container.innerHTML);
        await screen.unmount();
        return out;
      };
      for (const [short, long] of pairs) {
        const [a, b] = [await html(short), await html(long)];
        const at = [...a].findIndex((ch, i) => ch !== b[i]);
        expect(a, `${component.name} ${prop}="${short}" vs "${long}" differ at …${a.slice(Math.max(0, at - 60), at + 60)}… vs …${b.slice(Math.max(0, at - 60), at + 60)}…`).toBe(b);
      }
    });
  }
});
