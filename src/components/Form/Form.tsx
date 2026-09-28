import {
  Children,
  Fragment,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FieldsetHTMLAttributes,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SubmitEvent,
} from "react";
import { Button, type ButtonProps } from "../Button";
import { InputHelpText, InputLabel } from "../Input";
import { Stack, type ZenGap } from "../Layout";
import { VisuallyHidden } from "../VisuallyHidden";
import { gapValue, paddingValue, type ZenPadding } from "../_shared/scale";
import { useZen, useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { countInvalidFields, focusFirstInvalidField } from "./focus";
import type { FormSubmitEvent } from "./useFormState";
import "./form.css";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const cleanId = (id: string) => id.replace(/:/g, "");

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/* ───────────── Form ───────────── */

/** The part of `useFormState()` that Form uses; any object with this shape works. */
export interface FormSubmitSource {
  handleSubmit: (event?: FormSubmitEvent) => Promise<{ ok: boolean; errorCount: number }>;
  isSubmitting?: boolean;
}

export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "children"> {
  /**
   * The state from `useFormState()`. Form submits through `form.handleSubmit`: it validates, shows every error, moves
   * focus to the first invalid field and announces how many need attention. Pass either `form` or `onSubmit`.
   */
  form?: FormSubmitSource;
  /**
   * Your own submit handler, called after `preventDefault()` (e.g. react-hook-form's `handleSubmit(onValid)`). Return a
   * promise and Form waits for it; then, if any field is invalid (aria-invalid), it focuses the first one and announces the count.
   */
  onSubmit?: (event: SubmitEvent<HTMLFormElement>) => unknown;
  /** Space between the form's direct children (Figma Spacing/Gap): the groups of a form. Default lg (24px); fields inside a group use md. */
  gap?: ZenGap;
  /** Screen-reader message after a failed submit. Default: the locale's "1 field needs attention" / "3 fields need attention". */
  invalidMessage?: (count: number) => string;
  /** Skip the browser's own validation bubbles; Zen shows errors under each field. Default true. */
  noValidate?: boolean;
  /** The groups of the form, top to bottom: Stacks or Grids of fields, FormFieldsets, and FormActions last. */
  children?: ReactNode;
}

/**
 * A `<form noValidate>` laid out as a Stack (gap lg between groups). On submit it prevents the page reload and calls
 * `form.handleSubmit` (from `useFormState`) or `onSubmit`. When the submit fails it moves focus to the first invalid
 * field and announces "N fields need attention" in a polite live region.
 *
 *   <Form form={form}>
 *     <Stack gap="md"><InputField label="Work email" {...form.field("email")} /></Stack>
 *     <FormActions><Button level="tertiary">Cancel</Button><Button level="primary" type="submit">Create account</Button></FormActions>
 *   </Form>
 */
export const Form = forwardRef<HTMLFormElement, FormProps>(function Form(
  { form, onSubmit, gap = "lg", invalidMessage: invalidMessageProp, noValidate = true, className, children, ...rest },
  ref,
) {
  const t = useZenLabels();
  const invalidMessage = invalidMessageProp ?? t.fieldsNeedAttention;
  const [announcement, setAnnouncement] = useState("");
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // Stack forwards an HTMLElement ref; this one is always the <form>.
  const setRef = useCallback((node: HTMLElement | null) => assignRef(ref, node as HTMLFormElement | null), [ref]);

  const announce = (message: string) => {
    // Clear first so the same message is read again after a second failed submit.
    setAnnouncement("");
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { frame.current = requestAnimationFrame(() => setAnnouncement(message)); });
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    if (form) {
      // handleSubmit shows the errors and focuses the first invalid field itself; Form adds the announcement.
      const result = await form.handleSubmit(event);
      if (!result.ok && result.errorCount > 0) announce(invalidMessage(result.errorCount));
      else setAnnouncement("");
      return;
    }
    await onSubmit?.(event);
    // After the handler's state updates have rendered, read the errors from the DOM.
    requestAnimationFrame(() => {
      const count = countInvalidFields(element);
      if (!count) { setAnnouncement(""); return; }
      focusFirstInvalidField(element);
      announce(invalidMessage(count));
    });
  };

  // Form attributes Stack's own props don't list (noValidate, action, method…) pass through the spread.
  const formAttributes: FormHTMLAttributes<HTMLFormElement> = { ...rest, noValidate };
  return (
    <Stack
      {...formAttributes}
      as="form"
      ref={setRef}
      gap={gap}
      className={["zen-form", className].filter(Boolean).join(" ")}
      aria-busy={form?.isSubmitting || undefined}
      onSubmit={handleSubmit}
    >
      {children}
      <VisuallyHidden className="zen-form__live" role="status" aria-live="polite" aria-atomic="true">{announcement}</VisuallyHidden>
    </Stack>
  );
});

