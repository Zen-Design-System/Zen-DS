import { useContext, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { SelectField } from "../../../../components/Input";
import type { IconName } from "../../../../icons/generated/names";
import { radiusValue, type ZenCornerRadius } from "../../../../components/_shared/scale";
import { keyForPx, tokenPx } from "../../select/spacing";
import { matchOption } from "../propSchema";
import { InspectorHostContext } from "./hostContext";
import { scaleLabel, stepKey, type TokenScale } from "./scale";

/*
 * ScaleField (spec docs/research/studio-inspector-redesign-2026-10-03.md Phase 2; plan WP-D): a token select that names
 * each step with what it measures where the layer renders ("md · 16", the canvas spacing pill's wording). Unset, it
 * shows the effective default in the placeholder tone. ↑/↓ step the ladder while it is closed and write once when the
 * key is released (or focus leaves), so holding a key is one edit and one undo step; ⌫ / Delete resets a written value.
 * Typeahead and scrub are later phases.
 */

/** What `key` measures on `host` in CSS px (null: unknown, or `full`). */
function measure(host: Element | null, scale: TokenScale, key: string): number | null {
  if (!host?.isConnected) return null;
  if (key === "none") return 0;
  if (scale !== "radius") return tokenPx(host, scale, key);
  if (key === "full") return null;
  let variable: string | undefined;
  try {
    variable = /var\((--[\w-]+)\)/.exec(radiusValue(key as ZenCornerRadius) ?? "")?.[1];
  } catch {
    return null;
  }
  const value = variable ? parseFloat(getComputedStyle(host).getPropertyValue(variable)) : NaN;
  return Number.isFinite(value) ? value : null;
}

/** The computed style a prop sets on its element, read while it is unset to show what renders (paddingX falls back to padding). */
const renderedBy: Readonly<Record<string, readonly (keyof CSSStyleDeclaration)[]>> = {
  gap: ["rowGap", "columnGap"], rowGap: ["rowGap"], columnGap: ["columnGap"],
  padding: ["paddingTop"], paddingX: ["paddingLeft"], paddingY: ["paddingTop"],
  radius: ["borderTopLeftRadius"], radiusTopLeft: ["borderTopLeftRadius"], radiusTopRight: ["borderTopRightRadius"],
  radiusBottomRight: ["borderBottomRightRadius"], radiusBottomLeft: ["borderBottomLeftRadius"],
};

/** The step `prop` renders with on `host` now (measured), else null. */
function renderedKey(host: Element | null, prop: string, scale: TokenScale, ladder: readonly string[], preferred: string | undefined): string | null {
  const styles = renderedBy[prop];
  if (!host?.isConnected || !styles) return null;
  const computed = getComputedStyle(host);
  const px = styles.map((name) => parseFloat(String(computed[name]))).find((value) => Number.isFinite(value));
  return px === undefined ? null : keyForPx(ladder.map((key) => ({ key, px: measure(host, scale, key) })), px, preferred);
}

export function ScaleField({ label, prop, scale, options, value, fallback, disabled, onSet, onReset, extras = [], leading, placeholder }: {
  label: string;
  /** The prop's name: while unset, what it renders with is measured on the element (Horizontal padding from Padding). */
  prop: string;
  scale: TokenScale;
  /** The ladder in scale order (the prop's enum options). */
  options: string[];
  /** The key the source writes; undefined while unset. */
  value: string | undefined;
  /** The documented default (shown while unset). */
  fallback: string | undefined;
  disabled: boolean;
  onSet: (key: string) => void;
  /** ⌫ / Delete on a written value; without it the key goes on (Figma: Delete removes the selected layer). */
  onReset?: () => void;
  /** Items above the ladder that are not steps (the gap list's "Auto"); `value` may name one. ↑/↓ skip them. */
  extras?: Array<{ key: string; label: string }>;
  /** A leading icon naming the field (Figma's gap / padding glyphs). */
  leading?: IconName;
  /** Shown while unset instead of the effective step ("Mixed · 16 / 4" when the axes differ). */
  placeholder?: string;
}) {
  const host = useContext(InspectorHostContext);
  const [pending, setPending] = useState<string | null>(null);
  const open = useRef(false);
  const extra = extras.find((item) => item.key === value);
  const matched = value === undefined ? undefined : extra ? extra.key : matchOption(value, options);
  const ladder = matched !== undefined && !extra && !options.includes(matched) ? [...options, matched] : options;
  const text = (key: string) => extras.find((item) => item.key === key)?.label ?? scaleLabel(key, measure(host, scale, key));
  const documented = fallback !== undefined ? matchOption(fallback, ladder) : undefined;
  const effective = (matched === undefined ? renderedKey(host, prop, scale, ladder, documented) : null) ?? documented ?? (ladder.includes("none") ? "none" : undefined);

  const commit = () => {
    if (pending === null) return;
    const next = pending;
    setPending(null);
    if (next !== matched) onSet(next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open.current || disabled || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Captured before the select opens its list, and kept from the canvas's arrow keys (reorder, nudge).
      event.preventDefault();
      event.stopPropagation();
      const from = pending ?? (extra ? undefined : matched) ?? effective;
      const next = stepKey(ladder, from, event.key === "ArrowUp" ? 1 : -1);
      if (next !== undefined) setPending(next);
    } else if ((event.key === "Backspace" || event.key === "Delete") && matched !== undefined && onReset) {
      event.preventDefault();
      event.stopPropagation();
      setPending(null);
      onReset();
    }
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) commit();
  };
  return (
    <div className="studio-enum studio-scale" onKeyDownCapture={onKeyDown} onKeyUpCapture={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") commit(); }} onBlur={onBlur}>
      <SelectField
        aria-label={label}
        size="sm"
        leading={leading}
        disabled={disabled}
        value={pending ?? matched ?? ""}
        placeholder={placeholder ?? (effective !== undefined ? text(effective) : "—")}
        onPopoverOpenChange={(next) => { open.current = next; }}
        onValueChange={(next) => { setPending(null); if (next !== matched) onSet(next); }}
        options={[...extras.map((item) => ({ value: item.key, label: item.label })), ...ladder.map((key) => ({ value: key, label: text(key) }))]}
      />
    </div>
  );
}
