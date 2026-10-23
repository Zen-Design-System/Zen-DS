import { createContext, createElement, useContext, useMemo, type ReactNode } from "react";
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

/**
 * A frame's own modes (Figma's Change variable mode on a frame; Studio Variables v2, user 2026-10-23): ZenProvider's
 * axes set on a Stack, Grid or Box. Unset keys inherit.
 */
export type ZenModes = {
  theme?: "light" | "dark";
  componentTheme?: ZenComponentTheme;
  density?: ZenDensity;
  radius?: ZenRadius;
  emphasis?: ZenEmphasis;
  breakpoint?: Exclude<ZenBreakpoint, "auto">;
  typography?: ZenTypography;
  brand?: ZenBrand;
};

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

/**
 * A frame's mode scope: its data-* attributes (tokens.css re-resolves the variables there) and `wrap(children)`, which
 * gives the children the ZenProvider context with these modes (components that read the breakpoint or theme from it see
 * the frame's). Nothing is rendered or wrapped without modes.
 */
export function useModeScope(modes: ZenModes | undefined): { attributes: Record<string, string>; wrap: (children: ReactNode) => ReactNode } {
  const parent = useContext(ZenContext);
  const key = modes ? JSON.stringify(modes) : "";
  return useMemo(() => {
    const own = (Object.keys(zenModeAttributes) as Array<keyof ZenModes>).flatMap((axis) => (typeof modes?.[axis] === "string" ? [[axis, modes[axis] as string] as const] : []));
    if (!own.length) return { attributes: {}, wrap: (children: ReactNode) => children };
    const attributes: Record<string, string> = Object.fromEntries(own.map(([axis, value]) => [zenModeAttributes[axis], value]));
    const value: ZenContextValue = { ...(parent ?? {}), ...Object.fromEntries(own) };
    return { attributes, wrap: (children: ReactNode) => createElement(ZenContext.Provider, { value }, children) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is `modes` by value
  }, [key, parent]);
}
