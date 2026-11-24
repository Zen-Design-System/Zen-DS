import { Fragment, camelize, isVNode, type VNodeChild } from "vue";

/*
 * Figma list slots as children (React: _shared/slots.ts slotItems). A list component reads its items from its array
 * prop or, when that is not given, from children of its item component: `<Stepper><StepperStep id="a" title="Account"
 * /></Stepper>`. The children are declarations, read for their props; the list draws them.
 */

/** The props of each `Item` vnode in the slot's content, in order (fragments flattened); `key` comes as `slotKey`. */
export function slotItems<P extends object>(nodes: VNodeChild, Item: unknown): Array<P & { slotKey?: string }> {
  const out: Array<P & { slotKey?: string }> = [];
  const walk = (node: VNodeChild) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!isVNode(node)) return;
    if (node.type === Fragment) { walk(node.children as VNodeChild); return; }
    if (node.type !== Item) return;
    // Templates may write props kebab-case (`slot-key`); the item reads them camelCase, as Vue's own props do.
    const props = Object.fromEntries(Object.entries(node.props ?? {}).map(([key, value]) => [camelize(key), value === "" ? true : value]));
    out.push({ ...(props as P), slotKey: node.key === null ? undefined : String(node.key) });
  };
  walk(nodes);
  return out;
}
