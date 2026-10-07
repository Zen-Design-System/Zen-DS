import { useEffect, useState, type SVGAttributes } from "react";
import { scaleKey } from "../_shared/scale";
import type { FlagName } from "./flagNames";
import "./flag.css";

export const flagSizes = ["small", "medium", "large"] as const;
type FlagSizeKey = (typeof flagSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type FlagSize = "sm" | "md" | "lg" | "small" | "medium" | "large";

export type FlagProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "name"> & {
  /** Figma Flag `Name`: the country or region, spelled as in Figma (e.g. "Vietnam", "United Kingdom"). */
  name: FlagName;
  /** Figma Size: Small 16 · Medium 24 (default) · Large 32, on the Image-Size scale (Avatar XSmall = Medium). */
  size?: FlagSize;
  /** Accessible name for a flag that stands alone. Omit it when the country name sits next to the flag (decorative). */
  label?: string;
};

// The 260 flags (≈330 KB of SVG) load once, on first use, so apps that never show a flag don't ship them.
let flagData: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;
const loadFlags = () => (loading ??= import("./flagData").then((module) => (flagData = module.default)));

/**
 * Figma Flag (7063:63834, 🍑 Iconography): 260 round country and region flags, 24×24 in Figma. A flag identifies a
 * country next to its name (locale pickers, phone codes, addresses, holiday calendars); it is never the only label.
 * Until the flag data has loaded, the same circle shows in Neutral/Subtle.
 */
export function Flag({ name, size: sizeProp = "md", label, className, ...svgProps }: FlagProps) {
  const size: FlagSizeKey = scaleKey(sizeProp, flagSizes);
  const [markup, setMarkup] = useState<string | null>(() => flagData?.[name] ?? null);
  useEffect(() => {
    if (flagData) { setMarkup(flagData[name] ?? null); return undefined; }
    let alive = true;
    loadFlags().then((data) => { if (alive) setMarkup(data[name] ?? null); });
    return () => { alive = false; };
  }, [name]);
  return (
    <svg
      {...svgProps}
      className={["zen-flag", className].filter(Boolean).join(" ")}
      data-size={size}
      data-loading={markup ? undefined : "true"}
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      // Trusted, generated markup (scripts/build-flags.mjs rejects scripts, handlers and foreign objects).
      dangerouslySetInnerHTML={{ __html: markup ?? '<circle cx="12" cy="12" r="12" class="zen-flag__placeholder"/>' }}
    />
  );
}
