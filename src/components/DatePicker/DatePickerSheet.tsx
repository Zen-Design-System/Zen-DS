import { useEffect, useEffectEvent, useMemo, useState, type ReactNode, type Ref } from "react";
import { BottomSheet } from "../BottomSheet";
import { Button, IconButton } from "../Button";
import { Icon } from "../Icon";
import { useOverlayOpen, type OverlayOpenProps } from "../_shared/overlay";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { useControllableState } from "../_shared/use-controllable-state";
import { typographyStyles } from "../../tokens/typography.generated";
import { DatePicker, weekdayInitials, type DatePickerRange } from "./DatePicker";
import "./date-picker.css";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { dataAttributes } from "../_shared/data-attributes";

export interface DatePickerSheetProps extends OverlayOpenProps {
  /** Figma Header heading (Heading/3). Default: the locale's "Choose date" ("Choose dates" for a range). With
   *  `header="selection"`, the caption over the picked date (single) or the heading beside Close (range). */
  title?: ReactNode;
  /** `bar` (default): the Bottom-Sheet Header-Bar, the title and Close. `selection`: Figma `.Primitives/Date-Picker`
   *  (9923:2323), the picked dates lead the sheet. Single (Option=1): the title as a caption over the picked date in
   *  Heading/3 and, with `onEdit`, an edit action beside it. Range (Option=2): the title and Close, the picked range
   *  with Clear dates, and the weekday row, all above the scrolling months. */
  header?: "bar" | "selection";
  /** Single `header="selection"`: the edit action beside the picked date (Figma Action), e.g. to type the date in a
   *  field instead. Without it the action is hidden. */
  onEdit?: () => void;
  /** Range `header="selection"`: Clear dates empties the draft range; set the `summary` back to its hint here. */
  onClear?: () => void;
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
  /** Figma instance overrides: props of the OK button it draws, by layer (`{ Apply: { level: "accent" } }`). Written by Zen Studio;
   *  app code sets applyLabel. */
  overrides?: NestedOverrides;
  /** Ref to the sheet panel `<div>` (role=dialog); set while the sheet is open. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma Date-Picker/Mobile (9923:3576): the phone date picker, a Bottom Sheet (Heading + Close) around the mobile
 * calendar (`device="mobile"`: days fill the width). Variant=Single shows one month with Back / Next and the sheet's
 * Cancel / OK; Variant=Multiple stacks the months (`calendar="stacked"`, one weekday row at the top of the scroll) and
 * ends in `.Primitives/Date-Picker/Footer-Actions` (9923:2791): the summary beside a Large Primary, Spacing/Gap/Small
 * apart. Picks are a draft until OK. DateField opens it on phones in place of the desktop popover.
 * `header="selection"` swaps the Header-Bar for `.Primitives/Date-Picker` (9923:2323): Option=1 (single) Caption
 * Body/Base/Medium Neutral/Light, Spacing/Gap/XSmall over the date in Heading/3 and an edit Button/Icon-Flat Small
 * (icon-edit-02-solid, Neutral/Light) in a 20px wrapper; Option=2 (range) the Heading/3 title beside a Close
 * Icon-Flat (icon-x-small-line) in a 2XSmall-padded 28px box, Spacing/Gap/Large over the range (Body/Base/Regular,
 * Neutral/Base) and Clear dates (Body/Base/Bold, Strongest, right-aligned), then the weekday row (Body/Small/Medium,
 * Neutral/Light, padding Medium / 2XSmall). Both pad by the sheet inset (Option=2: dm-8 at the bottom) over a 1px
 * Border/Neutral/Subtle/Default rule.
 */
export function DatePickerSheet({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose, title, header = "bar", onEdit, onClear, selectionMode = "single", value, defaultValue = null, range, defaultRange = null, onApply, onValueChange, onRangeChange, onCancel, minDate, maxDate, today, monthCount = 12, summary, applyLabel, cancelLabel, className, overrides, ref, ...rest }: DatePickerSheetProps) {
  const nest = useNested(overrides);
  const [open, onOpenChange] = useOverlayOpen({ open: openProp, isOpen, onOpenChange: onOpenChangeProp, onClose });
  const t = useZenLabels();
  const rangeMode = selectionMode === "range";
  // The applied selection (OK reports it through onApply; draft picks have their own callbacks).
  const [appliedValue, setAppliedValue] = useControllableState<Date | null>({ value, defaultValue, name: "DatePickerSheet value" });
  const [appliedRange, setAppliedRange] = useControllableState<DatePickerRange | null>({ value: range, defaultValue: defaultRange, name: "DatePickerSheet range" });
  // Every opening starts from the applied selection.
  const [draftValue, setDraftValue] = useState<Date | null>(appliedValue);
  const [draftRange, setDraftRange] = useState<DatePickerRange | null>(appliedRange);
  const resetDraft = useEffectEvent(() => {
    setDraftValue(appliedValue);
    setDraftRange(appliedRange);
  });
  useEffect(() => {
    if (open) resetDraft();
  }, [open]);
  const complete = rangeMode ? Boolean(draftRange?.start && draftRange.end) : Boolean(draftValue);
  const apply = () => {
    if (rangeMode) setAppliedRange(draftRange);
    else setAppliedValue(draftValue);
    onApply?.(rangeMode ? null : draftValue, rangeMode ? draftRange : null);
    onOpenChange(false);
  };
  const cancel = () => { onCancel?.(); onOpenChange(false); };
  const ok = applyLabel ?? t.ok;
  const heading = title ?? (rangeMode ? t.chooseDates : t.chooseDate);
  const locale = useZenLocale();
  const formats = useMemo(() => ({
    date: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }),
    rangeDay: new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }),
  }), [locale]);
  const weekdays = useMemo(() => weekdayInitials(locale), [locale]);
  // The visible heading text is aria-hidden: BottomSheet keeps `title` as the dialog's name in a hidden h2.
  const selectionHeader = header !== "selection" ? undefined : rangeMode ? (
    <div className="zen-date-picker-sheet__header" data-selection="range">
      <div className="zen-date-picker-sheet__title-row">
        <p className={`zen-date-picker-sheet__title ${typographyStyles["Heading/3"]}`} aria-hidden="true">{heading}</p>
        <span className="zen-date-picker-sheet__close">
          {nest("Close-Container", <IconButton appearance="flat" size="sm" aria-label={t.close} icon="icon-x-small-line" onClick={() => onOpenChange(false)} />)}
        </span>
      </div>
      <div className="zen-date-picker-sheet__range-row">
        <p className={`zen-date-picker-sheet__range ${typographyStyles["Body/Base/Regular"]}`}>
          {draftRange?.start ? (draftRange.end ? formats.rangeDay.formatRange(draftRange.start, draftRange.end) : `${formats.rangeDay.format(draftRange.start)} –`) : t.noDatesSelected}
        </p>
        <button type="button" className={`zen-date-picker-sheet__clear ${typographyStyles["Body/Base/Bold"]}`} disabled={!draftRange} onClick={() => { setDraftRange(null); onClear?.(); }}>{t.clearDates}</button>
      </div>
      <div className={`zen-date-picker-sheet__weekdays ${typographyStyles["Body/Small/Medium"]}`} aria-hidden="true">
        {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
    </div>
  ) : (
    <div className="zen-date-picker-sheet__header" data-selection="single">
      <p className={`zen-date-picker-sheet__caption ${typographyStyles["Body/Base/Medium"]}`} aria-hidden="true">{heading}</p>
      <div className="zen-date-picker-sheet__date-row">
        <p className={`zen-date-picker-sheet__date ${typographyStyles["Heading/3"]}`}>{draftValue ? formats.date.format(draftValue) : t.noDateSelected}</p>
        {onEdit ? (
          <span className="zen-date-picker-sheet__edit">
            {nest("Action", <IconButton appearance="flat" size="sm" aria-label={t.editDate} icon={<Icon name="icon-edit-02-solid" tone="light" />} onClick={onEdit} />)}
          </span>
        ) : null}
      </div>
    </div>
  );
  return (
    <BottomSheet {...dataAttributes(rest)}
      ref={ref}
      className={["zen-date-picker-sheet", className].filter(Boolean).join(" ")}
      data-header={header}
      open={open}
      onOpenChange={onOpenChange}
      title={heading}
      header={selectionHeader}
      size={rangeMode ? "max" : "flex"}
      primaryAction={rangeMode ? undefined : { label: ok, onClick: apply, disabled: !complete }}
      secondaryAction={rangeMode ? undefined : { label: cancelLabel ?? t.cancel, onClick: cancel }}
      footer={rangeMode ? (
        <div className="zen-date-picker-sheet__footer">
          <div className="zen-date-picker-sheet__summary">{summary}</div>
          {nest("Apply", <Button className="zen-date-picker-sheet__apply" appearance="main" level="primary" size="lg" disabled={!complete} onClick={apply}>{ok}</Button>)}
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
