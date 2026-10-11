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
import { assetBlob } from "../assets/uploads";
import { resolveMedia } from "../library/media";

/*
 * Export › Figma (core rebuild Q4, spec docs/research/studio-figma-push-spec-2026-10-12.md §3.2): a page as the
 * `.figma.json` the Zen plugin's Import › Import from Studio places as a frame of library instances (tools/studio/
 * figma-push.mjs). Printed from the page's document with its ids, so the keys stay put and importing the page again
 * updates the same layers. Its pictures go inside the file (the plugin has no network): an upload from this browser's
 * store, a library photo or any other URL fetched. Loaded with the Export panel's Figma tab.
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

/** A blob as base64 (no data: prefix). */
const base64Of = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/** A picture's bytes: `zen-asset:<id>` from the uploads store, anything else from its URL (`zen-media:` through the library). */
async function pictureBytes(src: string): Promise<string | null> {
  try {
    if (src.startsWith("zen-asset:")) {
      const blob = await assetBlob(src.slice("zen-asset:".length));
      return blob ? await base64Of(blob) : null;
    }
    const url = String(resolveMedia(src));
    if (url.startsWith("zen-media:")) return null;
    const response = await fetch(url);
    return response.ok ? await base64Of(await response.blob()) : null;
  } catch {
    return null;
  }
}

export async function exportFigma({ id, title, text, doc }: { id: string; title: string; text: string; doc?: PageDoc | null }): Promise<FigmaExport> {
  const source = doc ? printPage(doc, { ids: true }) : text;
  const { pkg, notes } = figmaPackage(source, { mapping: repoMapping(), nestedLayers: NESTED_LAYERS, page: { id, title } });
  if (!pkg) return { error: notes.join("; ") || "The page has no Screen to export" };
  const images = pkg.images ?? {};
  for (const src of Object.keys(images)) {
    images[src] = await pictureBytes(src);
    if (!images[src]) notes.push(`the picture ${src} could not be read: Figma keeps the component's own`);
  }
  return { file: `${id}.figma.json`, json: `${JSON.stringify(pkg, null, 2)}\n`, notes };
}
