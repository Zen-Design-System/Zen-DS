import contract from "../../../../../docs/figma-contracts/component-properties.json";
import api from "../../../api.generated.json";
import { printPage, type PageDoc } from "../../../../../tools/studio/browser-engine.mjs";
import { apiPropsOf, figmaMapping, type FigmaMapping } from "../../../../../tools/studio/figma-map.mjs";
import { figmaPackage } from "../../../../../tools/studio/figma-push.mjs";
import { iconNames } from "../../../../icons/generated/names";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { FIGMA_PROPS } from "../../inspector/figmaProps.generated";
import { NESTED_LAYERS } from "../../inspector/nestedLayers.generated";
import { DATA_SLOTS } from "../../slots/dataSlots";

/*
 * Export › Figma (core rebuild Q4, spec docs/research/studio-figma-push-spec-2026-10-12.md §3.2): a page as the
 * `.figma.json` the Zen plugin's Import › Import from Studio places as a frame of library instances (tools/studio/
 * figma-push.mjs). Printed from the page's document with its ids, so the keys stay put and importing the page again
 * updates the same layers. Loaded with the Export panel's Figma tab.
 */

let mapping: FigmaMapping | null = null;
const repoMapping = () => (mapping ??= figmaMapping({
  figmaProps: FIGMA_PROPS,
  contract,
  apiProps: apiPropsOf(Object.values(api as Record<string, ReadonlyArray<{ name: string; props?: ReadonlyArray<{ name: string; default?: string | null }> }>>).flat()),
  textStyles: Object.keys(typographyStyles),
  iconNames,
  dataSlots: DATA_SLOTS,
}));

export type FigmaExport = { file: string; json: string; notes: string[] } | { error: string };

export function exportFigma({ id, title, text, doc }: { id: string; title: string; text: string; doc?: PageDoc | null }): FigmaExport {
  const source = doc ? printPage(doc, { ids: true }) : text;
  const { pkg, notes } = figmaPackage(source, { mapping: repoMapping(), nestedLayers: NESTED_LAYERS, page: { id, title } });
  if (!pkg) return { error: notes.join("; ") || "The page has no Screen to export" };
  return { file: `${id}.figma.json`, json: `${JSON.stringify(pkg, null, 2)}\n`, notes };
}
