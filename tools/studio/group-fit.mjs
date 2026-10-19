// Zen Studio group fit (plan docs/research/studio-figma-design-parity-2026-10-18.md decision 3): a Box group hugs its
// layers as Figma's Group does. After an edit moves or resizes a layer inside a group, the group's box becomes the box
// around its layers again and each layer's X / Y is written from the group's new corner, so nothing moves on the canvas.
// Pure (no DOM): builder/localApi.ts runs it after every edit of a page you made, in the same write (one ⌘Z).
//
//   planGroups(text, { components }) → [{ loc, name: "Box", ops: [op many setProps] }]: the first group that does not hug
//                                      its layers, as the edit that fits it; [] when every group fits
//
// A group whose layers are not all at px X / Y with px sizes (a token inset, a Fill size) is left as it is, as is a
// turned or flipped group (its corner is not where its layers' box starts). Inner groups come first.

import { parsePage } from "./dialect.mjs";

const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const round2 = (value) => Math.round(value * 100) / 100;
const literals = (node) => Object.fromEntries(Object.entries(node.props ?? {}).filter(([, value]) => value?.kind === "literal").map(([name, value]) => [name, value.value]));
const locOf = (node) => node.loc;
const set = (name, value) => ({ op: "setProp", name, value: { kind: "number", value } });

function* groups(node) {
  for (const child of node.children ?? []) {
    if (child.kind !== "element") continue;
    yield* groups(child);
    if (child.name === "Box" && child.props?.group?.kind === "literal" && child.props.group.value === true) yield child;
  }
}

export function planGroups(text, { components } = {}) {
  const tree = parsePage(text, { components });
  if (!tree.board) return [];
  for (const group of groups(tree.board)) {
    const own = literals(group);
    const width = num(own.width);
    const height = num(own.height);
    if (width === null || height === null || (num(own.rotation) ?? 0) % 360 !== 0 || own.flip) continue;
    const layers = (group.children ?? []).filter((child) => child.kind === "element");
    if (!layers.length) continue;
    const boxes = layers.map((layer) => {
      const props = literals(layer);
      const box = { x: num(props.insetLeft), y: num(props.insetTop), width: num(props.width), height: num(props.height) };
      return Object.values(box).every((value) => value !== null) ? { layer, ...box } : null;
    });
    if (boxes.some((box) => !box)) continue;
    const left = Math.min(...boxes.map((box) => box.x));
    const top = Math.min(...boxes.map((box) => box.y));
    const right = Math.max(...boxes.map((box) => box.x + box.width));
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));
    if (Math.abs(left) < 0.01 && Math.abs(top) < 0.01 && Math.abs(right - width) < 0.01 && Math.abs(bottom - height) < 0.01) continue;
    const opsByLoc = { [locOf(group)]: [set("width", round2(right - left)), set("height", round2(bottom - top))] };
    // The group's own X / Y follows its layers' corner (a group in a frame without auto layout; in a flow it has none).
    if (left && num(own.insetLeft) !== null) opsByLoc[locOf(group)].push(set("insetLeft", round2(own.insetLeft + left)));
    if (top && num(own.insetTop) !== null) opsByLoc[locOf(group)].push(set("insetTop", round2(own.insetTop + top)));
    for (const box of boxes) {
      const ops = [];
      if (left) ops.push(set("insetLeft", round2(box.x - left)));
      if (top) ops.push(set("insetTop", round2(box.y - top)));
      if (ops.length) opsByLoc[locOf(box.layer)] = ops;
    }
    return [{ loc: locOf(group), name: "Box", ops: [{ op: "many", action: "setProps", locs: Object.keys(opsByLoc), opsByLoc }] }];
  }
  return [];
}
