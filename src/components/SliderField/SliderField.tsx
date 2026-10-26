import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react";
import { scaleKey } from "../_shared/scale";
import { useControllableState } from "../_shared/use-controllable-state";
import { typographyStyles } from "../../tokens/typography.generated";
import "./slider-field.css";
import { dataAttributes } from "../_shared/data-attributes";

export const sliderFieldThemes = ["neutral", "accent"] as const;
export const sliderFieldSizes = ["small", "medium"] as const;
export type SliderFieldTheme = (typeof sliderFieldThemes)[number];
type SliderFieldSizeKey = (typeof sliderFieldSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type SliderFieldSize = "sm" | "md" | "small" | "medium";

export interface SliderFieldProps {
  /** What the number is (Figma `Label`), inside the field on the left: "Offset X", "Duration". */
  label: ReactNode;
  /** The number. Controlled with onValueChange. */
  value?: number;
  /** The first number when uncontrolled. Default: min. */
  defaultValue?: number;
  /** Called with the new number while scrubbing, on each arrow key and when a typed number is applied. */
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** The step of arrows and scrubbing; typed numbers round to it too. Default 1. */
  step?: number;
  /** The text of the number (Figma `Value`), e.g. `(v) => \`${v} px\``. Default: the number with the step's decimals. */
  formatValue?: (value: number) => string;
  /** The fill's colour: neutral (default) or accent. */
  theme?: SliderFieldTheme;
  /** Input sizes: md 40 (default), sm 32. Short or Figma spelling. */
  size?: SliderFieldSize;
  disabled?: boolean;
  /** Name for assistive technology when `label` is not plain text. */
  "aria-label"?: string;
  className?: string;
  /** The field's root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const decimalsOf = (step: number) => (String(step).split(".")[1] ?? "").length;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Figma Slider/Field (15662:108207): a number that is also a slider. The whole field is the track: the Fill shows the
 * value inside min–max, the label sits left and the number right. Drag anywhere to scrub (State=Dragging), click
 * without dragging to type an exact number (State=Typing, the fill hides; Enter or leaving applies, Escape drops it),
 * arrow keys step (Shift: ten steps, Home / End: the limits). Input tokens: Input/Size Medium 40 · Small 32,
 * Input/Spacing paddings and gap, Corner-Radius/Input, Input/Background and Input/Border per state, Effect/Input; the
 * fill is Background/Neutral/Subtle/Hover (Dragging: Pressed), Accent: Background/Accent/Subtle/Hover (Pressed); the
 * label Body/Base/Medium in Content/Neutral/Light, the number in Content/Neutral/Strongest. For a value tuned by feel
 * without a number use Slider; for an exact quantity with steppers, NumberField.
 */
export function SliderField({
  label,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  theme = "neutral",
  size: sizeProp = "md",
  disabled = false,
  "aria-label": ariaLabel,
  className,
  ref, ...rest
}: SliderFieldProps) {
  const size: SliderFieldSizeKey = scaleKey(sizeProp, sliderFieldSizes);
  const id = useId().replace(/:/g, "");
  const decimals = decimalsOf(step);
  const snap = (next: number) => clamp(Number((Math.round((next - min) / step) * step + min).toFixed(decimals)), min, max);
  const [current, setCurrent] = useControllableState<number>({
    value: value === undefined ? undefined : clamp(value, min, max),
    defaultValue: () => snap(defaultValue ?? min),
    onChange: onValueChange,
    name: "SliderField value",
  });
  const format = formatValue ?? ((number: number) => number.toFixed(decimals));
  const set = (next: number) => setCurrent(snap(next));
  const ratio = max > min ? (current - min) / (max - min) : 0;

  const sliderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const press = useRef<{ x: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const typing = draft !== null;

  // The fill spans the whole field (label included), so the pointer is read against the field's box.
  const fromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const box = (event.currentTarget.closest(".zen-slider-field") ?? event.currentTarget).getBoundingClientRect();
    set(min + clamp((event.clientX - box.left) / box.width, 0, 1) * (max - min));
  };
  const startTyping = () => {
    setDraft(format(current));
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
  };
  const finishTyping = (apply: boolean) => {
    if (draft === null) return;
    const number = Number.parseFloat(draft.replace(",", "."));
    if (apply && Number.isFinite(number)) set(number);
    setDraft(null);
    requestAnimationFrame(() => sliderRef.current?.focus({ preventScroll: true }));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = event.shiftKey ? 10 : 1;
    const moves: Record<string, number> = { ArrowRight: step * big, ArrowUp: step * big, ArrowLeft: -step * big, ArrowDown: -step * big, PageUp: step * 10, PageDown: -step * 10 };
    if (event.key in moves) { event.preventDefault(); set(current + moves[event.key]); }
    else if (event.key === "Home") { event.preventDefault(); set(min); }
    else if (event.key === "End") { event.preventDefault(); set(max); }
    else if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); startTyping(); }
  };
  const name = ariaLabel ?? (typeof label === "string" ? label : undefined);
  const state = disabled ? "disabled" : typing ? "typing" : dragging ? "dragging" : "default";

  return (
    <div {...dataAttributes(rest)}
      ref={ref}
      className={["zen-slider-field", className].filter(Boolean).join(" ")}
      data-size={size}
      data-tone={theme}
      data-state={state}
      style={{ "--zen-slider-field-ratio": ratio } as CSSProperties}
    >
      <span className="zen-slider-field__fill" aria-hidden="true" />
      <span className={`zen-slider-field__label ${typographyStyles["Body/Base/Medium"]}`} id={`${id}-label`}>{label}</span>
      {typing ? (
        <input
          ref={inputRef}
          className={`zen-slider-field__input ${typographyStyles["Body/Base/Medium"]}`}
          type="text"
          inputMode="decimal"
          aria-label={name}
          aria-labelledby={name ? undefined : `${id}-label`}
          value={draft}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => finishTyping(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); finishTyping(true); }
            else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finishTyping(false); }
          }}
        />
      ) : (
        <div
          ref={sliderRef}
          className="zen-slider-field__control"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : `${id}-label`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={current}
          aria-valuetext={format(current)}
          aria-disabled={disabled || undefined}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0) return;
            press.current = { x: event.clientX, moved: false };
            // Capture keeps the scrub going outside the field; a pointer that cannot be captured still scrubs inside it.
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
          }}
          onPointerMove={(event) => {
            const pressed = press.current;
            if (!pressed) return;
            // A press turns into a scrub once it moves 3px: from then on the fill follows the pointer.
            if (!pressed.moved && Math.abs(event.clientX - pressed.x) < 3) return;
            if (!pressed.moved) { pressed.moved = true; setDragging(true); }
            fromPointer(event);
          }}
          onPointerUp={() => {
            const pressed = press.current;
            press.current = null;
            setDragging(false);
            // A click without a drag types an exact number.
            if (pressed && !pressed.moved) startTyping();
          }}
          onPointerCancel={() => { press.current = null; setDragging(false); }}
        >
          <span className={`zen-slider-field__value ${typographyStyles["Body/Base/Medium"]}`}>{format(current)}</span>
        </div>
      )}
    </div>
  );
}
