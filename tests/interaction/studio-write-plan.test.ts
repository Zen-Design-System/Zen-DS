/**
 * Zen Studio inspector writes keep a component's behaviour (src/platform/studio/inspector/writePlan.ts; user, 2026-10-05:
 * "Các component vẫn giữ đúng behavior của nó dù có chỉnh sửa variant và bật tắt boolean"): a state binding edits its
 * useState initializer, an uncontrolled state prop writes its defaultX twin, a boolean switched off is removed unless its
 * default is true.
 */
import { describe, expect, it } from "vitest";
import { displayValueOf, isTwinRow, planPropReset, planPropWrite, restorableBinding, restoreStep, savedWrite, stateTwinOf } from "../../src/platform/studio/inspector/writePlan";
import type { SourceAttr } from "../../src/platform/studio/types";

const bound = (name: string, variable: string, value: string | number | boolean): SourceAttr => ({ name, kind: "expression", value: variable, raw: `${name}={${variable}}`, line: 9, state: { name: variable, value, line: 2 } });
const literal = (name: string, value: string | boolean): SourceAttr => (value === true ? { name, kind: "true", raw: name, line: 9 } : typeof value === "string" ? { name, kind: "string", value, raw: `${name}="${value}"`, line: 9 } : { name, kind: "expression", value: String(value), raw: `${name}={${value}}`, line: 9 });

describe("Studio write plan: a state binding edits its initial state", () => {
  it("shows and edits the useState literal, never the binding", () => {
    const attrs = [bound("checked", "agree", false)];
    expect(displayValueOf("Checkbox", attrs, "checked", undefined)).toMatchObject({ state: "literal", value: false });
    expect(planPropWrite("Checkbox", attrs, "checked", true).ops).toEqual([{ op: "setStateInit", name: "checked", value: { kind: "boolean", value: true } }]);
    expect(planPropWrite("Checkbox", attrs, "checked", false).ops).toEqual([]);
    expect(planPropWrite("Tabs", [bound("value", "tab", "all")], "value", "unread").ops).toEqual([{ op: "setStateInit", name: "value", value: { kind: "string", value: "unread" } }]);
  });

  it("resets the initial state to the default, keeping the binding", () => {
    expect(planPropReset("Checkbox", [bound("checked", "agree", true)], "checked").ops).toEqual([{ op: "setStateInit", name: "checked", value: { kind: "boolean", value: false } }]);
    expect(planPropReset("Checkbox", [bound("checked", "agree", false)], "checked").ops).toEqual([]);
  });
});

describe("Studio write plan: an uncontrolled state prop writes its defaultX twin", () => {
  it("knows the twins and hides their rows", () => {
    expect([stateTwinOf("Checkbox", "checked"), stateTwinOf("Tabs", "value"), stateTwinOf("Accordion", "expanded"), stateTwinOf("Button", "level")]).toEqual(["defaultChecked", "defaultValue", "defaultExpanded", null]);
    expect([isTwinRow("Checkbox", "defaultChecked"), isTwinRow("Checkbox", "checked"), isTwinRow("Button", "defaultValue")]).toEqual([true, false, false]);
  });

  it("writes defaultChecked, and removes it at its default", () => {
    expect(planPropWrite("Checkbox", [], "checked", true)).toEqual({ ops: [{ op: "setProp", name: "defaultChecked", value: { kind: "boolean", value: true } }], note: "defaultChecked" });
    const on = [literal("defaultChecked", true)];
    expect(displayValueOf("Checkbox", on, "checked", undefined)).toMatchObject({ state: "literal", value: true });
    expect(planPropWrite("Checkbox", on, "checked", false).ops).toEqual([{ op: "removeProp", name: "defaultChecked" }]);
    // Toggle documents no default for defaultChecked: false is still the unset state.
    expect(planPropWrite("Toggle", [literal("defaultChecked", true)], "checked", false).ops).toEqual([{ op: "removeProp", name: "defaultChecked" }]);
  });

  it("moves a locking literal checked to defaultChecked", () => {
    expect(planPropWrite("Checkbox", [literal("checked", true)], "checked", false).ops).toEqual([{ op: "removeProp", name: "checked" }]);
    expect(planPropWrite("Checkbox", [literal("checked", false)], "checked", true).ops).toEqual([{ op: "removeProp", name: "checked" }, { op: "setProp", name: "defaultChecked", value: { kind: "boolean", value: true } }]);
  });
});

