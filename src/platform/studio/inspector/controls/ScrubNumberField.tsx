import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { InputField } from "../../../../components/Input";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { arrowStep, evaluateNumber, scrubValue } from "./numberMath";
import "./controls.css";

/*
 * Figma's number field (X, Y, rotation, Arc, stroke weight…): drag its label left or right to change the value (1 per
 * px, ⇧ ×10), ↑ / ↓ ±1 (⇧ ±10), type a number or an expression ("100/3", "+8", "*2"), Enter or leaving the field writes,
 * Esc puts the value back. A scrub or an arrow burst writes once, when it ends (one undo step).
 */

export function ScrubNumberField({
  label,
  name,
  value,
  min,
  max,
  suffix,
  round = 0,
  disabled,
  placeholder = "—",
  onCommit,
}: {
  /** The leading mark ("X", "Y", an icon) the pointer scrubs. */
  label: ReactNode;
  /** Accessible name ("X", "Rotation", "Arc start"). */
  name: string;
  value: number | null;
  min?: number;
  max?: number;
  /** Shown after the number ("°", "%"). */
  suffix?: string;
  /** Decimals kept (Figma: 0 for px, up to 2 for degrees). */
  round?: number;
  disabled?: boolean;
  placeholder?: string;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const scrub = useRef<{ id: number; x: number; base: number; moved: boolean } | null>(null);
  const pendingRef = useRef<number | null>(null);
  const factor = 10 ** round;
  const clamp = (next: number) => {
    let result = Math.round(next * factor) / factor;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };
  const show = (number: number | null) => (number === null ? "" : `${Number(number.toFixed(round))}${suffix ?? ""}`);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  // Another value from outside (undo, another layer) drops what was being typed.
  useEffect(() => { setDraft(null); setPending(null); }, [value]);

  const current = pending ?? value;
  const commit = (next: number | null) => {
    setDraft(null);
    setPending(null);
    if (next === null || disabled) return;
    const settled = clamp(next);
    if (settled !== value) onCommit(settled);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(draft !== null ? evaluateNumber(draft, value) : pending);
      (event.target as HTMLInputElement).blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft(null);
      setPending(null);
      (event.target as HTMLInputElement).blur();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const base = draft !== null ? evaluateNumber(draft, value) ?? value ?? 0 : current ?? 0;
      setDraft(null);
      setPending(clamp(base + (event.key === "ArrowUp" ? 1 : -1) * arrowStep(event.shiftKey)));
    }
  };
  const onKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && pendingRef.current !== null) commit(pendingRef.current);
  };
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrub.current = { id: event.pointerId, x: event.clientX, base: value ?? 0, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const state = scrub.current;
    if (!state || state.id !== event.pointerId) return;
    const travel = event.clientX - state.x;
    if (!state.moved && Math.abs(travel) < 2) return;
    state.moved = true;
    setPending(clamp(scrubValue(state.base, travel, event.shiftKey)));
  };
  const endScrub = (event: PointerEvent<HTMLSpanElement>, keep: boolean) => {
    const state = scrub.current;
    if (!state || state.id !== event.pointerId) return;
    scrub.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (keep && state.moved) commit(pendingRef.current);
    else setPending(null);
  };

  return (
    <div className="studio-scrub-field" data-prop={name}>
      <InputField
        size="sm"
        aria-label={name}
        role="spinbutton"
        aria-valuenow={current ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        disabled={disabled}
        placeholder={placeholder}
        value={draft ?? show(current)}
        onValueChange={(next) => setDraft(next)}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => { if (draft !== null) commit(evaluateNumber(draft, value)); }}
        leading={(
          <span
            className={`studio-scrub-field__label ${typographyStyles["Body/Small/Medium"]}`}
            data-disabled={disabled || undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(event) => endScrub(event, true)}
            onPointerCancel={(event) => endScrub(event, false)}
          >
            {label}
          </span>
        )}
      />
    </div>
  );
}
