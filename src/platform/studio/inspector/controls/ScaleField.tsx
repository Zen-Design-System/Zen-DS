import { useContext, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { Icon } from "../../../../components/Icon";
import { SelectField } from "../../../../components/Input";
import { typographyStyles } from "../../../../tokens/typography.generated";
import type { IconName } from "../../../../icons/generated/names";
import { radiusValue, type ZenCornerRadius } from "../../../../components/_shared/scale";
import { keyForPx, tokenPx } from "../../select/spacing";
import { spacingHover } from "../../select/spacingHover";
import { matchOption } from "../propSchema";
import { InspectorHostContext, InspectorSrcContext } from "./hostContext";
import { pxText, scaleStep, stepKey, type TokenScale } from "./scale";
import "./controls.css";

/*
 * ScaleField (spec docs/research/studio-inspector-redesign-2026-10-03.md Phase 2; plan WP-D): a token select, read as a
 * token and its value on one line (user, 2026-10-09; Figma's variable list and the canvas spacing pill's menu): the list
 * rows read "md … 16px" (the pixels it measures where the layer renders), the field "md" with its 16 beside the chevron.
 * Only Zen's ladder is offered; the code keeps the token. Unset, it shows the effective default in the placeholder tone. ↑/↓ step the ladder while it is closed and write once when the
 * key is released (or focus leaves), so holding a key is one edit and one undo step; ⌫ / Delete resets a written value.
 * Typeahead and scrub are later phases. Hovered or focused (the field, or a step of its open list under the pointer or
 * the keyboard), it names its layer, prop and step on the spacing hover bus (select/spacingHover.ts), so the canvas
 * emphasises the areas the prop sets (2026-10-08).
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

/** A token select's trailing: the value the shown token measures ("16"), then the chevron — "md … 16 ⌄" on one line. */
export function ScaleTrail({ px }: { px: number | null }) {
  return (
    <span className="studio-scale__trail">
      {px !== null ? <span className={`studio-scale__px ${typographyStyles["Body/Small/Regular"]}`}>{pxText(px)}</span> : null}
      <Icon name="icon-chevron-down-line" size="2xs" />
    </span>
  );
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
  const src = useContext(InspectorSrcContext);
  const [pending, setPending] = useState<string | null>(null);
  const open = useRef(false);
  const [listOpen, setListOpen] = useState(false);
  const [engaged, setEngaged] = useState({ pointer: false, focus: false });
  const rowKey = useRef<string | null>(null);
  const extra = extras.find((item) => item.key === value);
  const matched = value === undefined ? undefined : extra ? extra.key : matchOption(value, options);
  const ladder = matched !== undefined && !extra && !options.includes(matched) ? [...options, matched] : options;
  const step = (key: string): { label: string; meta?: string } => {
    const extraItem = extras.find((item) => item.key === key);
    return extraItem ? { label: extraItem.label } : scaleStep(key, measure(host, scale, key));
  };
  const text = (key: string) => step(key).label;
  const documented = fallback !== undefined ? matchOption(fallback, ladder) : undefined;
  const effective = (matched === undefined ? renderedKey(host, prop, scale, ladder, documented) : null) ?? documented ?? (ladder.includes("none") ? "none" : undefined);

  // The canvas hover: the row under the pointer (or focused) in the open list, else the step the field shows.
  const shownKey = pending ?? matched ?? effective ?? null;
  const active = engaged.pointer || engaged.focus || listOpen;
  useEffect(() => {
    if (!src) return undefined;
    if (active) spacingHover.set({ src, prop, key: rowKey.current ?? shownKey });
    else spacingHover.clear({ src, prop });
    return undefined;
  }, [src, prop, active, listOpen, shownKey]);
  useEffect(() => () => { if (src) spacingHover.clear({ src, prop }); }, [src, prop]);
  useEffect(() => {
    if (!listOpen || !src) return undefined;
    // The list renders in a portal: its rows are found by their label (the token, one per step).
    const keyOfRow = (target: EventTarget | null) => {
      const row = target instanceof Element ? target.closest('[role="option"]') : null;
      const label = row?.querySelector(".zen-popover__item-label")?.textContent?.trim();
      return label ? ladder.find((key) => text(key) === label) ?? null : null;
    };
    const onOver = (event: Event) => {
      const key = keyOfRow(event.target);
      if (!key || key === rowKey.current) return;
      rowKey.current = key;
      spacingHover.set({ src, prop, key });
    };
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("focusin", onOver, true);
    return () => {
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("focusin", onOver, true);
    };
  });

  // The value beside the chevron: what the shown step measures ("16"), the field's own one-line "token + value".
  const shownPx = shownKey && !extras.some((item) => item.key === shownKey) ? measure(host, scale, shownKey) : null;

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
    if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
      commit();
      setEngaged((now) => ({ ...now, focus: false }));
    }
  };
  return (
    <div
      className="studio-enum studio-scale"
      onKeyDownCapture={onKeyDown}
      onKeyUpCapture={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") commit(); }}
      onBlur={onBlur}
      onFocus={() => setEngaged((now) => ({ ...now, focus: true }))}
      onPointerEnter={() => setEngaged((now) => ({ ...now, pointer: true }))}
      onPointerLeave={() => setEngaged((now) => ({ ...now, pointer: false }))}
    >
      <SelectField
        aria-label={label}
        size="sm"
        leading={leading}
        trailing={<ScaleTrail px={shownKey === "full" ? null : shownPx} />}
        disabled={disabled}
        value={pending ?? matched ?? ""}
        placeholder={placeholder ?? (effective !== undefined ? text(effective) : "—")}
        onPopoverOpenChange={(next) => { open.current = next; setListOpen(next); if (!next) rowKey.current = null; }}
        onValueChange={(next) => { setPending(null); if (next !== matched) onSet(next); }}
        options={[...extras.map((item) => ({ value: item.key, label: item.label })), ...ladder.map((key) => ({ value: key, ...step(key) }))]}
      />
    </div>
  );
}
