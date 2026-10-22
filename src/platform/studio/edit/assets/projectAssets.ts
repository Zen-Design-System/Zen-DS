import { useEffect, useState } from "react";
import { engineNow, loadEngine } from "../../builder/engine";
import { usePages } from "../../builder/store/pageStore";
import { useLibraries } from "../../project/libraries";
import { pageComponents, projectOfPage } from "../../project/projectLibrary";
import { useStudio } from "../../store";
import type { Insertable } from "./assets";

/*
 * Libraries' project components (a live link; spec docs/research/studio-libraries-spec-2026-10-22.md, phase 2) as
 * assets: the components made (⌥⌘K) on the project's other pages, which Assets (AssetsPanel.tsx) and ⇧I
 * (builder/library/QuickInsert.tsx) list and place as `<Use of page>`.
 */

/** A component of another page of the project: its page and that page's title. */
export type ProjectAsset = { id: string; name: string; page: string; pageTitle: string; variants: number | null };

/** The project's other pages' component sets and lone mains, by page (none for a draft, or with the library off). */
export function useProjectComponents(): ProjectAsset[] {
  const localPage = useStudio((state) => state.localPage);
  const pages = usePages();
  const on = useLibraries().components;
  const [, ready] = useState(0);
  useEffect(() => { if (!engineNow()) void loadEngine().then(() => ready((count) => count + 1)); }, []);
  const project = localPage ? projectOfPage(localPage) : null;
  if (!localPage || !project || !on) return [];
  return pages.flatMap((meta) => {
    if (meta.id === localPage || projectOfPage(meta.id) !== project) return [];
    const components = pageComponents(meta.id);
    if (!components) return [];
    return [...components].flatMap(([id, entry]): ProjectAsset[] => (entry.kind === "set"
      ? [{ id, name: entry.name, page: meta.id, pageTitle: meta.title, variants: entry.variants.length }]
      : entry.set ? [] : [{ id, name: entry.name, page: meta.id, pageTitle: meta.title, variants: null }]));
  });
}

/** An instance of another page's component, as an asset: `<Use of page>`, drawn from its main there. */
export const projectInsertable = (asset: ProjectAsset): Insertable => ({ label: asset.name, root: "Use", code: (file) => (file && /^local:/.test(file) ? `<Use of="${asset.id}" page="${asset.page}" />` : null), refusal: "Project components go on a page of the project" });
