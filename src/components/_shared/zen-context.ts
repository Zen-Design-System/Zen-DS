import { createContext, useContext } from "react";
import type { ZenBrand, ZenBreakpoint, ZenComponentTheme, ZenDensity, ZenEmphasis, ZenRadius, ZenTypography } from "../Provider/ZenProvider";
import { resolveZenLabels, type ZenLabelOverrides, type ZenLabels } from "./labels";

/**
 * The ZenProvider context, in its own module so components can read the modes, locale and labels without importing
 * ZenProvider itself (which imports Toast, Portal… — importing it from those would be a cycle).
 */
export interface ZenContextValue {
  /** Resolved colour mode (`system` already resolved). Undefined when inherited from outside any provider. */
  theme?: "light" | "dark";
  componentTheme?: ZenComponentTheme;
  density?: ZenDensity;
  radius?: ZenRadius;
  emphasis?: ZenEmphasis;
  breakpoint?: Exclude<ZenBreakpoint, "auto">;
  typography?: ZenTypography;
  brand?: ZenBrand;
  /** Resolved contrast (`system` already resolved). Undefined when inherited from outside any provider. */
  contrast?: "standard" | "high";
  locale?: string;
  /** Built-in component text for `locale`, with the providers' `labels` overrides. */
  labels?: ZenLabels;
  /** The `labels` overrides of this provider and its ancestors. */
  labelOverrides?: ZenLabelOverrides;
}

export const ZenContext = createContext<ZenContextValue | null>(null);

/** The modes of the nearest ZenProvider (merged with its ancestors), or null outside any provider. */
export function useZen(): ZenContextValue | null {
  return useContext(ZenContext);
}

const defaultLabels = resolveZenLabels();
/** Built-in UI text of Zen components for the nearest provider's `locale` (English outside any provider). */
export function useZenLabels(): ZenLabels {
  return useContext(ZenContext)?.labels ?? defaultLabels;
}

/** The nearest provider's BCP 47 locale for Intl formatting (dates, numbers); `en-US` outside any provider. */
export function useZenLocale(): string {
  return useContext(ZenContext)?.locale ?? "en-US";
}
