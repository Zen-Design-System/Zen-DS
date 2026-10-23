/**
 * The `data-*` attributes among a component's other props. Every component forwards them to its root (user, 2026-10-23:
 * the AI UI renderer's `data-ai-ui-id`, test ids, analytics hooks); only `data-*`, so no other HTML attribute changes
 * what a component renders. Spread it first on the root, so the component's own `data-*` styling hooks win.
 */
export function dataAttributes(props: object): { [key: `data-${string}`]: string | number | boolean | undefined } {
  const out: { [key: `data-${string}`]: string | number | boolean | undefined } = {};
  for (const [key, value] of Object.entries(props)) if (key.startsWith("data-")) out[key as `data-${string}`] = value as string | number | boolean | undefined;
  return out;
}
