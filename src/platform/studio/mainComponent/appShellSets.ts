import { APPSHELL_DESKTOP_VARIANTS, APPSHELL_MOBILE_VARIANTS, appShellPlaceholderCode } from "../../../../tools/studio/appshell-placeholder.mjs";
import type { VariantAxis, VariantSet } from "./variantSets.generated";

/*
 * The AppShell's own Figma sets in the Main component frame (user 2026-10-26: an AppShell is a placeholder frame, as the
 * ◇ Master-Layout components are). Pattern/AppShell/Desktop has nine of its Layout × Collapse combinations and
 * Pattern/AppShell/Mobile varies by part, not by prop (its Bottom is a Tab-Bar, a floating bar, an Action bar or none),
 * so both are drawn from each variant's own code (tools/studio/appshell-placeholder.mjs), in the screen Figma draws
 * it in, as Figma lists them.
 */

/** A set the variant grid cannot draw from one sample and its props. */
export type MainSet = VariantSet & {
  /** Figma's own variants (a set without every combination of its axes), drawn in its order, `wrap` to a row. */
  variants?: readonly Readonly<Record<string, string>>[];
  wrap?: number;
  /** The code of one variant. */
  code?: (variant: Readonly<Record<string, string>>) => string;
  /** The screen a variant is drawn in (px): an AppShell fills it, as a Figma frame does. */
  screen?: (variant: Readonly<Record<string, string>>) => { width: number; height: number };
};

const axis = (prop: string, label: string, options: ReadonlyArray<readonly [string, string]>): VariantAxis => ({
  prop, label, names: options.map(([, name]) => name), values: options.map(([value]) => value), default: options[0][0],
});

/** Figma's frame sizes: the 1512 × 982 desktop, the iPhone 390 × 844 and the iPad portrait 744 × 1133. */
const DESKTOP = { width: 1512, height: 982 };
const DEVICES: Readonly<Record<string, { width: number; height: number }>> = { phone: { width: 390, height: 844 }, tablet: { width: 744, height: 1133 } };

export const MAIN_SETS: Readonly<Record<string, readonly MainSet[]>> = {
  AppShell: [
    {
      name: "Pattern/AppShell/Desktop", figma: "16258:1857", fixed: {}, toggles: [],
      axes: [
        axis("pattern", "Layout", [["sidebar", "Sidebar"], ["list-detail", "List-Detail"], ["top-bar", "Top-Bar"], ["workspace", "Workspace"], ["docs", "Docs"], ["focus", "Focus"], ["grid", "Grid"]]),
        axis("collapse", "Collapse", [["header", "Header"], ["sidebar", "Sidebar"], ["none", "None"]]),
      ],
      variants: APPSHELL_DESKTOP_VARIANTS.map(({ pattern, collapse }) => ({ pattern, collapse })),
      wrap: 4,
      code: (variant) => appShellPlaceholderCode({ pattern: variant.pattern as never, collapse: variant.collapse as never }),
      screen: () => DESKTOP,
    },
    {
      name: "Pattern/AppShell/Mobile", figma: "16261:136204", fixed: {}, toggles: [],
      axes: [
        axis("device", "Device", [["phone", "Phone"], ["tablet", "Tablet"]]),
        axis("mobileTop", "Top", [["bar", "Bar"], ["band", "Band"], ["band-sheet", "Band-Sheet"], ["media", "Media"]]),
        axis("bottom", "Bottom", [["tab-bar", "Tab-Bar"], ["floating", "Floating"], ["actions", "Actions"], ["none", "None"]]),
      ],
      variants: APPSHELL_MOBILE_VARIANTS.map(({ device, top, bottom }) => ({ device, mobileTop: top, bottom })),
      wrap: 8,
      code: (variant) => appShellPlaceholderCode({ desktop: false, mobile: { top: variant.mobileTop as never, bottom: variant.bottom as never } }),
      screen: (variant) => DEVICES[variant.device] ?? DEVICES.phone,
    },
  ],
};

/** The listed variant closest to `variant` after one property changed to `prop` = `value`: the most properties kept. */
export function nearestVariant(set: MainSet, variant: Readonly<Record<string, string>>, prop: string): Readonly<Record<string, string>> {
  if (!set.variants) return variant;
  const candidates = set.variants.filter((item) => item[prop] === variant[prop]);
  const score = (item: Readonly<Record<string, string>>) => Object.keys(item).filter((key) => item[key] === variant[key]).length;
  return candidates.reduce<Readonly<Record<string, string>> | null>((best, item) => (!best || score(item) > score(best) ? item : best), null) ?? variant;
}
