import { useEffect, useState, type ReactNode } from "react";
import { BottomSheet } from "../BottomSheet";
import { Button } from "../Button";
import { useOverlayOpen, type OverlayOpenProps } from "../_shared/overlay";
import { useZenLabels } from "../_shared/zen-context";
import { DatePicker, type DatePickerRange } from "./DatePicker";
import "./date-picker.css";

export interface DatePickerSheetProps extends OverlayOpenProps {
  /** Figma Header heading (Heading/3). Default: the locale's "Choose date" ("Choose dates" for a range). */
  title?: ReactNode;
  /** `single` (Figma Variant=Single): one month with Back / Next, Cancel and OK. `range` (Variant=Multiple): the months
   *  stacked in a scrolling list, a start and an end day, and the Footer-Actions (your `summary` next to OK). */
  selectionMode?: "single" | "range";
  /** Applied date (single). The sheet picks a draft over it; OK applies the draft. */
  value?: Date | null;
  /** Applied date when uncontrolled (single). */
  defaultValue?: Date | null;
  /** Applied range (range mode). */
  range?: DatePickerRange | null;
  /** Applied range when uncontrolled (range mode). */
  defaultRange?: DatePickerRange | null;
  /** OK: the picked date (single) or the complete range (range mode). The sheet closes. */
  onApply?: (value: Date | null, range: DatePickerRange | null) => void;
  /** Each pick of a day (single), a draft until OK. */
  onValueChange?: (date: Date | null) => void;
  /** Each pick in range mode, a draft until OK: update the `summary` from it (the price for these nights). */
  onRangeChange?: (range: DatePickerRange) => void;
  /** Cancel (single): the draft is dropped and the sheet closes. Closing by the X, the scrim or Escape drops it too. */
  onCancel?: () => void;
  minDate?: Date;
  maxDate?: Date;
  /** The day the calendar treats as today (DatePicker `today`). */
  today?: Date;
  /** Range mode: how many months the list shows from the first one (DatePicker `monthCount`). Default 12. */
  monthCount?: number;
  /** Range mode: Figma Footer-Actions Content beside OK, e.g. a price in Body/Extra/Bold over a Body/Small line
   *  ("$605.50" · "7 nights"), or a hint while no range is picked ("Add dates for prices"). */
  summary?: ReactNode;
  /** OK button label. Default: the locale's "OK". */
  applyLabel?: ReactNode;
  /** Cancel button label (single). Default: the locale's "Cancel". */
  cancelLabel?: ReactNode;
  className?: string;
}

/**
 * Figma Date-Picker/Mobile (9923:3576): the phone date picker, a Bottom Sheet (Heading + Close) around the mobile
 * calendar (`device="mobile"`: days fill the width). Variant=Single shows one month with Back / Next and the sheet's
 * Cancel / OK; Variant=Multiple stacks the months (`calendar="stacked"`, one weekday row at the top of the scroll) and
 * ends in `.Primitives/Date-Picker/Footer-Actions` (9923:2791): the summary beside a Large Primary, Spacing/Gap/Small
 * apart. Picks are a draft until OK. DateField opens it on phones in place of the desktop popover.
 */
export function DatePickerSheet({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, selectionMode = "single", value, defaultValue = null, range, defaultRange = null, onApply, onValueChange, onRangeChange, onCancel, minDate, maxDate, today, monthCount = 12, summary, applyLabel, cancelLabel, className }: DatePickerSheetProps) {
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const rangeMode = selectionMode === "range";
  const [innerValue, setInnerValue] = useState<Date | null>(defaultValue);
  const [innerRange, setInnerRange] = useState<DatePickerRange | null>(defaultRange);
  const appliedValue = value === undefined ? innerValue : value;
  const appliedRange = range === undefined ? innerRange : range;
  // Every opening starts from the applied selection.
  const [draftValue, setDraftValue] = useState<Date | null>(appliedValue);
  const [draftRange, setDraftRange] = useState<DatePickerRange | null>(appliedRange);
  useEffect(() => {
    if (!open) return;
    setDraftValue(appliedValue);
    setDraftRange(appliedRange);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const complete = rangeMode ? Boolean(draftRange?.start && draftRange.end) : Boolean(draftValue);
  const apply = () => {
    if (rangeMode) { if (range === undefined) setInnerRange(draftRange); }
    else if (value === undefined) setInnerValue(draftValue);
    onApply?.(rangeMode ? null : draftValue, rangeMode ? draftRange : null);
    onOpenChange(false);
  };
  const cancel = () => { onCancel?.(); onOpenChange(false); };
  const ok = applyLabel ?? t.ok;
  return (
    <BottomSheet
      className={["zen-date-picker-sheet", className].filter(Boolean).join(" ")}
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (rangeMode ? t.chooseDates : t.chooseDate)}
      size={rangeMode ? "max" : "flex"}
      primaryAction={rangeMode ? undefined : { label: ok, onClick: apply, disabled: !complete }}
      secondaryAction={rangeMode ? undefined : { label: cancelLabel ?? t.cancel, onClick: cancel }}
      footer={rangeMode ? (
        <div className="zen-date-picker-sheet__footer">
          <div className="zen-date-picker-sheet__summary">{summary}</div>
          <Button className="zen-date-picker-sheet__apply" appearance="main" level="primary" size="lg" disabled={!complete} onClick={apply}>{ok}</Button>
        </div>
      ) : undefined}
    >
      <DatePicker
        device="mobile"
        calendar={rangeMode ? "stacked" : "single"}
        monthCount={monthCount}
        selectionMode={selectionMode}
        value={draftValue}
        onValueChange={rangeMode ? undefined : (date) => { setDraftValue(date); onValueChange?.(date); }}
        range={draftRange}
        onRangeChange={rangeMode ? (next) => { setDraftRange(next); onRangeChange?.(next); } : undefined}
        minDate={minDate}
        maxDate={maxDate}
        today={today}
        aria-label={typeof title === "string" ? title : undefined}
      />
    </BottomSheet>
  );
}
