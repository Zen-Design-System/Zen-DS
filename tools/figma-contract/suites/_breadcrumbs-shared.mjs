// Shared pieces of the Breadcrumbs suites (docs/figma-contracts/breadcrumbs.json, captured 2026-10-21).
import { child, textOf } from "./_chart-shared.mjs";

/** A Primitives/Breadcrumbs/Item/Slot instance as BreadcrumbItemData: label, Level, Emphasis and State from its Item
 *  instance, `dash` from its Dash's visibility. */
export function crumbOf(slot, index) {
  const item = child(slot, "Item");
  const dash = child(slot, "Dash");
  const main = item?.main ?? "";
  return {
    id: `c${index}`,
    label: textOf(child(item, "Label")),
    level: /Level=Master/.test(main) ? "master" : "sub",
    emphasis: /Emphasis=Medium/.test(main) ? "medium" : "default",
    state: /State=Hover/.test(main) ? "hover" : "default",
    dash: Boolean(dash && !dash.hidden),
  };
}
