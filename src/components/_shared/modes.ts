/*
 * A frame's own variable modes (Figma's Change variable mode on a frame; Studio Variables v2, user 2026-10-23): the
 * ZenProvider axes a Stack, Grid or Box sets with `modes`. Framework-free (the web core, src/core); React's scope that
 * also hands them to the children as context is useModeScope in zen-context.ts.
 */

/** The data-* attribute tokens.css reads for each axis (as ZenProvider writes them). */
export const zenModeAttributes = {
  theme: "data-theme",
  componentTheme: "data-component-theme",
  density: "data-density",
  radius: "data-radius",
  emphasis: "data-emphasis",
  breakpoint: "data-breakpoint",
  typography: "data-typography",
  brand: "data-brand",
} as const;
export type ZenModeAxis = keyof typeof zenModeAttributes;

/**
 * The axes a frame sets (a string value each; unset ones inherit) and their data-* attributes, or null when it sets
 * none: then nothing is written and the children keep their parent's context.
 */
export function frameModeScope<M extends Partial<Record<ZenModeAxis, unknown>>>(modes: M | undefined): { own: Partial<M>; attributes: Record<string, string> } | null {
  const own = (Object.keys(zenModeAttributes) as ZenModeAxis[]).flatMap((axis) => (typeof modes?.[axis] === "string" ? [[axis, modes[axis] as string] as const] : []));
  if (!own.length) return null;
  return { own: Object.fromEntries(own) as Partial<M>, attributes: Object.fromEntries(own.map(([axis, value]) => [zenModeAttributes[axis], value])) };
}
