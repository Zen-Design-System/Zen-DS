import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { focusFirstInvalidField } from "./focus";

/**
 * A form's values: one entry per field name. useFormState accepts any object type for them — a `type` alias or an
 * `interface` (`interface Values { name: string }` has no index signature, so it is not a `FormValues`, and that is fine).
 */
export type FormValues = Record<string, unknown>;
/** The field names of a values object (string keys only). */
export type FormFieldName<V> = Extract<keyof V, string>;
/** One message per invalid field ("Enter your work email"). A missing or empty entry means the field is valid. */
export type FormErrors<V> = Partial<Record<FormFieldName<V>, string>>;
/** Fields the user has left (blurred) or committed (picked, checked, toggled). */
export type FormTouched<V> = Partial<Record<FormFieldName<V>, boolean>>;
/** Names of the fields whose value type fits `T`, e.g. the string fields for `field()`. */
export type FormFieldsOfType<V, T> = { [K in FormFieldName<V>]-?: Exclude<V[K], undefined> extends T ? K : never }[FormFieldName<V>];

/** Anything with `preventDefault` and a `currentTarget`: the submit event of a `<form>`, or a button click. */
export type FormSubmitEvent = { preventDefault?: () => void; currentTarget?: EventTarget | null };

/** What `handleSubmit` resolves to. */
export interface FormSubmitResult<V> {
  /** True when validation passed, `onSubmit` finished without throwing and set no field error. */
  ok: boolean;
  /** The field errors that stopped the submit (validation, or `setError` called from `onSubmit`). */
  errors: FormErrors<V>;
  /** Number of fields in `errors`; Form announces it ("2 fields need attention"). */
  errorCount: number;
}

/** Passed to `onSubmit` as its second argument. */
export interface FormSubmitHelpers<V> {
  /** Show a server-side error under a field ("This email is already registered"). It clears when the value changes. */
  setError: (name: FormFieldName<V>, message: string | undefined) => void;
  /** Start over: back to `initialValues`, or to `values`, which also become the new baseline. */
  reset: (values?: V) => void;
}

export interface UseFormStateOptions<V extends object> {
  /** Starting values, one per field. Read on mount; `reset(values)` starts over with new ones. */
  initialValues: V;
  /**
   * Returns a message for each invalid field, e.g. `{ email: "Enter a valid email address, like name@company.com" }`.
   * Leave valid fields out. It runs on every change, so a message clears as soon as the user fixes the field.
   */
  validate?: (values: V) => FormErrors<V>;
  /**
   * Runs after a submit passes `validate`. An async handler keeps `isSubmitting` true until it settles. Throw an Error
   * with a user-facing message to fill `submitError` (show it in a Negative InlineMessage); call `helpers.setError`
   * for field errors the server returns.
   */
  onSubmit: (values: V, helpers: FormSubmitHelpers<V>) => void | Promise<void>;
  /**
   * After a failed submit, move focus to the first invalid field of the submitted form (and scroll it to the centre).
   * Needs the submit event: `<Form form={form}>`, `<form onSubmit={form.handleSubmit}>` or ModalForm `onSubmit`. Default true.
   */
  focusOnError?: boolean;
}

/** Props for InputField and TextAreaField: `<InputField label="Work email" {...form.field("email")} />`. */
export interface FormTextFieldBinding {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
  error: string | undefined;
}
/** Props for SelectField. Picking an option commits the field, so its error shows at once; leaving it unpicked (a
 * `placeholder` field) shows it on blur, like a text field. */
export interface FormSelectFieldBinding {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onBlur: () => void;
  error: string | undefined;
}
/** Props for DateField: typing (`onChange`) and picking a day (`onDateChange`) both set the value, as MM/DD/YYYY. */
export interface FormDateFieldBinding {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDateChange: (date: Date | null) => void;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  error: string | undefined;
}
/** Props for NumberField (`value: number | null`). */
export interface FormNumberFieldBinding {
  name: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  onBlur: () => void;
  error: string | undefined;
}
/** Props for Checkbox. Checkbox has no error slot: show the error with a FormField or FormFieldset around it. */
export interface FormCheckboxBinding {
  name: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}
/** Props for Toggle. Toggles apply at once, so they rarely belong in a submitted form (see the Toggle guideline). */
export interface FormToggleBinding {
  name: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}
/** Props for one RadioButton of a group; the group's error goes on its `<FormFieldset kind="radio">`. */
export interface FormRadioBinding {
  name: string;
  value: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}
