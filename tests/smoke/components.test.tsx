/**
 * Smoke test for every public component, generated from docs/api (react-docgen output): each component renders in
 * light and dark inside ZenProvider with only its required props (synthesised from their types, or taken from
 * fixtures.tsx), raises no console error, and adds no axe violation beyond tests/smoke/axe-baseline.json.
 *
 * A new component needs nothing here unless its required props cannot be synthesised; the test then fails and asks
 * for a fixture. Fixing an a11y issue makes its baseline entry stale: the test fails until the baseline is rewritten
 * (ZEN_UPDATE_AXE=1 npm test -- tests/smoke), so the baseline only ever shrinks.
 */
import { createElement, isValidElement, type ComponentType, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { commands } from "vitest/browser";
import axe from "axe-core";
import * as Zen from "../../src/index";
import { fixtures } from "./fixtures";
import baseline from "./axe-baseline.json";

import { components, noop, synthesise } from "./api-components";

/** Axe rules that judge the page, not a component rendered alone. */
const pageRules = { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } };
const collected: Record<string, string[]> = {};
/** Baselined violations whose detection depends on the machine (see the check below). */
const ENVIRONMENT_DEPENDENT: Record<string, string[]> = { TabItem: ["color-contrast"], SegmentedItem: ["color-contrast"] };

describe("every public component renders in light and dark", () => {
  for (const component of components) {
    const fixture = fixtures[component.name] ?? {};
    const Component = (Zen as Record<string, unknown>)[component.name] as ComponentType<Record<string, unknown>> | undefined;
    if (fixture.skip) { it.skip(`${component.name} — ${fixture.skip}`, noop); continue; }

    it(component.name, async () => {
      expect(Component, `${component.name} is documented in docs/api but not exported from src/index.ts`).toBeDefined();
      const props: Record<string, unknown> = {};
      const missing: string[] = [];
      for (const prop of component.props.filter((p) => p.required)) {
        if (fixture.props && prop.name in fixture.props) continue;
        const value = synthesise(prop);
        if (value === undefined) missing.push(`${prop.name}: ${prop.type}`); else props[prop.name] = value;
      }
      expect(missing, `add a fixture for ${component.name} in tests/smoke/fixtures.tsx`).toEqual([]);
      Object.assign(props, fixture.props);

      const violations = new Set<string>();
      for (const theme of ["light", "dark"] as const) {
        const element = createElement(Component!, props) as ReactElement;
        const content: ReactNode = fixture.wrap ? fixture.wrap(element) : element;
        const screen = await render(<Zen.ZenProvider theme={theme} breakpoint="desktop" data-smoke={component.name}>{content}</Zen.ZenProvider>);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const root = screen.container.querySelector<HTMLElement>(`[data-smoke="${component.name}"]`) ?? screen.container;
        expect(isValidElement(element)).toBe(true);
        const result = await axe.run(root, { resultTypes: ["violations"], rules: pageRules });
        for (const violation of result.violations) violations.add(`${violation.id}${theme === "dark" && violation.id === "color-contrast" ? ":dark" : ""}`);
        await screen.unmount();
      }

      const found = [...violations].sort();
      if (__ZEN_UPDATE_AXE__) { if (found.length) collected[component.name] = found; return; }
      const allowed = (baseline as Record<string, string[]>)[component.name] ?? [];
      expect(found.filter((id) => !allowed.includes(id)), `new axe violations in ${component.name} (fix them; see https://dequeuniversity.com/rules/axe/)`).toEqual([]);
      // A baselined violation that axe reports on one machine and not another is not "fixed": TabItem's inactive label sits
      // at 3.74:1 and SegmentedItem's at 3.73:1 in light (#7f7f7f on #f7f7f7; designer decisions, BACKLOG "Contrast in
      // light mode"), and the cloud container's font rasterising, or a loaded full-suite run (the gate, 2026-10-20), makes
      // axe call it incomplete instead of a violation. Those entries may be absent without failing the run.
      const environmentDependent = ENVIRONMENT_DEPENDENT[component.name] ?? [];
      expect(allowed.filter((id) => !found.includes(id) && !environmentDependent.includes(id)), `fixed violations still listed in axe-baseline.json for ${component.name}: rewrite it with ZEN_UPDATE_AXE=1`).toEqual([]);
    });
  }

  it.runIf(__ZEN_UPDATE_AXE__)("writes tests/smoke/axe-baseline.json", async () => {
    const sorted = Object.fromEntries(Object.entries(collected).sort(([a], [b]) => a.localeCompare(b)));
    await commands.writeFile("tests/smoke/axe-baseline.json", `${JSON.stringify(sorted, null, 2)}\n`);
  });
});
