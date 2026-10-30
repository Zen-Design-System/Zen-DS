import { FIGMA_PROPS } from "./figmaProps.generated";
import { groupsFromFigma, propGroupsOf, type ComponentGroups } from "./propGroups";

/**
 * The Figma component a component draws inside its own set, whose properties Figma shows on the instance too: Metric-Card
 * holds a Metric-Inline, so a MetricCard's switches are that Metric's (Trend, Hint, Label-Icon, Custom…, E2E SP-13/SP-20)
 * beside the Metric-Card's Type and its Card. Only the Inspector reads them: push and pull keep MetricCard on Metric-Card.
 */
const HOLDS: Record<string, string> = { MetricCard: "Metric" };

/**
 * Code props a component's Figma set shows on a nested primitive the read does not reach, listed after Figma's own
 * rows so the Design tab can still set them: Bottom-Navigation's labels live on each Nav-Item (walk W-24, 2026-10-29:
 * the tab names typed in never showed).
 */
const CODE_ROWS: Record<string, ReadonlyArray<{ prop: string; label: string }>> = { BottomNavigation: [{ prop: "showLabels", label: "Show labels" }] };

/**
 * The Properties groups of a component: the hand-written ones (propGroups.ts: TopNavigation, with its nested layers),
 * else the ones generated from the Figma read (figmaProps.generated.ts, every mapped component), else null (one list).
 */
export function componentGroupsOf(component: string): ComponentGroups | null {
  const own = propGroupsOf(component);
  if (own) return own;
  const figma = FIGMA_PROPS[component];
  if (!figma) return null;
  const groups = figmaGroupsOf(component, figma);
  const extra = CODE_ROWS[component];
  return extra ? { ...groups, after: [...groups.after, ...extra] } : groups;
}

function figmaGroupsOf(component: string, figma: (typeof FIGMA_PROPS)[string]): ComponentGroups {
  const inner = HOLDS[component] ? FIGMA_PROPS[HOLDS[component]] : undefined;
  if (!inner) return groupsFromFigma(figma);
  const has = (prop: string) => figma.own.some((row) => row.prop === prop) || figma.toggles.some((toggle) => toggle.prop === prop);
  return groupsFromFigma({
    ...figma,
    own: [...figma.own, ...inner.own.filter((row) => !has(row.prop))],
    toggles: [...figma.toggles, ...inner.toggles.filter((toggle) => !has(toggle.prop))],
  });
}
