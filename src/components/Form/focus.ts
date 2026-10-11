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

/**
 * In an AutocompleteField, what needs fixing: the Error tags (Tag State=Error, its Remove button), then the Add Item
 * button. A valid tag's Remove button is never the target (its first focusable control otherwise), so a blocked submit
 * does not land on a value that is fine, one Enter away from removing it.
 */
const AUTOCOMPLETE_TARGETS = '.zen-tag[data-state="error"], .zen-autocomplete__add';

function firstFocusableIn(element: Element): HTMLElement | null {
  if (canFocus(element)) return element;
  return [...element.querySelectorAll(FOCUSABLE)].find(canFocus) ?? null;
}

/**
 * The control to focus for an invalid element: itself, the checked radio of a group, an AutocompleteField's first Error
 * tag (else its Add button), or its first focusable control.
 */
function focusTargetOf(element: Element): HTMLElement | null {
  if (canFocus(element)) return element;
  const checked = [...element.querySelectorAll('input[type="radio"]:checked')].find(canFocus);
  if (checked) return checked;
  if (element.matches(".zen-autocomplete")) {
    for (const part of element.querySelectorAll(AUTOCOMPLETE_TARGETS)) {
      const target = firstFocusableIn(part);
      if (target) return target;
    }
  }
  return firstFocusableIn(element);
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

/**
 * After a submit handler (awaited): calls `done` with the number of invalid fields in `form` once the handler's errors
 * have rendered. React renders a state update in a task of its own, which the next animation frame can come before, so
 * a look that finds nothing tries again on the following frames (`frames` in all) before it settles on 0. A form that
 * is gone or inert (a valid submit closed the modal) counts 0 at once. Returns a cancel function.
 */
export function afterErrorsRender(form: HTMLElement, done: (count: number) => void, frames = 6): () => void {
  let handle = 0;
  let left = frames;
  const look = () => {
    const live = form.isConnected && !form.closest("[inert]");
    const count = live ? countInvalidFields(form) : 0;
    left -= 1;
    if (count || !live || left <= 0) done(count);
    else handle = requestAnimationFrame(look);
  };
  handle = requestAnimationFrame(look);
  return () => cancelAnimationFrame(handle);
}
