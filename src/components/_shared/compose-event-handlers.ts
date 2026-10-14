/**
 * Runs the consumer's handler first, then the component's own, unless the consumer called `event.preventDefault()`
 * (Radix `composeEventHandlers`). This is how an app opts out of built-in behaviour such as "Enter activates".
 */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  external: ((event: E) => void) | undefined,
  internal: ((event: E) => void) | undefined,
  { checkForDefaultPrevented = true } = {},
): (event: E) => void {
  return (event) => {
    external?.(event);
    if (!checkForDefaultPrevented || !event.defaultPrevented) internal?.(event);
  };
}
