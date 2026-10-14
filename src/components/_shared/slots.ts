import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";

/*
 * Figma list slots as children (user, 2026-10-09: every component has Figma's slots; lists take children of their own
 * item component AND keep their arrays). A list component reads its items either from its array prop or, when that is
 * not given, from children of its item component: `<Tabs><TabItem value="general" label="General" /></Tabs>`. The
 * parent still owns selection, keyboard and layout, so the children are declarations, read for their props.
 */

/**
 * The props of each `Item` element in `children`, in order. Fragments and arrays are flattened; `null`, `false` and
 * anything that is not an `Item` element are skipped. `key` is passed as `slotKey` (a fallback id).
 */
export function slotItems<P extends object>(children: ReactNode, Item: (props: P) => unknown): Array<P & { slotKey?: string }> {
  const out: Array<P & { slotKey?: string }> = [];
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (node) => {
      if (!isValidElement(node)) return;
      const element = node as ReactElement<P & { children?: ReactNode }>;
      if (element.type === Fragment) { walk(element.props.children); return; }
      if (element.type !== Item) return;
      const key = element.key === null ? undefined : String(element.key);
      out.push({ ...element.props, slotKey: key });
    });
  };
  walk(children);
  return out;
}
