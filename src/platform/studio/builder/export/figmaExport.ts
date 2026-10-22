import contract from "../../../../../docs/figma-contracts/component-properties.json";
import libraryKeys from "../../../../../docs/figma-contracts/library-keys.json";
import api from "../../../api.generated.json";
import { docFromText, printPage, sha1, type PageDoc } from "../../../../../tools/studio/browser-engine.mjs";
import { onlyFrame } from "../../../../../tools/studio/figma-clip.mjs";
import { apiPropsOf, figmaMapping, type FigmaMapping } from "../../../../../tools/studio/figma-map.mjs";
import { figmaPackage, type FigmaPackage } from "../../../../../tools/studio/figma-push.mjs";
import type { LibraryKeyTable } from "../../../../../tools/studio/library-keys.mjs";
import { iconNames } from "../../../../icons/generated/names";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { FIGMA_PROPS } from "../../inspector/figmaProps.generated";
import { NESTED_LAYERS } from "../../inspector/nestedLayers.generated";
import { DATA_SLOTS } from "../../slots/dataSlots";
import { assetBlob } from "../assets/uploads";
import { keepFigmaExport } from "../store/pageStore";
import { resolveMedia } from "../library/media";
import { projectPageTexts } from "../../project/projectLibrary";

/*
 * Export › Figma (core rebuild Q4, spec docs/research/studio-figma-push-spec-2026-10-12.md §3.2): a page as the
 * `.figma.json` the Zen plugin's Import › Import from Studio places as a frame of library instances (tools/studio/
 * figma-push.mjs). Printed from the page's document with its ids, so the keys stay put and importing the page again
 * updates the same layers. Its pictures go inside the file (the plugin has no network): an upload from this browser's
 * store, a library photo or any other URL fetched. Loaded with the Export panel's Figma tab.
 * Each export has a version (a hash of its frame) the plugin keeps on the frame; the page keeps the pull of that frame
 * and itself beside it (keepFigmaExport), the base a later Update from Figma compares the designer's frame with.
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

export type FigmaExport = { file: string; json: string; pkg: FigmaPackage; notes: string[] } | { error: string };

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

/**
 * `frame`: one frame of the page (⌘C on a frame, Copy for Figma; tools/studio/figma-clip.mjs), named on the export so the
 * plugin tells two frames of a page apart. Its export is not kept: Update from Figma compares a whole page's export.
 */
export async function exportFigma({ id, title, text, doc, frame }: { id: string; title: string; text: string; doc?: PageDoc | null; frame?: string }): Promise<FigmaExport> {
  const framed = frame ? onlyFrame(doc ?? docFromText(text).doc, frame) : null;
  if (frame && !framed) return { error: "That frame is no longer on the page" };
  const shown = framed ?? doc;
  const source = shown ? printPage(shown, { ids: true }) : text;
  // With the library's keys the plugin binds the frame in any file that uses the published Zen library, not only Zen's.
  // The project's other pages: an instance of one of their components goes as its main's layers (figma-push.mjs).
  const pages = source.includes("page=") ? await projectPageTexts(id) : {};
  const { pkg, notes } = figmaPackage(source, { mapping: repoMapping(), nestedLayers: NESTED_LAYERS, page: { id, title }, libraryKeys: libraryKeys as LibraryKeyTable, pages });
  if (!pkg) return { error: notes.join("; ") || "The page has no Screen to export" };
  if (frame) pkg.page.frame = frame;
  // Only a page with its document has keys that stay put (its element ids): its export is kept for Update from Figma.
  if (doc && !frame) {
    const version = sha1(JSON.stringify(pkg.frame)).slice(0, 12);
    pkg.page.version = version;
    try {
      const { pageFromFigma } = await import("../../../../../tools/studio/figma-pull.mjs");
      const base = pageFromFigma({ ...pkg.frame, page: id, version }, { mapping: repoMapping() }).doc;
      await keepFigmaExport(id, { version, base, synced: doc });
    } catch (error) {
      // The export itself stands; a later Update from Figma compares with the page as it is then (two ways).
      notes.push(`this export is not kept for Update from Figma (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  const images = pkg.images ?? {};
  for (const src of Object.keys(images)) {
    images[src] = await pictureBytes(src);
    if (!images[src]) notes.push(`the picture ${src} could not be read: Figma keeps the component's own`);
  }
  return { file: `${id}.figma.json`, json: `${JSON.stringify(pkg, null, 2)}\n`, pkg, notes };
}