describe("Studio write plan: a boolean switched off", () => {
  it("is removed when its default is false or unset", () => {
    expect(planPropWrite("Button", [literal("disabled", true)], "disabled", false).ops).toEqual([{ op: "removeProp", name: "disabled" }]);
    // collapsed={false} would still override the scroll-linked fold: off removes it.
    expect(planPropWrite("TopNavigation", [literal("collapsed", true)], "collapsed", false).ops).toEqual([{ op: "removeProp", name: "collapsed" }]);
    expect(planPropWrite("Button", [], "disabled", false).ops).toEqual([]);
  });

  it("is written as false when its default is true", () => {
    expect(planPropWrite("Badge", [], "leadingIcon", false).ops).toEqual([{ op: "setProp", name: "leadingIcon", value: { kind: "boolean", value: false } }]);
  });

  it("is written as true when switched on", () => {
    expect(planPropWrite("Button", [], "disabled", true).ops).toEqual([{ op: "setProp", name: "disabled", value: { kind: "boolean", value: true } }]);
  });
});

/*
 * Nested booleans (session "Nested boolean không hoạt động", 2026-10-05): a boolean switched back to a default of true
 * leaves no attribute, a data binding takes a fixed value, and a reset restores the saved binding.
 */
describe("Studio write plan: nested booleans", () => {
  it("removes a boolean switched back on when its default is true", () => {
    expect(planPropWrite("Badge", [literal("leadingIcon", false)], "leadingIcon", true).ops).toEqual([{ op: "removeProp", name: "leadingIcon" }]);
    expect(planPropWrite("Badge", [], "leadingIcon", true).ops).toEqual([]);
  });

  it("gives a data binding a fixed value, and removes it when switched off", () => {
    const online: SourceAttr = { name: "status", kind: "expression", value: "one.online", raw: "status={one.online}", line: 9, origin: { kind: "bound-value", reads: ["one"] } };
    expect(planPropWrite("Avatar", [online], "status", true).ops).toEqual([{ op: "setProp", name: "status", value: { kind: "boolean", value: true } }]);
    expect(planPropWrite("Avatar", [online], "status", false).ops).toEqual([{ op: "removeProp", name: "status" }]);
  });

  it("gives a data-bound state prop's fixed value to its defaultX twin, and a restore takes the twin away", () => {
    const done: SourceAttr = { name: "checked", kind: "expression", value: "row.done", raw: "checked={row.done}", line: 9, origin: { kind: "loop-bound", reads: ["row"] } };
    expect(planPropWrite("Checkbox", [done], "checked", true)).toEqual({ ops: [{ op: "removeProp", name: "checked" }, { op: "setProp", name: "defaultChecked", value: { kind: "boolean", value: true } }], note: "defaultChecked" });
    const drafted = { file: "x.tsx", loc: "9:4", name: "Checkbox", startLine: 9, endLine: 9, attributes: [literal("defaultChecked", true)], children: [], typography: [], hash: "h", savedAttributes: { checked: done, defaultChecked: null } };
    // One request at a time, each read from the file as it is then: the twin goes, then the saved attribute returns.
    expect(restoreStep("Checkbox", drafted, "checked", done, false)).toEqual([{ op: "removeProp", name: "defaultChecked" }]);
    expect(restoreStep("Checkbox", { ...drafted, attributes: [] }, "checked", done, false)).toEqual([{ op: "resetSlot", prop: "checked" }]);
    expect(restoreStep("Checkbox", { ...drafted, attributes: [] }, "checked", done, true)).toEqual([{ op: "setProp", name: "checked", value: { kind: "expression", code: "row.done" } }]);
    expect(restoreStep("Checkbox", { ...drafted, attributes: [done] }, "checked", done, false)).toEqual([]);
  });

  it("restores the saved binding after a fixed value replaced it", () => {
    const saved: SourceAttr = { name: "status", kind: "expression", value: "one.online", raw: "status={one.online}", line: 9 };
    const element = { file: "x.tsx", loc: "9:4", name: "Avatar", startLine: 9, endLine: 9, attributes: [literal("status", true)], children: [], typography: [], hash: "h", savedAttributes: { status: saved } };
    expect(restorableBinding(element, "status")).toEqual(saved);
    expect(restoreStep("Avatar", element, "status", saved, false)).toEqual([{ op: "resetSlot", prop: "status" }]);
    expect(restorableBinding({ ...element, attributes: [saved] }, "status")).toBeNull();
    expect(restorableBinding({ ...element, savedAttributes: { status: literal("status", true) } }, "status")).toBeNull();
  });

  it("puts a saved attribute back where it was when a switch returns to its saved value", () => {
    const base = { file: "x.tsx", loc: "9:4", name: "TableText", startLine: 9, endLine: 9, children: [], typography: [], hash: "h" };
    const off = { ...base, attributes: [literal("caption", "c")], savedAttributes: { bold: literal("bold", true) } };
    expect(savedWrite("TableText", off, "bold", true)).toEqual({ ops: [{ op: "resetSlot", prop: "bold" }] });
    expect(savedWrite("TableText", off, "bold", false)).toBeNull();
    expect(savedWrite("TableText", { ...off, attributes: [literal("bold", true)] }, "bold", true)).toBeNull();
    expect(savedWrite("TableText", { ...base, attributes: [] }, "bold", true)).toBeNull();
  });
});
