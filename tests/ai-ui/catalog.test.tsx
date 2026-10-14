/**
 * Every component of docs/ai-ui/catalog.json renders from a spec the catalog itself describes: the required props are
 * synthesised from their schemas (plus the smoke fixtures' JSON props where a value cannot be guessed), the spec
 * validates, and the element renders inside ZenProvider without a console error. A component the catalog admits but
 * the renderer cannot draw this way would fail here.
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ZenProvider } from "../../src/index";
import { AiUi, validateSpec, type Catalog, type PropSchema, type UiNode, type UiSpec, type UiValue } from "../../src/ai-ui/index";
import catalogJson from "../../docs/ai-ui/catalog.json";
import { fixtures } from "../smoke/fixtures";

const catalog = catalogJson as unknown as Catalog;
const resolve = (schema: PropSchema | undefined): PropSchema => (schema?.$ref ? catalog.$defs[schema.$ref.split("/").pop() ?? ""] ?? {} : schema ?? {});

/** A JSON value a schema accepts (required fields only for objects). */
function sample(raw: PropSchema | undefined, name: string, depth = 0): UiValue | undefined {
  const schema = resolve(raw);
  if (depth > 5) return undefined;
  switch (schema["x-kind"]) {
    case "node": return /label|title|header|children|caption|name|description/i.test(name) ? name === "children" ? "Sample content" : "Label" : "Sample";
    case "element": return { type: "Button", children: ["Trigger"] } as UiNode;
    case "icon": return "icon-check-line";
    case "date": return "2026-09-27";
    case "action": return { $action: `noop-${name}` };
    default: break;
  }
  if (schema.enum?.length) return schema.enum[0] as UiValue;
  if (schema.anyOf) { for (const branch of schema.anyOf) { const value = sample(branch, name, depth + 1); if (value !== undefined) return value; } return undefined; }
  switch (schema.type) {
    case "string": return /^(src|href|photo|url)/i.test(name) ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23c9d6e3'/%3E%3C/svg%3E" : /id$/i.test(name) ? "sample-id" : /label|name|title/i.test(name) ? "Label" : "Sample text";
    case "number": return 1;
    case "boolean": return false;
    case "array": { const item = sample(schema.items, name.replace(/s$/, ""), depth + 1); return item === undefined ? [] : [item]; }
    case "object": {
      const out: Record<string, UiValue> = {};
      for (const field of schema.required ?? []) { const value = sample(schema.properties?.[field], field, depth + 1); if (value !== undefined) out[field] = value; }
      return out;
    }
    default: return undefined;
  }
}

const jsonSafe = (value: unknown) => { try { return JSON.stringify(value) !== undefined && JSON.parse(JSON.stringify(value)) !== null && typeof value !== "function" && !(value && typeof value === "object" && "$$typeof" in (value as object)); } catch { return false; } };

describe("every catalog component renders from a spec", () => {
  for (const entry of Object.values(catalog.components)) {
    const fixture = fixtures[entry.name] ?? {};
    // Fixture props as JSON (functions dropped, a Date as its ISO string): what a spec could have said.
    const fixtureProps = Object.fromEntries(Object.entries(fixture.props ?? {}).filter(([, value]) => jsonSafe(value)).map(([name, value]) => [name, JSON.parse(JSON.stringify(value))]));
    const unknownFixtureProps = Object.keys(fixtureProps).filter((name) => !entry.props[name]);
    if (entry.status === "experimental") { it.skip(`${entry.name} — experimental: ${(entry.unavailable ?? []).join("; ") || "catalog.config.mjs"}`, () => undefined); continue; }
    if (fixture.skip) { it.skip(`${entry.name} — ${fixture.skip}`, () => undefined); continue; }
    if (fixture.wrap) { it.skip(`${entry.name} — needs its parent (covered by the smoke test)`, () => undefined); continue; }

    it(entry.name, async () => {
      const props: Record<string, UiValue> = {};
      for (const [name, schema] of Object.entries(entry.props)) {
        if (!schema["x-required"] || schema["x-kind"] === "action") continue;
        if (name in fixtureProps) continue;
        const value = sample(schema, name);
        expect(value, `${entry.name}.${name} (${JSON.stringify(schema).slice(0, 80)}) needs a fixture`).not.toBeUndefined();
        props[name] = value as UiValue;
      }
      for (const [name, value] of Object.entries(fixtureProps)) if (!unknownFixtureProps.includes(name)) props[name] = value as UiValue;
      const node: UiNode = { type: entry.name, id: "it", props };
      if (entry.props.children && !("children" in props)) node.children = ["Sample content"];
      const spec: UiSpec = { version: 1, root: node };
      const result = validateSpec(spec, catalog, { chrome: true, experimental: true, requireIds: "none" });
      expect(result.errors, `${JSON.stringify(result.errors, null, 1)}\nspec: ${JSON.stringify(spec)}`).toEqual([]);
      let screen: Awaited<ReturnType<typeof render>>;
      try { screen = await render(<ZenProvider><div style={{ width: 720 }}><div data-testid="host"><AiUi spec={spec} catalog={catalog} /></div></div></ZenProvider>); }
      catch (error) { throw new Error(`${entry.name} threw while rendering ${JSON.stringify(spec)}: ${error instanceof Error ? error.message : String(error)}`); }
      // The element renders (overlays into the portal); components that forward HTML attributes carry the node id.
      const host = screen.container.querySelector('[data-testid="host"]') as HTMLElement;
      await expect.poll(() => host.childNodes.length || document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length, { message: `nothing rendered for ${JSON.stringify(spec)}` }).toBeGreaterThan(0);
    });
  }
});
