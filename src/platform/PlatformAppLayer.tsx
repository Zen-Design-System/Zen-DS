import * as content from "./appLayer/content";
import * as form from "./appLayer/form";
import * as layout from "./appLayer/layout";
import * as navigation from "./appLayer/navigation";
import * as panels from "./appLayer/panels";
import * as shell from "./appLayer/shell";
import * as templates from "./appLayer/templates";
import * as text from "./appLayer/text";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./appLayer/types";

/*
 * Phase-2 app-composition layer on the platform: each group module (appLayer/*.tsx) owns its pages and examples, so
 * groups can be built independently. PlatformExamples renders the pages, PlatformApp lists them, PlatformShowcases
 * appends the examples (to new pages and to existing ones such as "toast" or "sidebar").
 */
const groups = [layout, text, navigation, content, form, shell, templates, panels];

export const appLayerPages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = Object.assign({}, ...groups.map((group) => group.pages));

export const appLayerExamples: ExampleMap = groups.reduce<ExampleMap>((all, group) => {
  for (const [page, list] of Object.entries(group.examples)) all[page] = [...(all[page] ?? []), ...list];
  return all;
}, {});
