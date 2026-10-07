import type { PlatformPage } from "../PlatformExamples";
import { appLayerExamples } from "../PlatformAppLayer";
import { typographyHierarchyExamples } from "../PlatformTypographyHierarchy";
import { setPageExamples } from "./pageExamples";
import type { ExampleDef, ExamplePageModule } from "./types";

/* Rebuilt examples (2026-09-30 brief: docs/research/example-rebuild-brief-2026-09-30.md). Each page lives in its own
   file, pages/<page>.tsx, so pages can be written in parallel without touching a shared file. A page listed here
   replaces that page's older examples. */
const modules = import.meta.glob<ExamplePageModule>("./pages/*.tsx", { eager: true });

export const rebuiltExamples: Partial<Record<PlatformPage, ExampleDef[]>> = {};
for (const mod of Object.values(modules)) {
  // The page's own records (no copies): a hot update changes them in place (hotData.ts), and the readers see it. A
  // whole screen takes the whole row through isWideExample.
  if (mod?.page && Array.isArray(mod.examples) && mod.examples.length) rebuiltExamples[mod.page] = mod.examples;
}

// Every component and mobile page reads its examples from its pages/<page>.tsx.
const examples: Partial<Record<PlatformPage, ExampleDef[]>> = { ...rebuiltExamples };
// Phase-2 app layer examples (src/platform/appLayer/*): appended, so a group can add to an existing page too.
// A rebuilt page shows only its own examples, so app-layer extras are not appended to it.
for (const [page, list] of Object.entries(appLayerExamples)) if (!(page in rebuiltExamples)) examples[page as PlatformPage] = [...(examples[page as PlatformPage] ?? []), ...list];
// Typography › Content hierarchy: one example per page type (master / child, desktop / phone) and emphasis inside a level.
examples.typography = [...(examples.typography ?? []), ...typographyHierarchyExamples];
// Readers that must stay out of an example's hot update (Zen Studio's inspector) look the lists up in pageExamples.ts.
setPageExamples(examples);

/**
 * The examples a page shows (rebuilt pages, app-layer extras, typography hierarchy). Declared here, not re-exported
 * from pageExamples.ts: the build treats src modules as side-effect free, so a module whose only export is a re-export
 * is dropped together with the composition above and the docs would show no examples. An example edit hot-updates this
 * module and the two that import it (PlatformShowcases, the Studio board); they export components only, so Fast
 * Refresh re-renders them and the update stops there.
 */
export function getPageExamples(page: PlatformPage): ExampleDef[] {
  return examples[page] ?? [];
}