/** Props for AutocompleteField (`value: string[]`). */
export interface FormAutocompleteBinding {
  value: string[];
  onValueChange: (value: string[]) => void;
  error: string | undefined;
}
/** Props for RichTextField (the value is the editor HTML). */
export interface FormRichTextBinding {
  value: string;
  onValueChange: (html: string, text: string) => void;
  onBlur: () => void;
  error: string | undefined;
}

export interface FormState<V extends object> {
  /** Current values. */
  values: V;
  /** Every current error (from `validate` and `setError`), shown or not. Render `fieldError(name)` or the field bindings. */
  errors: FormErrors<V>;
  /** Fields the user has left or committed. */
  touched: FormTouched<V>;
  /** True while an async `onSubmit` runs: show progress on the submit button ("Saving…"). */
  isSubmitting: boolean;
  /** True when no field has an error (validation or server). */
  isValid: boolean;
  /** True when a value differs from the baseline (`initialValues` or the last `reset(values)`); arrays compare item by item. */
  isDirty: boolean;
  /** Submit attempts since mount or the last `reset()`. */
  submitCount: number;
  /** Message of the error `onSubmit` threw on the last attempt, or null. Show it in a Negative InlineMessage. */
  submitError: string | null;
  /** Set one value. `touch: true` also commits the field, so its error shows at once (pickers, custom controls). */
  setValue: <K extends FormFieldName<V>>(name: K, value: V[K], options?: { touch?: boolean }) => void;
  /** Set or clear (`undefined`) a field error from outside `validate`, e.g. the server. It clears when the value changes. */
  setError: (name: FormFieldName<V>, message: string | undefined) => void;
  /** Mark a field as left (default) or not. Call it from a custom control's onBlur; an invalid field then shows its error. */
  setTouched: (name: FormFieldName<V>, touched?: boolean) => void;
  /** Back to the baseline (or to `values`, which become the new baseline); clears errors, touched, submitCount and submitError. */
  reset: (values?: V) => void;
  /**
   * Validates, shows every error, then runs `onSubmit`. Pass it to `<form onSubmit>` or ModalForm `onSubmit`, or let
   * `<Form form={form}>` call it. After a failed submit it focuses the first invalid field (see `focusOnError`).
   */
  handleSubmit: (event?: FormSubmitEvent) => Promise<FormSubmitResult<V>>;
  /** The error to render for a field, e.g. on a FormField: set once the field was left with a bad value, committed, or submitted. */
  fieldError: (name: FormFieldName<V>) => string | undefined;
  /** InputField / TextAreaField props: `<InputField label="Work email" {...form.field("email")} />`. */
  field: <K extends FormFieldsOfType<V, string>>(name: K) => FormTextFieldBinding;
  /** SelectField props: `<SelectField label="Role" options={roles} {...form.selectField("role")} />`. */
  selectField: <K extends FormFieldsOfType<V, string>>(name: K) => FormSelectFieldBinding;
  /** DateField props (value MM/DD/YYYY): `<DateField label="Start date" {...form.dateField("start")} />`. */
  dateField: <K extends FormFieldsOfType<V, string>>(name: K) => FormDateFieldBinding;
  /** NumberField props: `<NumberField label="Seats" min={1} {...form.numberField("seats")} />`. */
  numberField: <K extends FormFieldsOfType<V, number | null>>(name: K) => FormNumberFieldBinding;
  /** Checkbox props: `<Checkbox label="I agree to the Terms" {...form.checkboxField("terms")} />`. */
  checkboxField: <K extends FormFieldsOfType<V, boolean>>(name: K) => FormCheckboxBinding;
  /** Toggle props: `<Toggle label="Weekly digest" {...form.toggleField("digest")} />`. */
  toggleField: <K extends FormFieldsOfType<V, boolean>>(name: K) => FormToggleBinding;
  /** One RadioButton of a group: `<RadioButton label="Express" {...form.radioField("delivery", "express")} />`. */
  radioField: <K extends FormFieldsOfType<V, string>>(name: K, value: Exclude<V[K], undefined>) => FormRadioBinding;
  /** AutocompleteField props (`string[]` value). */
  autocompleteField: <K extends FormFieldsOfType<V, string[]>>(name: K) => FormAutocompleteBinding;
  /** RichTextField props (HTML value). */
  richTextField: <K extends FormFieldsOfType<V, string>>(name: K) => FormRichTextBinding;
}

