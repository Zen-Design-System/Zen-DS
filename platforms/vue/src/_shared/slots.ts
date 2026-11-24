import { Comment, Fragment, Text, isVNode, type VNodeChild } from "vue";

/*
 * Slots as React's `children`: what a component tests before drawing a part (`children ? … : null`) and the text of a
 * text-only label (`typeof children === "string"`).
 */

/** The slot's content, or undefined when it renders nothing but comments and blank text. */
export function slotContent(slot: (() => VNodeChild) | undefined): VNodeChild | undefined {
  const nodes = slot?.();
  return nodes && hasContent(nodes) ? nodes : undefined;
}

/** True when the nodes render something (not only comments, empty fragments or empty text). */
export function hasContent(nodes: VNodeChild): boolean {
  if (nodes === null || nodes === undefined || typeof nodes === "boolean") return false;
  if (typeof nodes === "string") return nodes !== "";
  if (typeof nodes === "number") return true;
  if (Array.isArray(nodes)) return nodes.some(hasContent);
  if (!isVNode(nodes)) return true;
  if (nodes.type === Comment) return false;
  if (nodes.type === Text) return typeof nodes.children === "string" && nodes.children !== "";
  if (nodes.type === Fragment) return hasContent(nodes.children as VNodeChild);
  return true;
}

/** The text of content made only of text (React's string or number children), else undefined. */
export function slotText(nodes: VNodeChild): string | undefined {
  if (typeof nodes === "string" || typeof nodes === "number") return String(nodes);
  if (Array.isArray(nodes)) {
    const parts = nodes.filter((node) => !(isVNode(node) && node.type === Comment)).map(slotText);
    return parts.length && parts.every((part) => part !== undefined) ? parts.join("") : undefined;
  }
  if (isVNode(nodes) && nodes.type === Text) return String(nodes.children ?? "");
  if (isVNode(nodes) && nodes.type === Fragment) return slotText(nodes.children as VNodeChild);
  return undefined;
}
