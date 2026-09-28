/**
 * Finding invalid fields in the DOM, so any form (Form, ModalForm, a plain <form>, react-hook-form) can focus the first
 * one after a failed submit. A field counts as invalid when it carries aria-invalid="true" (Zen fields set it with
 * `error`), when a FormField / FormFieldset wrapper is marked data-zen-invalid, or when an AutocompleteField shows an error.
 */
const INVALID = '[aria-invalid="true"]:not([aria-hidden="true"]), [data-zen-invalid="true"], .zen-autocomplete[data-state="error"]';
const FOCUSABLE = 'input:not([type="hidden"]), select, textarea, button, a[href], [contenteditable="true"], [tabindex]';

function canFocus(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.matches(FOCUSABLE)) return false;
  if ((element as HTMLInputElement).disabled || element.tabIndex < 0 || element.closest('[aria-hidden="true"], [inert]')) return false;
  return element.getClientRects().length > 0;
}

/** The control to focus for an invalid element: itself, the checked radio of a group, or its first focusable control. */
function focusTargetOf(element: Element): HTMLElement | null {
  if (canFocus(element)) return element;
  const checked = [...element.querySelectorAll('input[type="radio"]:checked')].find(canFocus);
  if (checked) return checked;
  return [...element.querySelectorAll(FOCUSABLE)].find(canFocus) ?? null;
}

/** Invalid fields inside `root`, in DOM (reading) order; a wrapper and the control inside it count once. */
export function invalidFields(root: ParentNode | null | undefined): Element[] {
  if (!root) return [];
  const all = [...root.querySelectorAll(INVALID)];
  return all.filter((element) => !all.some((other) => other !== element && other.contains(element)));
}

/** Number of invalid fields inside `root`. */
export function countInvalidFields(root: ParentNode | null | undefined): number {
  return invalidFields(root).length;
}

/**
 * Focuses the first invalid field inside `root` and scrolls it to the middle of its scroll area, clear of sticky
 * headers and footers. Returns the focused element, or null when nothing is invalid.
 */
export function focusFirstInvalidField(root: ParentNode | null | undefined): HTMLElement | null {
  for (const element of invalidFields(root)) {
    const target = focusTargetOf(element);
    if (!target) continue;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: "center", inline: "nearest" });
    return target;
  }
  return null;
}
