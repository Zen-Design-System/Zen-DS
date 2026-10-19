import { useContext, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { Icon } from "../../../../components/Icon";
import { InputField, SelectField } from "../../../../components/Input";
import { typographyStyles } from "../../../../tokens/typography.generated";
import type { IconName } from "../../../../icons/generated/names";
import { radiusValue, type ZenCornerRadius } from "../../../../components/_shared/scale";
import { keyForPx, tokenPx } from "../../select/spacing";
import { spacingHover } from "../../select/spacingHover";
import { matchOption } from "../propSchema";
import { useInlineLabel } from "../Section";
import { InspectorHostContext, InspectorSrcContext } from "./hostContext";
import { isMarginKey, MARGIN_TOKENS, nearestStep, pxText, scaleStep, stepKey, tokenName, type TokenScale } from "./scale";
import { evaluateNumber } from "./numberMath";
import { inspectorStatus } from "../status";
import "./controls.css";

/*
 * ScaleField (spec docs/research/studio-inspector-redesign-2026-10-03.md Phase 2; plan WP-D): a token select, read as a
 * token and its value on one line (user, 2026-10-09; Figma's variable list and the canvas spacing pill's menu): the list
 * rows read "md … 16px" (the pixels it measures where the layer renders), the field "md" with its 16 beside the chevron.
 * Only Zen's ladder is offered; the code keeps the token. Unset, it shows the effective default in the placeholder tone. ↑/↓ step the ladder while it is closed and write once when the
 * key is released (or focus leaves), so holding a key is one edit and one undo step; ⌫ / Delete resets a written value.
 * Typing a number (or Figma's arithmetic, "+4", "*2") into the focused field snaps it to the nearest step and writes that
 * variable (decision 1 of docs/research/studio-figma-design-parity-2026-10-18.md: Zen keeps spacing and radius on
 * variables), and a written step reads as Figma's variable pill. Hovered or focused (the field, or a step of its open list
 * under the pointer or the keyboard), it names its layer, prop and step on the spacing hover bus (select/spacingHover.ts),
 * so the canvas emphasises the areas the prop sets (2026-10-08).
 */

/** The Figma variable a step is ("Spacing/Gap/Small", "Corner-Radius/Base", "Margin-Comfortable"). */
function variablePath(key: string, scale: TokenScale, prop: string): string {
  if (isMarginKey(key)) return MARGIN_TOKENS[key];
  if (scale === "radius") return `Corner-Radius/${tokenName(key, "radius")}`;
  return `Spacing/${scale === "gap" || /gap/i.test(prop) ? "Gap" : "Padding"}/${tokenName(key, scale)}`;
}

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

export function ScaleField({ label, prop, scale, options, value, fallback, disabled, onSet, onReset, extras = [], actions = [], leading, placeholder }: {
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
  /** Commands at the top of the list (where Figma keeps "Auto"), not values (a Grid gap's "Separate row and column gaps" / "Use one gap"): picking
   *  one runs it, the field keeps its value. Figma keeps such a mode in the field's own list, not an icon beside it. */
  actions?: Array<{ key: string; label: string; run: () => void }>;
  /** A leading icon naming the field (Figma's gap / padding glyphs). */
  leading?: IconName;
  /** Shown while unset instead of the effective step ("Mixed · 16 / 4" when the axes differ). */
  placeholder?: string;
}) {
  const inlineLabel = useInlineLabel();
  const host = useContext(InspectorHostContext);
  const src = useContext(InspectorSrcContext);
  const [pending, setPending] = useState<string | null>(null);
  const open = useRef(false);
  const [listOpen, setListOpen] = useState(false);
  const [engaged, setEngaged] = useState({ pointer: false, focus: false });
  /** What is being typed into the field (null: the select shows). */
  const [typed, setTypedState] = useState<string | null>(null);
  // The latest typed text, so Enter and the blur that follows it write once.
  const typedRef = useRef<string | null>(null);
  const setTyped = (next: string | null) => { typedRef.current = next; setTypedState(next); };
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowKey = useRef<string | null>(null);
  const extra = extras.find((item) => item.key === value);
  const matched = value === undefined ? undefined : extra ? extra.key : matchOption(value, options);
  const ladder = matched !== undefined && !extra && !options.includes(matched) ? [...options, matched] : options;
  // The steps ↑/↓ walk and a measured px reads as; the page margins (Margin-Comfortable…) list after them, as Figma's
  // variable list shows another collection's variables after the group's (user, 2026-10-17).
  const steps = ladder.filter((key) => !isMarginKey(key));
  const margins = ladder.filter(isMarginKey);
  const step = (key: string): { label: string; meta?: string } => {
    const extraItem = extras.find((item) => item.key === key);
    return extraItem ? { label: extraItem.label } : scaleStep(key, measure(host, scale, key), scale);
  };
  const text = (key: string) => step(key).label;
  const documented = fallback !== undefined ? matchOption(fallback, ladder) : undefined;
  const effective = (matched === undefined ? renderedKey(host, prop, scale, steps, documented) : null) ?? documented ?? (ladder.includes("none") ? "none" : undefined);

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

  const focusTrigger = () => requestAnimationFrame(() => wrapRef.current?.querySelector<HTMLElement>(".zen-select__trigger")?.focus());
  /** A typed value: evaluated on the value shown, snapped to the nearest step, written as that variable. */
  const commitTyped = () => {
    const text = typedRef.current;
    setTyped(null);
    if (text === null || !text.trim()) return;
    const current = shownKey && !extras.some((item) => item.key === shownKey) ? measure(host, scale, shownKey) : null;
    const px = evaluateNumber(text, current);
    if (px === null) { inspectorStatus.set("neutral", `${label} takes a number`); return; }
    const snap = nearestStep(steps.map((key) => ({ key, px: measure(host, scale, key) })), Math.max(0, px));
    if (!snap) return;
    if (snap.key !== matched) onSet(snap.key);
    if (Math.abs(snap.px - px) >= 0.5) inspectorStatus.set("neutral", `${pxText(px)} → ${tokenName(snap.key, scale)} · ${pxText(snap.px)}, the nearest variable`);
  };
  const commit = () => {
    if (pending === null) return;
    const next = pending;
    setPending(null);
    if (next !== matched) onSet(next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (typed !== null || open.current || disabled || event.altKey || event.metaKey || event.ctrlKey) return;
    // A digit, a point or an operator starts typing a value, as in Figma's number fields.
    if (/^[0-9.+\-*/(]$/.test(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      setPending(null);
      setTyped(event.key);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Captured before the select opens its list, and kept from the canvas's arrow keys (reorder, nudge).
      event.preventDefault();
      event.stopPropagation();
      const from = pending ?? (extra ? undefined : matched) ?? effective;
      const next = stepKey(steps, from !== undefined && isMarginKey(from) ? undefined : from, event.key === "ArrowUp" ? 1 : -1);
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
  const variable = matched !== undefined && !extra ? variablePath(matched, scale, prop) : undefined;
  return (
    <div
      ref={wrapRef}
      className="studio-enum studio-scale"
      data-variable={variable ? "true" : undefined}
      title={variable && !listOpen ? variable : undefined}
      onKeyDownCapture={onKeyDown}
      onKeyUpCapture={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") commit(); }}
      onBlur={onBlur}
      onFocus={() => setEngaged((now) => ({ ...now, focus: true }))}
      onPointerEnter={() => setEngaged((now) => ({ ...now, pointer: true }))}
      onPointerLeave={() => setEngaged((now) => ({ ...now, pointer: false }))}
    >
      {/* In a label-left row: Figma's Inline-Field, the label inside instead of the glyph. */}
      {typed !== null ? (
        <InputField
          size="sm"
          aria-label={label}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          layout={inlineLabel ? "inline" : undefined}
          label={inlineLabel ?? undefined}
          leading={inlineLabel ? undefined : leading}
          value={typed}
          onValueChange={setTyped}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") { event.preventDefault(); commitTyped(); focusTrigger(); }
            else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setTyped(null); focusTrigger(); }
          }}
          onBlur={commitTyped}
        />
      ) : (
      <SelectField
        aria-label={label}
        size="sm"
        layout={inlineLabel ? "inline" : undefined}
        label={inlineLabel ?? undefined}
        leading={inlineLabel ? undefined : leading}
        trailing={<ScaleTrail px={shownKey === "full" ? null : shownPx} />}
        disabled={disabled}
        value={pending ?? matched ?? ""}
        placeholder={placeholder ?? (effective !== undefined ? text(effective) : "—")}
        onPopoverOpenChange={(next) => { open.current = next; setListOpen(next); if (!next) rowKey.current = null; }}
        onValueChange={(next) => {
          setPending(null);
          const action = actions.find((item) => item.key === next);
          if (action) action.run();
          else if (next !== matched) onSet(next);
        }}
        options={[...actions.map((item) => ({ value: item.key, label: item.label })), ...extras.map((item) => ({ value: item.key, label: item.label })), ...[...steps, ...margins].map((key) => ({ value: key, ...step(key) }))]}
      />
      )}
    </div>
  );
}
