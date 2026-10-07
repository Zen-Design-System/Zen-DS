/*
 * Props a component takes from another Zen component's props type, which the generated API leaves out
 * (scripts/build-api.mjs lists a component's own props): AvatarStack extends Omit<AvatarProps, …>, BadgeCounter
 * Omit<BadgeProps, …>, and NumberField is `Omit<InputFieldProps, …> & {…}`. Read from the API's `extends` clause and, for
 * a props type written as an alias (which build-api does not read), from ALIAS_EXTENDS, which inheritedProps.selftest.mjs
 * checks against the source. Pure (no runtime imports): the Inspector's propSchema.ts and
 * tools/studio/figma-props-build.mjs both use it.
 */

type Prop = { name: string };
type Entry<P extends Prop> = { name: string; extends?: string | null; props: P[] };

/** Props types written as an alias (`type NumberFieldProps = Omit<InputFieldProps, …> & {…}`): their Zen part, as the
 *  source writes it. Empty since 2026-10-07: scripts/build-api.mjs now documents an `Omit<SameFileType, …>` base itself
 *  (NumberField and TextAreaField list the field props in docs/api), so they are own props here. */
export const ALIAS_EXTENDS: Readonly<Record<string, string>> = {};

/** Props types no component is named after, and the component whose documented props are theirs (InputField's own props
 *  are CommonFieldProps's, plus onValueChange). */
const TYPE_OWNER: Readonly<Record<string, string>> = { CommonFieldProps: "InputField" };

/** Inherited props a component sets itself, so a value from outside does nothing (BadgeCounter renders leadingIcon={false}). */
const SET_BY_COMPONENT: Readonly<Record<string, readonly string[]>> = { BadgeCounter: ["leadingIcon"] };

/** Splits an `extends` clause at its top-level commas ("HTMLAttributes<HTMLElement>, LayoutSizingProps"). */
export function splitTopLevel(clause: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < clause.length; index++) {
    const char = clause[index];
    if (char === "<" || char === "(") depth++;
    else if (char === ">" || char === ")") depth--;
    else if (char === "," && depth === 0) {
      parts.push(clause.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(clause.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** `Omit<X, "a" | "b">` → X and the omitted keys; anything else → itself, nothing omitted. */
export function omitOf(clause: string): { base: string; omitted: Set<string> } {
  const omit = /^Omit<\s*([\s\S]+?)\s*,\s*([^,]+)>$/.exec(clause.trim());
  if (!omit) return { base: clause.trim(), omitted: new Set() };
  return { base: omit[1], omitted: new Set([...omit[2].matchAll(/"([^"]+)"/g)].map((match) => match[1])) };
}

/** The clauses a component's props type builds on: its API `extends`, then its alias's Zen part (ALIAS_EXTENDS). */
export const extendsClauses = (schema: { name: string; extends?: string | null }): string[] => [...splitTopLevel(schema.extends ?? ""), ...splitTopLevel(ALIAS_EXTENDS[schema.name] ?? "")];

/** The Zen component a props type belongs to ("AvatarProps" → "Avatar", "CommonFieldProps" → "InputField"), or null. */
export const ownerOf = (base: string): string | null => TYPE_OWNER[base] ?? /^(\w+)Props$/.exec(base)?.[1] ?? null;

/**
 * The props `schema` inherits from other Zen components' props types (their own and, in turn, inherited ones), minus
 * the Omit<…> keys, the props it declares and the ones it sets itself, in the parent's order. `lookup` finds a
 * component's API entry.
 */
export function inheritedProps<P extends Prop>(schema: Entry<P>, lookup: (name: string) => Entry<P> | null, depth = 0): P[] {
  if (depth > 3) return [];
  const own = new Set([...schema.props.map((prop) => prop.name), ...(SET_BY_COMPONENT[schema.name] ?? [])]);
  const out: P[] = [];
  for (const clause of extendsClauses(schema)) {
    const { base, omitted } = omitOf(clause);
    const owner = ownerOf(base);
    const parent = owner && owner !== schema.name ? lookup(owner) : null;
    if (!parent) continue;
    for (const prop of [...parent.props, ...inheritedProps(parent, lookup, depth + 1)]) {
      if (own.has(prop.name) || omitted.has(prop.name) || out.some((other) => other.name === prop.name)) continue;
      out.push(prop);
    }
  }
  return out;
}