type Flags<V> = Partial<Record<FormFieldName<V>, boolean>>;

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Drops empty messages, so `{ email: undefined }` or `{ email: "" }` counts as valid. */
function clean<V>(errors: FormErrors<V> | undefined | null): FormErrors<V> {
  const out: FormErrors<V> = {};
  if (!errors) return out;
  for (const [name, message] of Object.entries(errors) as [FormFieldName<V>, string | undefined][]) if (message) out[name] = message;
  return out;
}
const countOf = (errors: object) => Object.keys(errors).length;
const sameValue = (a: unknown, b: unknown) => Object.is(a, b) || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => Object.is(item, b[index])));
/** The thrown error's message, or `fallback` (the locale's "Something went wrong. Try again.") when it has none. */
const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : typeof error === "string" ? error : "") || fallback;
/** DateField's own text format (MM/DD/YYYY), so a picked date reads the same as a typed one. */
const formatDate = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
/** The form element a submit came from: the event's form, or the form around the clicked button. */
function formOf(event: FormSubmitEvent | undefined): HTMLElement | null {
  const target = event?.currentTarget;
  if (typeof Element === "undefined" || !(target instanceof Element)) return null;
  return target instanceof HTMLFormElement ? target : target.closest("form");
}

/**
 * Tiny, dependency-free form state for Zen fields. The field helpers return exactly the props each Zen field takes:
 *
 *   const form = useFormState({ initialValues: { email: "" }, validate, onSubmit });
 *   <Form form={form}><InputField label="Work email" {...form.field("email")} /></Form>
 *
 * Errors show when the user leaves a field with a bad value (or commits a picker, checkbox or radio) and on submit; they
 * clear as soon as the value is fixed. Typing never brings an error up early ("reward early, punish late").
 *
 * react-hook-form: Zen fields are controlled, so wrap each one in RHF's `<Controller>` and map its render props to the
 * field's own signature — `value`, `onChange(event)` for InputField / TextAreaField, `onValueChange(n)` for NumberField,
 * `onCheckedChange(checked)` for Checkbox and Toggle — plus `onBlur` and `error={fieldState.error?.message}`.
 * `<Form onSubmit={handleSubmit(onValid)}>` still focuses the first invalid field and announces the count.
 */
