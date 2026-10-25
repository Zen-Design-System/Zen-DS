/** Zen's three breakpoints (token modes): mobile < 744, tablet 744–1023, desktop ≥ 1024 (ZenProvider). */
export type ResponsiveBreakpoint = "desktop" | "tablet" | "mobile";

/**
 * A prop value for every breakpoint, or one per breakpoint (`{ desktop: "row", mobile: "column" }`, the Grid `columns`
 * shape). A breakpoint without its own value takes the next wider one's (desktop → tablet → mobile).
 */
export type Responsive<T> = T | { desktop?: T; tablet?: T; mobile?: T };

/** Where each breakpoint looks: its own key, then the wider ones; a narrower key only when no wider one is set. */
const lookup: Record<ResponsiveBreakpoint, readonly ResponsiveBreakpoint[]> = {
  desktop: ["desktop", "tablet", "mobile"],
  tablet: ["tablet", "desktop", "mobile"],
  mobile: ["mobile", "tablet", "desktop"],
};

/** Whether `value` is the per-breakpoint object, not a plain value (an array, as `hideOn`, is plain). */
export function isPerBreakpoint<T>(value: Responsive<T> | undefined): value is { desktop?: T; tablet?: T; mobile?: T } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The value of a responsive prop at `breakpoint` (desktop when unknown: outside any ZenProvider). A plain value is the
 * same everywhere; an object takes the breakpoint's key, else the next wider one's.
 */
export function resolveAt<T>(value: Responsive<T> | undefined, breakpoint: ResponsiveBreakpoint | undefined): T | undefined {
  if (!isPerBreakpoint(value)) return value;
  const key = lookup[breakpoint ?? "desktop"].find((at) => value[at] !== undefined);
  return key ? value[key] : undefined;
}