/* ───────────── FormField ───────────── */

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The field label (Figma Input/Label, Body/Small/Regular). Omit it only when the control carries its own label (a Checkbox). */
  label?: ReactNode;
  /** One line of guidance under the control (Help-Text, Neutral). Replaced by `error` while there is one. */
  helpText?: ReactNode;
  /** The error message (Help-Text, Negative). Pass `form.fieldError(name)` so it shows at the right moment. */
  error?: ReactNode;
  /** Adds " *" to the label and aria-required to the control. Mark the few optional fields instead when most are required. */
  required?: boolean;
  /** Figma Label `Optional`: appends "(Optional)". */
  optional?: boolean;
  /** Figma Label `Tooltip-Icon`: an info icon with this text as a tooltip. */
  labelTooltip?: boolean | ReactNode;
  /** Figma Label `Action`: a right-aligned link or text button ("Reset to default"). */
  labelAction?: ReactNode;
  /** id given to the control (default: generated). The label points at it. */
  controlId?: string;
  /**
   * Exactly one control. It receives `id`, `aria-labelledby`, `aria-describedby`, `aria-invalid` and `aria-required`,
   * so it must put them on its focusable element (Slider takes aria-labelledby; your own controls should take all five).
   */
  children: ReactElement;
}

type ControlProps = { id?: string; "aria-label"?: string; "aria-labelledby"?: string; "aria-describedby"?: string };

/**
 * Label, help text and error for a control that has no built-in ones (Slider, ColorSelector, a custom picker). Zen
 * inputs (InputField, SelectField…) already have label/helpText/error: use them directly. The wrapper is marked invalid
 * while `error` is set, so Form can focus it after a failed submit.
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  { label, helpText, error, required = false, optional = false, labelTooltip, labelAction, controlId, className, children, ...rest },
  ref,
) {
  const generated = cleanId(useId());
  const child = Children.only(children) as ReactElement<ControlProps>;
  const id = controlId ?? child.props.id ?? `zen-form-field-${generated}`;
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const hasLabel = label !== undefined && label !== null && label !== false;
  const message = error || helpText;
  const describedBy = [child.props["aria-describedby"], message ? messageId : undefined].filter(Boolean).join(" ") || undefined;
  const named = Boolean(child.props["aria-label"] || child.props["aria-labelledby"]);
  const control = cloneElement(child, {
    id,
    "aria-labelledby": hasLabel && !named ? labelId : child.props["aria-labelledby"],
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  } as ControlProps & Record<string, unknown>);
  return (
    <div {...rest} ref={ref} className={["zen-form-field", className].filter(Boolean).join(" ")} data-zen-invalid={error ? "true" : undefined}>
      {hasLabel ? <InputLabel id={id} labelId={labelId} optional={optional} tooltip={labelTooltip} action={labelAction}>{label}{required ? <span aria-hidden="true"> *</span> : null}</InputLabel> : null}
      {control}
      {message ? <InputHelpText id={messageId} theme={error ? "negative" : "neutral"}>{error || helpText}</InputHelpText> : null}
    </div>
  );
});

/* ───────────── FormFieldset ───────────── */

export const formFieldsetKinds = ["group", "checkbox", "radio", "toggle"] as const;
export type FormFieldsetKind = (typeof formFieldsetKinds)[number];

export interface FormFieldsetProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "children"> {
  /** Names the group ("Delivery speed", "Email me about"); read before each option. Required. */
  legend: ReactNode;
  /** Hide the legend visually (screen readers still read it) when a heading right above already names the group. */
  hideLegend?: boolean;
  /**
   * What the group holds. `radio` adds role="radiogroup" (with aria-required / aria-invalid), as the RadioButton
   * guideline asks; `toggle` spaces rows md; `checkbox`, `radio` and `group` space them sm. Default group.
   */
  kind?: FormFieldsetKind;
  /** Stack the options (column, default) or lay them in a wrapping row (2–3 short options). */
  direction?: "column" | "row";
  /** Space between options (Figma Spacing/Gap). Default sm, or md for toggles. */
  gap?: ZenGap;
  /** One line of guidance for the whole group, under the options. Replaced by `error` while there is one. */
  helpText?: ReactNode;
  /** The group's error ("Choose a delivery speed"). Pass `form.fieldError(name)`. */
  error?: ReactNode;
  /** Adds " *" to the legend (and aria-required to a radio group): at least one option must be chosen. */
  required?: boolean;
  /** Figma Label `Optional`: appends "(Optional)" to the legend. */
  optional?: boolean;
  /** The options: Checkbox, RadioButton (sharing one `name`) or Toggle rows. */
  children?: ReactNode;
}

/**
 * A `<fieldset>` + `<legend>` for a group of Checkbox, RadioButton or Toggle rows, with one help text and one error
 * for the whole group. `kind="radio"` makes it a radiogroup. The legend uses the field label style (Body/Small/Regular).
 */