export function useFormState<V extends object>(options: UseFormStateOptions<V>): FormState<V> {
  const { initialValues, validate } = options;
  const optionsRef = useRef(options);
  useIsomorphicLayoutEffect(() => { optionsRef.current = options; });
  const failed = useZenLabels().somethingWentWrong;

  const [baseline, setBaseline] = useState<V>(initialValues);
  const [values, setValuesState] = useState<V>(initialValues);
  const [touched, setTouchedState] = useState<FormTouched<V>>({});
  // Fields whose error is on screen. Leaving a field with a bad value, committing it or submitting shows it; fixing the value hides it.
  const [shown, setShown] = useState<Flags<V>>({});
  const [serverErrors, setServerErrors] = useState<FormErrors<V>>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mirrors for event handlers: several changes can land before React re-renders.
  const baselineRef = useRef(initialValues);
  const valuesRef = useRef(initialValues);
  const serverRef = useRef<FormErrors<V>>({});
  const submittingRef = useRef(false);

  const errors: FormErrors<V> = { ...clean(validate?.(values)), ...serverErrors };

  const errorsFor = useCallback((next: V): FormErrors<V> => ({ ...clean(optionsRef.current.validate?.(next)), ...serverRef.current }), []);
  const writeServer = useCallback((next: FormErrors<V>) => { serverRef.current = next; setServerErrors(next); }, []);
  const show = useCallback((name: FormFieldName<V>, visible: boolean) => setShown((current) => (Boolean(current[name]) === visible ? current : { ...current, [name]: visible })), []);

  /** A value changed. `commit` (a pick, a check) shows or hides the field's error at once; typing only ever hides it. */
  const change = useCallback(<K extends FormFieldName<V>>(name: K, value: V[K], commit: boolean) => {
    const next = { ...valuesRef.current, [name]: value } as V;
    valuesRef.current = next;
    setValuesState(next);
    if (serverRef.current[name] !== undefined) {
      const rest = { ...serverRef.current };
      delete rest[name];
      writeServer(rest);
    }
    const invalid = Boolean(errorsFor(next)[name]);
    if (commit) {
      show(name, invalid);
      setTouchedState((current) => (current[name] ? current : { ...current, [name]: true }));
    } else if (!invalid) show(name, false);
  }, [errorsFor, show, writeServer]);

  const setTouched = useCallback((name: FormFieldName<V>, next = true) => {
    setTouchedState((current) => (Boolean(current[name]) === next ? current : { ...current, [name]: next }));
    // Leaving a valid field shows nothing, so editing it later stays quiet until the next blur.
    show(name, next && Boolean(errorsFor(valuesRef.current)[name]));
  }, [errorsFor, show]);

  const setValue = useCallback(<K extends FormFieldName<V>>(name: K, value: V[K], opts?: { touch?: boolean }) => change(name, value, Boolean(opts?.touch)), [change]);

  const setError = useCallback((name: FormFieldName<V>, message: string | undefined) => {
    const next = { ...serverRef.current };
    if (message) next[name] = message;
    else delete next[name];
    writeServer(next);
    if (message) show(name, true);
  }, [show, writeServer]);

  const reset = useCallback((next?: V) => {
    if (next) { baselineRef.current = next; setBaseline(next); }
    valuesRef.current = baselineRef.current;
    setValuesState(baselineRef.current);
    setTouchedState({});
    setShown({});
    writeServer({});
    setSubmitCount(0);
    setSubmitError(null);
  }, [writeServer]);

  const handleSubmit = useCallback(async (event?: FormSubmitEvent): Promise<FormSubmitResult<V>> => {
    event?.preventDefault?.();
    // Read the form before any await: React clears currentTarget once the event has been dispatched.
    const root = formOf(event);
    const focusErrors = () => { if (root && optionsRef.current.focusOnError !== false) requestAnimationFrame(() => focusFirstInvalidField(root)); };
    if (submittingRef.current) return { ok: false, errors: {}, errorCount: 0 };
    setSubmitCount((count) => count + 1);
    setSubmitError(null);
    // Server errors belong to the previous attempt: the server checks again.
    writeServer({});
    const current = valuesRef.current;
    const validation = clean(optionsRef.current.validate?.(current));
    if (countOf(validation)) {
      setShown((previous) => ({ ...previous, ...Object.fromEntries(Object.keys(validation).map((name) => [name, true])) }));
      focusErrors();
      return { ok: false, errors: validation, errorCount: countOf(validation) };
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    let threw = false;
    try {
      await optionsRef.current.onSubmit(current, { setError, reset });
    } catch (error) {
      threw = true;
      setSubmitError(messageOf(error, failed));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
    const server = { ...serverRef.current };
    if (countOf(server)) focusErrors();
    return { ok: !threw && !countOf(server), errors: server, errorCount: countOf(server) };
  }, [reset, setError, writeServer, failed]);

  const fieldError = (name: FormFieldName<V>) => (shown[name] ? errors[name] : undefined);
  const read = <T,>(name: FormFieldName<V>, fallback: T): T => (values[name] ?? fallback) as T;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid: countOf(errors) === 0,
    isDirty: (Object.keys(values) as FormFieldName<V>[]).some((name) => !sameValue(values[name], baseline[name])),
    submitCount,
    submitError,
    setValue,
    setError,
    setTouched,
    reset,
    handleSubmit,
    fieldError,
    field: (name) => ({
      name,
      value: read(name, ""),
      onChange: (event) => change(name, event.target.value as V[typeof name], false),
      onBlur: () => setTouched(name),
      error: fieldError(name),
    }),
    selectField: (name) => ({
      name,
      value: read(name, ""),
      onChange: (event) => change(name, event.target.value as V[typeof name], true),
      onBlur: () => setTouched(name),
      error: fieldError(name),
    }),
    dateField: (name) => ({
      name,
      value: read(name, ""),
      onChange: (event) => change(name, event.target.value as V[typeof name], false),
      onDateChange: (date) => change(name, (date ? formatDate(date) : "") as V[typeof name], true),
      // Focus moving into the open calendar is not leaving the field.
      onBlur: (event) => { if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest(".zen-date-picker"))) setTouched(name); },
      error: fieldError(name),
    }),
    numberField: (name) => ({
      name,
      value: read<number | null>(name, null),
      onValueChange: (next) => change(name, next as V[typeof name], false),
      onBlur: () => setTouched(name),
      error: fieldError(name),
    }),
    checkboxField: (name) => ({ name, checked: Boolean(values[name]), onCheckedChange: (checked) => change(name, checked as V[typeof name], true) }),
    toggleField: (name) => ({ name, checked: Boolean(values[name]), onCheckedChange: (checked) => change(name, checked as V[typeof name], true) }),
    radioField: (name, value) => ({
      name,
      value: String(value),
      checked: values[name] === value,
      onCheckedChange: (checked) => { if (checked) change(name, value as V[typeof name], true); },
    }),
    autocompleteField: (name) => ({ value: read<string[]>(name, []), onValueChange: (next) => change(name, next as V[typeof name], true), error: fieldError(name) }),
    richTextField: (name) => ({
      value: read(name, ""),
      onValueChange: (html) => change(name, html as V[typeof name], false),
      onBlur: () => setTouched(name),
      error: fieldError(name),
    }),
  };
}
