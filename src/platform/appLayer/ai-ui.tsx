import { AiUiPlayground } from "../examples/pages/ai-ui";
import { keepOnHotUpdate } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";

/*
 * AI UI (docs/ai-ui/README.md): the runtime layer for UI a model composes from the catalog at run time, shown at work
 * inside Zen AI. Not a component: a pattern page in the app layer beside Templates and Widgets. The playground and the
 * examples live in examples/pages/ai-ui.tsx.
 */
export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  "ai-ui": {
    label: "AI UI",
    eyebrow: "Patterns / AI UI",
    title: "AI-composed UI",
    description: "A person asks for something; the assistant answers with a UI spec, JSON that names Zen components and their props, validated against the catalog and rendered with the real components inside the answer. What the person picks lands in a shared state the conversation reads, and a follow-up edits the UI in place instead of rebuilding it. The model writes no code and no CSS: every look comes from the components' own props and tokens.",
    playground: AiUiPlayground,
  },
});

// The examples of this page live in src/platform/examples/pages/ai-ui.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
