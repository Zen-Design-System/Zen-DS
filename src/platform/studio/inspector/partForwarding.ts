/*
 * A deep-selected part's props its owner passes on unchanged (Figma's exposed nested instance properties): the part's
 * `direction` is the owner's `actionsDirection`, so the part is edited there. Pure (no React, no DOM, no value imports:
 * the caller passes partProps.generated.ts), so tools/studio/part-props.selftest.mjs imports it directly.
 */

export type PartTable = Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>>;

/**
 * Part prop → owner prop for a part `chain` levels under its owner: `chain` names the components from below the owner
 * down to the part (wrappers such as a Portal included; the part last). Each component takes its props from the nearest
 * one above it whose JSX renders it with them (partProps.generated.ts), and through that one from the owner, so a prop
 * reaches the part only along an unbroken line of props passed on unchanged.
 */
export function forwardedProps(owner: string, chain: readonly string[], table: PartTable): Record<string, string> {
  if (!chain.length) return {};
  const names = [owner, ...chain];
  // reach[i]: the owner prop behind each prop of names[i] (null for the owner itself: every prop is its own).
  const reach: Array<Readonly<Record<string, string>> | null> = [null];
  for (let index = 1; index < names.length; index++) {
    const mapped: Record<string, string> = {};
    for (let above = index - 1; above >= 0; above--) {
      const passes = table[names[above]]?.[names[index]];
      if (!passes) continue;
      const base = reach[above];
      for (const [prop, from] of Object.entries(passes)) {
        const ownerProp = base === null ? from : base[from];
        if (ownerProp) mapped[prop] = ownerProp;
      }
      break;
    }
    reach.push(mapped);
  }
  return { ...(reach[names.length - 1] ?? {}) };
}
