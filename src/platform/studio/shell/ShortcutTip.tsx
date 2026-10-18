import type { ReactNode } from "react";

/**
 * A tooltip as Figma writes it: the name, then its keys in the lighter colour ("Move V", "Add auto layout ⇧A"). One
 * shape for every tooltip with a shortcut (UX writing audit 2026-10-18: five shapes were in use).
 */
export function ShortcutTip({ label, keys }: { label: ReactNode; keys?: string }) {
  if (!keys) return <>{label}</>;
  return <span className="studio-tip">{label}<span className="studio-tip__keys">{keys}</span></span>;
}

/** `ShortcutTip` as a value for a `tooltip` prop. */
export const tip = (label: ReactNode, keys?: string) => <ShortcutTip label={label} keys={keys} />;
