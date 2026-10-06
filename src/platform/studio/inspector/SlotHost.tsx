import { useCallback, useEffect, useState } from "react";

/**
 * Mounts a detached DOM node (a bridge slot the playground portals its controls or code into) inside the inspector
 * while rendered, and detaches it again on unmount so it never ends up in two places.
 */
export function SlotHost({ node, className }: { node: HTMLElement; className?: string }) {
  const attach = useCallback((host: HTMLDivElement | null) => {
    if (!host) return undefined;
    host.appendChild(node);
    return () => {
      if (node.parentNode === host) host.removeChild(node);
    };
  }, [node]);
  return <div ref={attach} className={className} />;
}

/** Whether a slot currently holds anything (the active playground portals into it, or not). */
export function useSlotFilled(node: HTMLElement | null): boolean {
  const [filled, setFilled] = useState(() => Boolean(node?.childElementCount));
  useEffect(() => {
    if (!node) {
      setFilled(false);
      return undefined;
    }
    const update = () => setFilled(node.childElementCount > 0);
    update();
    const observer = new MutationObserver(update);
    observer.observe(node, { childList: true });
    return () => observer.disconnect();
  }, [node]);
  return filled;
}
