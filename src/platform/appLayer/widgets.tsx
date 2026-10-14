import { WidgetsPlayground } from "../examples/pages/widgets";
import { keepOnHotUpdate } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";

/*
 * Widgets (docs/research/widget-patterns-spec-2026-10-14.md): whole dashboard widgets composed of Zen components, not a
 * component of their own, so the page sits in the app layer beside Templates (another page of compositions). The
 * playground and the examples live in examples/pages/widgets.tsx; each widget is a Zen Studio Widgets palette entry.
 */
export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  widgets: {
    label: "Widgets",
    eyebrow: "Patterns / Widgets",
    title: "Widgets",
    description: "Whole dashboard widgets built only from Zen components, with real copy and data: copy one into a dashboard, or insert it from the Widgets group in Zen Studio. They sit flat on the page canvas; one widget a row may stand out.",
    playground: WidgetsPlayground,
  },
});

// The examples of this page live in src/platform/examples/pages/widgets.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
