/**
 * Conformance for every public component (Base UI `describeConformance`, React Aria and Radix test the same): it renders
 * under StrictMode, a `ref` reaches a DOM element, `className` lands in the DOM, and nothing stays behind after unmount,
 * so apps can measure, focus, style and test it like a native element.
 *
 * NO_REF lists components that have no single DOM root to hand out (providers, portals, wrappers that clone their child);
 * every other component puts a `ref` on its root.
 *
 * `style` on the root: Zen Studio gives an instance of the components that forward it Figma's layer opacity and blend
 * (tools/studio/instance-look.mjs STYLE_ON_ROOT). The list stays exact: a component that starts or stops forwarding
 * `style` to its root fails here until the list says so.
 */
import { StrictMode, createElement, createRef, type ComponentType, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import * as Zen from "../../src/index";
import { fixtures } from "./fixtures";
import { components, noop, synthesise } from "./api-components";
import { STYLE_ON_ROOT, STYLE_ON_ROOT_NOT_INSTANCES } from "../../tools/studio/instance-look.mjs";

const NO_REF: Record<string, string> = {
  ZenPortalProvider: "context provider",
  ToastProvider: "context provider",
  ZenPortal: "portal",
  Tooltip: "wraps its trigger (the trigger keeps its own ref)",
  Menu: "wraps its trigger (the trigger keeps its own ref)",
};
/** Props this test adds so the element that carries `className` exists (a menu's surface only renders while open). */
const OPEN: Record<string, Record<string, unknown>> = {
  Menu: { defaultOpen: true },
};

describe("every public component conforms", () => {
  for (const component of components) {
    const fixture = fixtures[component.name] ?? {};
    const Component = (Zen as Record<string, unknown>)[component.name] as ComponentType<Record<string, unknown>> | undefined;
    if (fixture.skip) { it.skip(`${component.name} — ${fixture.skip}`, noop); continue; }
    const documents = (name: string) => component.props.some((prop) => prop.name === name);

    it(component.name, async () => {
      const props: Record<string, unknown> = {};
      for (const prop of component.props.filter((p) => p.required)) {
        if (fixture.props && prop.name in fixture.props) continue;
        const value = synthesise(prop);
        if (value !== undefined) props[prop.name] = value;
      }
      Object.assign(props, fixture.props, OPEN[component.name]);
      const ref = createRef<Element>();
      props.ref = ref;
      if (documents("className")) props.className = "zen-conformance";
      props.style = { outlineOffset: "13px" };

      const element = createElement(Component!, props) as ReactElement;
      const content: ReactNode = fixture.wrap ? fixture.wrap(element) : element;
      const screen = await render(<StrictMode><Zen.ZenProvider breakpoint="desktop">{content}</Zen.ZenProvider></StrictMode>);
      await new Promise((resolve) => requestAnimationFrame(resolve));

      if (NO_REF[component.name]) {
        expect(ref.current, `${component.name} now hands out a ref: remove it from NO_REF`).toBeNull();
      } else {
        expect(ref.current, `${component.name}'s ref did not reach a DOM element (React 19: \`ref?: Ref<El>\` on its props, put on the root)`).toBeInstanceOf(Element);
        const styled = (ref.current as HTMLElement | null)?.style?.outlineOffset === "13px";
        const listed = STYLE_ON_ROOT.has(component.name) || STYLE_ON_ROOT_NOT_INSTANCES.has(component.name);
        expect(styled, styled
          ? `${component.name} now puts \`style\` on its root: add it to STYLE_ON_ROOT in tools/studio/instance-look.mjs`
          : `${component.name} no longer puts \`style\` on its root: take it out of STYLE_ON_ROOT in tools/studio/instance-look.mjs`).toBe(listed);
      }
      if (documents("className")) {
        expect(document.querySelector(".zen-conformance"), `${component.name} dropped className`).not.toBeNull();
      }
      await screen.unmount();
      // StrictMode mounts, unmounts and mounts again: nothing may stay behind once the component is gone.
      expect(document.querySelector(".zen-conformance"), `${component.name} left nodes in the page after unmount`).toBeNull();
    });
  }
});
