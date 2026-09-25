import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon } from "../Icon";
import { Button, IconButton } from "../Button";
import { typographyStyles } from "../../tokens/typography.generated";
import "./date-picker.css";

export type DatePickerItemState =
  | "default" | "hover" | "single-selected" | "range-selected-start" | "range-selected-end"
  | "in-range" | "today" | "blank" | "weekend" | "disabled";

export interface DatePickerItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  day?: number | string;
  state?: DatePickerItemState;
  event?: boolean;
  size?: "medium" | "small";
}

/** The 32px day primitive from `.Primitives/Date-Picker/Item`. */
export function DatePickerItem({ day = "", state = "default", event = false, size = "medium", className, ...props }: DatePickerItemProps) {
  const blank = state === "blank" || day === "";
  return (
    <button
      {...props}
      className={["zen-date-picker__day", blank ? "is-blank" : "", className].filter(Boolean).join(" ")}
      data-state={state}
      data-size={size}
      type="button"
      aria-label={blank ? undefined : `Day ${day}`}
      disabled={blank || state === "disabled" || props.disabled}
    >
      <span>{day}</span>
      {event ? <i aria-hidden="true" /> : null}
    </button>
  );
}

export interface DatePickerHeaderProps {
  month: Date;
  onPrevious?: () => void;
  onNext?: () => void;
  onMonthYearClick?: () => void;
  type?: "interactive" | "static" | "display";
}

export function DatePickerHeader({ month, onPrevious, onNext, onMonthYearClick, type = "interactive" }: DatePickerHeaderProps) {
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month).split(" ");
  return (
    <header className="zen-date-picker__header" data-type={type}>
      {type === "interactive" ? <IconButton className="zen-date-picker__nav" appearance="main" level="tertiary" size="sm" aria-label="Previous month" onClick={onPrevious} icon={<Icon name="icon-chevron-left-line-small" />} /> : null}
      <button className={`zen-date-picker__month ${typographyStyles["Body/Extra/Bold"]}`} type="button" onClick={onMonthYearClick} disabled={type !== "interactive"}>
        <span>{label[0]}</span><span>{label[1]}</span>
      </button>
      {type === "interactive" ? <IconButton className="zen-date-picker__nav" appearance="main" level="tertiary" size="sm" aria-label="Next month" onClick={onNext} icon={<Icon name="icon-chevron-right-line-small" />} /> : null}
    </header>
  );
}

export interface DatePickerActionProps {
  action?: "single" | "dual";
  onCancel?: () => void;
  onApply?: () => void;
  cancelLabel?: ReactNode;
  applyLabel?: ReactNode;
}

export function DatePickerAction({ action = "dual", onCancel, onApply, cancelLabel = "Cancel", applyLabel = "Apply" }: DatePickerActionProps) {
  return (
    <footer className="zen-date-picker__actions">
      {action === "dual" ? <Button level="tertiary" size="sm" onClick={onCancel}>{cancelLabel}</Button> : null}
      <Button level="primary" size="sm" onClick={onApply}>{applyLabel}</Button>
    </footer>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function dateKey(date: Date) { return startOfDay(date).getTime(); }
function monthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }

export interface DatePickerProps {
  open?: boolean;
  value?: Date | null;
  defaultValue?: Date | null;
  month?: Date;
  onChange?: (date: Date | null) => void;
  onMonthChange?: (month: Date) => void;
  onClose?: () => void;
  showActions?: boolean;
  action?: "single" | "dual";
  selectionMode?: "single" | "range";
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

/** Figma `Date-Picker/Single-Calendar` adapted to the shared token and Button
 * primitives. It is also the calendar surface used by Input/Date-Field. */
export function DatePicker({
  open = true,
  value,
  defaultValue = null,
  month: controlledMonth,
  onChange,
  onMonthChange,
  onClose,
  showActions = false,
  action = "dual",
  selectionMode = "single",
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [internalValue, setInternalValue] = useState<Date | null>(defaultValue);
  const [internalMonth, setInternalMonth] = useState<Date>(() => monthStart(value ?? defaultValue ?? new Date()));
  const selected = value === undefined ? internalValue : value;
  const currentMonth = controlledMonth ? monthStart(controlledMonth) : internalMonth;
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const days = useMemo(() => {
    const first = monthStart(currentMonth);
    const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > count ? null : new Date(first.getFullYear(), first.getMonth(), day);
    });
  }, [currentMonth]);
  if (!open) return null;
  const setMonth = (next: Date) => {
    const resolved = monthStart(next);
    setInternalMonth(resolved);
    onMonthChange?.(resolved);
  };
  const selectDate = (date: Date) => {
    if (minDate && dateKey(date) < dateKey(minDate)) return;
    if (maxDate && dateKey(date) > dateKey(maxDate)) return;
    if (selectionMode === "range") {
      if (!rangeStart || rangeEnd) { setRangeStart(date); setRangeEnd(null); onChange?.(date); return; }
      const start = dateKey(date) < dateKey(rangeStart) ? date : rangeStart;
      const end = dateKey(date) < dateKey(rangeStart) ? rangeStart : date;
      setRangeStart(start); setRangeEnd(end); onChange?.(end); return;
    }
    if (value === undefined) setInternalValue(date);
    onChange?.(date);
    if (!showActions) onClose?.();
  };
  const isDisabled = (date: Date) => Boolean((minDate && dateKey(date) < dateKey(minDate)) || (maxDate && dateKey(date) > dateKey(maxDate)));
  const stateFor = (date: Date): DatePickerItemState => {
    const key = dateKey(date);
    if (isDisabled(date)) return "disabled";
    if (selectionMode === "range" && rangeStart && rangeEnd && key > dateKey(rangeStart) && key < dateKey(rangeEnd)) return "in-range";
    if (selectionMode === "range" && rangeStart && key === dateKey(rangeStart)) return "range-selected-start";
    if (selectionMode === "range" && rangeEnd && key === dateKey(rangeEnd)) return "range-selected-end";
    if (selected && key === dateKey(selected)) return "single-selected";
    if (key === dateKey(new Date())) return "today";
    if (date.getDay() === 0 || date.getDay() === 6) return "weekend";
    return "default";
  };
  return (
    <div className={["zen-date-picker", className].filter(Boolean).join(" ")} role="dialog" aria-label="Choose date">
      <DatePickerHeader month={currentMonth} onPrevious={() => setMonth(addMonths(currentMonth, -1))} onNext={() => setMonth(addMonths(currentMonth, 1))} />
      <div className={`zen-date-picker__calendar ${typographyStyles["Body/Small/Medium"]}`}>
        <div className="zen-date-picker__weekdays">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="zen-date-picker__grid">{days.map((date, index) => date ? <DatePickerItem key={date.toISOString()} day={date.getDate()} state={stateFor(date)} disabled={isDisabled(date)} onClick={() => selectDate(date)} /> : <DatePickerItem key={`blank-${index}`} state="blank" />)}</div>
      </div>
      {showActions ? <DatePickerAction action={action} onCancel={onClose} onApply={onClose} /> : null}
    </div>
  );
}
