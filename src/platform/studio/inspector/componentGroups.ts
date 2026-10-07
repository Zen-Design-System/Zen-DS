import { FIGMA_PROPS } from "./figmaProps.generated";
import { groupsFromFigma, propGroupsOf, type ComponentGroups } from "./propGroups";

/**
 * The Properties groups of a component: the hand-written ones (propGroups.ts: TopNavigation, with its nested layers),
 * else the ones generated from the Figma read (figmaProps.generated.ts, every mapped component), else null (one list).
 */
export function componentGroupsOf(component: string): ComponentGroups | null {
  const own = propGroupsOf(component);
  if (own) return own;
  const figma = FIGMA_PROPS[component];
  return figma ? groupsFromFigma(figma) : null;
}
