import { keepOnHotUpdate } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";

/* ───────────── Pages and examples ───────────── */

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};
