import { useContext, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { ZenPortalProvider } from "../Portal";
import { ToastProvider } from "../Toast/ToastProvider";
import type { ToastPlacement } from "../Toast/ToastStack";
import { resolveZenLabels, type ZenLabelOverrides } from "../_shared/labels";
import { ZenContext, type ZenContextValue } from "../_shared/zen-context";

export { useZen, useZenLabels, useZenLocale, type ZenContextValue } from "../_shared/zen-context";
import "./provider.css";

/** Token mode axes (Figma variable modes). Each maps to a `data-*` attribute that tokens.css reads. */
export const zenThemes = ["light", "dark", "system"] as const;
export const zenComponentThemes = ["neutral-s1", "neutral-s2", "neutral-s3", "neutral-s4", "neutral-s5", "neutral-s6", "neutral-s7", "brand-s1", "brand-s2"] as const;
export const zenDensities = ["compact", "comfortable", "studio"] as const;
export const zenRadii = ["rounded", "smooth", "standard", "luxury", "studio"] as const;
export const zenEmphases = ["medium", "strong", "light"] as const;
export const zenBreakpoints = ["auto", "desktop", "tablet", "mobile"] as const;
export const zenTypographies = ["dashboard", "popular", "mobile", "studio"] as const;
export const zenBrands = ["zen"] as const;
/** Contrast (Global Colors mode Zen-High-Contrast). `system` follows the OS Increase Contrast setting (prefers-contrast: more). */
export const zenContrasts = ["standard", "high", "system"] as const;

export type ZenTheme = (typeof zenThemes)[number];
export type ZenComponentTheme = (typeof zenComponentThemes)[number];
export type ZenDensity = (typeof zenDensities)[number];
export type ZenRadius = (typeof zenRadii)[number];
export type ZenEmphasis = (typeof zenEmphases)[number];
export type ZenBreakpoint = (typeof zenBreakpoints)[number];
export type ZenTypography = (typeof zenTypographies)[number];
export type ZenBrand = (typeof zenBrands)[number];
export type ZenContrast = (typeof zenContrasts)[number];

export interface ZenProviderProps extends Omit<HTMLAttributes<HTMLElement>, "style" | "className" | "children" | "id"> {
  /** Colour mode. `system` follows the OS (prefers-color-scheme). Unset: inherit (the page default is light). */
  theme?: ZenTheme;
  /** Component colour theme (Figma "Component Theme" mode). Default neutral-s1. */
  componentTheme?: ZenComponentTheme;
  /** Spacing density. Default compact (dashboards); comfortable for touch-first or marketing layouts. */
  density?: ZenDensity;
  /** Corner-radius scale. Default rounded. */
  radius?: ZenRadius;
  /** Font weights and active stroke widths (Figma "Emphasis Level" mode). Default medium; light is lighter, strong heavier. */
  emphasis?: ZenEmphasis;
  /**
   * Layout tokens (page margin, gutter, modal/card padding). `auto` follows the viewport: < 744px mobile,
   * < 1024px tablet, else desktop. Default: `auto` on the outermost provider, inherited in nested ones.
   */
  breakpoint?: ZenBreakpoint;
  /** Text-style scale. dashboard (default) for web apps, mobile for phone apps, popular for marketing pages. */
  typography?: ZenTypography;
  brand?: ZenBrand;
  /**
   * Contrast. `high` raises the borders of Checkbox, Radio and Subtle controls to 3:1 and placeholders, Light text and
   * a colour's Light text to 4.5:1; step 9 of every colour, the backgrounds and the text on Solid fills stay.
   * `system` follows the OS Increase Contrast setting. Unset: inherit (the page default is standard).
   */
  contrast?: ZenContrast;
  /**
   * BCP 47 language of the content: sets `lang`, date formats, and the built-in labels of every Zen component
   * (accessible names, "Close", "Next page", toolbar tooltips…). Built in: en, vi. Unknown languages fall back to en.
   */
  locale?: string;
  /** Override single built-in labels, or supply every label for another language: `labels={{ close: "Schließen" }}`. */
  labels?: ZenLabelOverrides;
  /** Paint the Canvas background, the primary text colour and the Zen font on this element. Default true. */
  paint?: boolean;
  /**
   * Also write the modes onto <html>, so the page background (reset.css) and anything portalled to <body> follow
   * them. Default: true for the outermost provider that paints, false otherwise.
   */
  syncDocument?: boolean;
  /** Render a portal root inside this provider so overlays (Dialog, Toast, Tooltip, Menu…) inherit its modes. Default true. */
  portal?: boolean;
  /**
   * Where toasts from useToast() appear (the outermost provider hosts them; nested providers share it).
   * Default bottom-center.
   */
  toastPlacement?: ToastPlacement;
  as?: ElementType;
  id?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
/** Label overrides stack from the outer providers inward (a nested provider that only changes `locale` keeps them). */
const mergeOverrides = (outer?: ZenLabelOverrides, inner?: ZenLabelOverrides): ZenLabelOverrides | undefined =>
  !inner ? outer : !outer ? inner : { ...outer, ...inner, richText: { ...outer.richText, ...inner.richText }, holdActions: { ...outer.holdActions, ...inner.holdActions }, opinion: { ...outer.opinion, ...inner.opinion } };

function useMedia(query: string | null): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(() =>
    query && typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : undefined);
  useEffect(() => {
    if (!query || typeof window === "undefined" || !window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * Root of a Zen UI. Sets the token modes (`data-theme`, `data-density`…), paints the page Canvas and text colour,
 * and hosts a portal root so overlays inherit the same modes. Wrap the app once; nest another provider to switch a
 * region (e.g. a dark hero). Unset props inherit from the parent provider.
 *
 *   <ZenProvider theme="system" typography="dashboard">…</ZenProvider>
 *   <ZenProvider typography="mobile" density="comfortable">…phone app…</ZenProvider>
 */
export function ZenProvider({
  theme,
  componentTheme,
  density,
  radius,
  emphasis,
  breakpoint: requestedBreakpoint,
  typography,
  brand,
  contrast,
  locale,
  labels,
  paint = true,
  syncDocument,
  portal = true,
  toastPlacement,
  as: Component = "div",
  id,
  className,
  style,
  children,
  ...rest
}: ZenProviderProps) {
  const parent = useContext(ZenContext);
  const breakpoint = requestedBreakpoint ?? (parent ? undefined : "auto");
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

  const prefersDark = useMedia(theme === "system" ? "(prefers-color-scheme: dark)" : null);
  const prefersMoreContrast = useMedia(contrast === "system" ? "(prefers-contrast: more)" : null);
  const isMobile = useMedia(breakpoint === "auto" ? "(max-width: 743.98px)" : null);
  const isTablet = useMedia(breakpoint === "auto" ? "(max-width: 1023.98px)" : null);

  const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  const resolvedContrast = contrast === "system" ? (prefersMoreContrast ? "high" : "standard") : contrast;
  const resolvedBreakpoint = breakpoint === "auto"
    ? (isMobile ? "mobile" : isTablet ? "tablet" : isMobile === undefined ? undefined : "desktop")
    : breakpoint;

  const attributes = {
    "data-brand": brand,
    // The colour tokens resolve where a mode is declared, so a contrast scope re-declares the theme's colours too.
    "data-theme": resolvedTheme ?? (resolvedContrast ? parent?.theme ?? "light" : undefined),
    "data-contrast": resolvedContrast,
    "data-component-theme": componentTheme,
    "data-density": density,
    "data-radius": radius,
    "data-emphasis": emphasis,
    "data-breakpoint": resolvedBreakpoint,
    "data-typography": typography,
  };

  const value = useMemo<ZenContextValue>(() => ({
    ...parent,
    ...(resolvedTheme ? { theme: resolvedTheme } : {}),
    ...(componentTheme ? { componentTheme } : {}),
    ...(density ? { density } : {}),
    ...(radius ? { radius } : {}),
    ...(emphasis ? { emphasis } : {}),
    ...(resolvedBreakpoint ? { breakpoint: resolvedBreakpoint } : {}),
    ...(typography ? { typography } : {}),
    ...(brand ? { brand } : {}),
    ...(resolvedContrast ? { contrast: resolvedContrast } : {}),
    ...(locale ? { locale } : {}),
    // Labels follow the nearest locale; overrides stack from the outer providers inward.
    ...(locale || labels ? (() => {
      const labelOverrides = mergeOverrides(parent?.labelOverrides, labels);
      return { labelOverrides, labels: resolveZenLabels(locale ?? parent?.locale, labelOverrides) };
    })() : {}),
  }), [parent, resolvedTheme, componentTheme, density, radius, emphasis, resolvedBreakpoint, typography, brand, resolvedContrast, locale, labels]);

  const shouldSyncDocument = syncDocument ?? (parent === null && paint);
  const attributeKey = JSON.stringify(attributes);
  useIsomorphicLayoutEffect(() => {
    if (!shouldSyncDocument || typeof document === "undefined") return undefined;
    const html = document.documentElement;
    const previous = new Map<string, string | null>();
    for (const [name, attributeValue] of Object.entries(JSON.parse(attributeKey) as Record<string, string | undefined>)) {
      if (!attributeValue) continue;
      previous.set(name, html.getAttribute(name));
      html.setAttribute(name, attributeValue);
    }
    const previousScheme = html.style.colorScheme;
    if (resolvedTheme) html.style.colorScheme = resolvedTheme;
    return () => {
      for (const [name, attributeValue] of previous) {
        if (attributeValue === null) html.removeAttribute(name);
        else html.setAttribute(name, attributeValue);
      }
      html.style.colorScheme = previousScheme;
    };
  }, [shouldSyncDocument, attributeKey, resolvedTheme]);

  const root = (
    <Component
      {...rest}
      id={id}
      className={["zen-provider", className].filter(Boolean).join(" ")}
      data-paint={paint ? "true" : undefined}
      lang={locale}
      style={resolvedTheme && paint ? { colorScheme: resolvedTheme, ...style } : style}
      {...attributes}
    >
      {/* The outermost provider hosts the toast queue for useToast(); nested providers reuse it. */}
      {parent === null ? <ToastProvider placement={toastPlacement}>{children}</ToastProvider> : children}
      {portal ? <div ref={setPortalRoot} className="zen-provider__portal" /> : null}
    </Component>
  );

  return (
    <ZenContext.Provider value={value}>
      {/* Without its own portal root the provider keeps the parent's container (or <body>). */}
      {portal ? <ZenPortalProvider container={portalRoot}>{root}</ZenPortalProvider> : root}
    </ZenContext.Provider>
  );
}
