// Figma's Add / Remove auto layout as one code change (Zen Studio, 2026-10-17; research
// docs/research/studio-figma-native-parity-2026-10-17.md P2): a frame's element is written again with another tag and
// props, its layers keep their own code (children, text, other props) and only lose or gain the props the plan names.
// The result is one JSX element at column 0 (op replaceElement indents it where it lands), so the change is one ⌘Z.
// Isomorphic (browser engine and Node); relayout.selftest.mjs runs it.
//
//   relayoutCode(text, { start, end }, plan) → code
//   plan = { tag, set?: { prop: value }, remove?: [prop], children?: [{ set?, remove?, float? }] (element children in
//            source order; float: { set } puts a layer that cannot float itself in a Box with those props, the Ignore
//            auto layout wrapper of position/float.ts; unwrap: true gives such a wrapper's layer back), order?: [index] (their new order), wrap?: { tag, set? } (a
//            container around the layers inside) }
//   value: a string ("row" → prop="row"), a number (40 → prop={40}), true (a bare prop) or { code } (prop={code}).
// Text or code among the layers (a .map, a condition, words) is refused: their place cannot be laid out by a plan.
import { parseExpression } from "@babel/parser";

const nameOf = (name) => (name.type === "JSXIdentifier" ? name.name : name.type === "JSXNamespacedName" ? `${name.namespace.name}:${name.name.name}` : `${nameOf(name.object)}.${name.property.name}`);

/** The attribute text for `value`. */
function attrText(prop, value) {
  if (value === true) return prop;
  if (typeof value === "number") return `${prop}={${Math.round(value * 100) / 100}}`;
  if (typeof value === "string") return `${prop}=${JSON.stringify(value)}`;
  if (value && typeof value.code === "string") return `${prop}={${value.code}}`;
  throw new Error(`relayout: no value for ${prop}`);
}

/** An opening tag written again: `tag`, its attributes but the removed and the replaced ones, then the set ones. */
function openingText(source, opening, offset, tag, { set = {}, remove = [] } = {}, close = false) {
  const drop = new Set([...remove, ...Object.keys(set)]);
  const kept = opening.attributes
    .filter((attr) => attr.type === "JSXSpreadAttribute" || !drop.has(nameOf(attr.name)))
    .map((attr) => source.slice(attr.start - offset, attr.end - offset));
  const added = Object.entries(set).filter(([, value]) => value !== undefined && value !== null && value !== false).map(([prop, value]) => attrText(prop, value));
  const attrs = [...kept, ...added];
  return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}${close ? " />" : ">"}`;
}

/** `code`'s later lines without the indentation its first line had in `text` (at `start`). */
function dedent(text, start, code) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart, start))[0];
  return code.split("\n").map((line, index) => (index && line.startsWith(indent) ? line.slice(indent.length) : line)).join("\n");
}

const indentBy = (code, pad) => code.split("\n").map((line) => (line ? `${pad}${line}` : line)).join("\n");

export function relayoutCode(text, range, plan) {
  const source = String(text).slice(range.start, range.end).replace(/\r\n|\r/g, "\n");
  // Nothing to change (⌥⌘B Detach writes a main's layer as it is): the element at column 0, whatever it holds (a Text's
  // words too).
  if (!Object.keys(plan ?? {}).length) return dedent(String(text), range.start, source);
  const root = parseExpression(source, { plugins: ["jsx", "typescript"] });
  if (root.type !== "JSXElement") throw new Error("relayout: not one JSX element");
  const layers = [];
  for (const child of root.children) {
    if (child.type === "JSXText") {
      if (child.value.trim()) throw new Error("The frame holds text of its own: put it in a Text layer first");
      continue;
    }
    if (child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression") continue;
    if (child.type !== "JSXElement") throw new Error("The frame holds a list or code (a .map, a condition): lay it out in the code");
    layers.push(child);
  }
  const plans = plan.children ?? [];
  const written = layers.map((layer, index) => {
    const own = plans[index] ?? {};
    // A float wrapper (a Box that only floats one layer) gives its layer back, as Ignore auto layout off does.
    if (own.unwrap) {
      const inner = layer.children.filter((child) => child.type === "JSXElement");
      if (inner.length !== 1) throw new Error("relayout: a wrapper to unwrap holds one layer");
      return dedent(source, inner[0].start, source.slice(inner[0].start, inner[0].end));
    }
    const tag = nameOf(layer.openingElement.name);
    const self = layer.openingElement.selfClosing;
    const open = openingText(source, layer.openingElement, 0, tag, own, self);
    const rest = self ? "" : source.slice(layer.openingElement.end, layer.end);
    const code = dedent(source, layer.start, open + rest);
    if (!own.float) return code;
    const floatAttrs = Object.entries(own.float.set ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== false).map(([prop, value]) => attrText(prop, value));
    return `<Box${floatAttrs.length ? ` ${floatAttrs.join(" ")}` : ""}>\n${indentBy(code, "  ")}\n</Box>`;
  });
  const order = plan.order ?? written.map((_, index) => index);
  if (order.length !== written.length || new Set(order).size !== order.length) throw new Error("relayout: the order must name every layer once");
  const ordered = order.map((index) => written[index]);
  const tag = plan.tag ?? nameOf(root.openingElement.name);
  const wrapAttrs = plan.wrap ? Object.entries(plan.wrap.set ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== false).map(([prop, value]) => attrText(prop, value)) : [];
  const wrapOpen = plan.wrap ? `<${plan.wrap.tag}${wrapAttrs.length ? ` ${wrapAttrs.join(" ")}` : ""}` : "";
  // An empty frame: itself, or with its empty container (a painted frame keeps its Box and still takes auto layout).
  if (!ordered.length) return plan.wrap ? `${openingText(source, root.openingElement, 0, tag, plan)}\n  ${wrapOpen} />\n</${tag}>` : openingText(source, root.openingElement, 0, tag, plan, true);
  let body = ordered.map((code) => indentBy(code, "  ")).join("\n");
  if (plan.wrap) body = `  ${wrapOpen}>\n${indentBy(body, "  ")}\n  </${plan.wrap.tag}>`;
  return `${openingText(source, root.openingElement, 0, tag, plan)}\n${body}\n</${tag}>`;
}