export const FormFieldset = forwardRef<HTMLFieldSetElement, FormFieldsetProps>(function FormFieldset(
  { legend, hideLegend = false, kind = "group", direction = "column", gap, helpText, error, required = false, optional = false, className, style, children, ...rest },
  ref,
) {
  const t = useZenLabels();
  const id = `zen-form-fieldset-${cleanId(useId())}`;
  const messageId = `${id}-message`;
  const message = error || helpText;
  const radio = kind === "radio";
  const describedBy = [rest["aria-describedby"], message ? messageId : undefined].filter(Boolean).join(" ") || undefined;
  const optionsGap = gapValue(gap ?? (kind === "toggle" ? "md" : "sm"));
  return (
    <fieldset
      {...rest}
      ref={ref}
      className={["zen-form-fieldset", className].filter(Boolean).join(" ")}
      style={{ "--zen-form-fieldset-gap": optionsGap, ...style } as CSSProperties}
      role={radio ? "radiogroup" : rest.role}
      aria-describedby={describedBy}
      aria-invalid={radio && error ? true : undefined}
      aria-required={radio && required ? true : undefined}
      data-kind={kind}
      data-zen-invalid={error ? "true" : undefined}
    >
      <legend className={`zen-form-fieldset__legend ${typographyStyles["Body/Small/Regular"]}`} data-hidden={hideLegend ? "true" : undefined}>
        {legend}
        {optional ? <span className="zen-form-fieldset__optional"> {t.optional}</span> : null}
        {required ? <span aria-hidden="true"> *</span> : null}
      </legend>
      <div className="zen-form-fieldset__options" data-direction={direction}>{children}</div>
      {message ? <InputHelpText id={messageId} theme={error ? "negative" : "neutral"}>{error || helpText}</InputHelpText> : null}
    </fieldset>
  );
});

/* ───────────── FormActions ───────────── */

export const formActionsAlignments = ["end", "start", "between"] as const;
export type FormActionsAlign = (typeof formActionsAlignments)[number];

export interface FormActionsProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Where the buttons sit on wide layouts: `end` (default, right), `start`, or `between` (the first child alone on the
   * left, e.g. "Delete draft", the rest on the right). Write Tertiary (cancel) first and Primary (submit) last in every case.
   */
  align?: FormActionsAlign;
  /** Keep the bar pinned to the bottom of the scrolling area (Surface background, Pale top line, safe-area padding). */
  sticky?: boolean;
  /** Sticky only: side padding of the bar, e.g. lg on a full-bleed phone screen so the buttons line up with the fields. */
  inset?: ZenPadding;
  /** The buttons: Tertiary (cancel) first, Primary (`type="submit"`, named for the outcome) last. */
  children?: ReactNode;
}

/** Width below which the actions stack (Primary on top, full-width Large buttons), as on phones. */
const STACK_BELOW = 480;

/** Maps Buttons (inside fragments too) to Large for the stacked, full-width layout. */
function largeButtons(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) return largeButtons((child.props as { children?: ReactNode }).children);
    return child.type === Button ? cloneElement(child as ReactElement<ButtonProps>, { size: "lg" }) : child;
  });
}

/**
 * The footer row of a form. Desktop: Tertiary (cancel) then Primary (submit), on the right. When the form is narrower
 * than 480px, or inside a ZenProvider with breakpoint mobile, the buttons stack full width at size lg with Primary on
 * top (the mobile footer pattern). `sticky` pins the row to the bottom of the scrolling area.
 */
export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(function FormActions(
  { align = "end", sticky = false, inset, className, style, children, ...rest },
  ref,
) {
  const zen = useZen();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  const setRefs = useCallback((node: HTMLDivElement | null) => { rowRef.current = node; assignRef(ref, node); }, [ref]);
  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current;
    // Measure the container (the form), not the row itself: a stacked row is narrower than a wide one.
    const host = row?.parentElement;
    if (!row || !host) return undefined;
    const update = () => {
      const styles = getComputedStyle(host);
      const width = host.clientWidth - parseFloat(styles.paddingLeft || "0") - parseFloat(styles.paddingRight || "0");
      const mobile = row.closest("[data-breakpoint]")?.getAttribute("data-breakpoint") === "mobile";
      setNarrow(mobile || (width > 0 && width < STACK_BELOW));
    };
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  const stacked = narrow || zen?.breakpoint === "mobile";
  return (
    <div
      {...rest}
      ref={setRefs}
      className={["zen-form-actions", className].filter(Boolean).join(" ")}
      data-align={align}
      data-stacked={stacked ? "true" : "false"}
      data-sticky={sticky ? "true" : undefined}
      style={inset !== undefined ? ({ "--zen-form-actions-inset": paddingValue(inset), ...style } as CSSProperties) : style}
    >
      {stacked ? largeButtons(children) : children}
    </div>
  );
});
