import type { PlatformPage } from "../PlatformExamples";
import type { ExampleDef } from "./types";

/* The examples each page shows, as registry.ts composed them last. This module imports no example, so an example edit
   never re-runs it: a reader that only looks examples up (Zen Studio's inspector) stays out of that hot update and
   still reads the new list. */

let examples: Partial<Record<PlatformPage, ExampleDef[]>> = {};

/** Called by registry.ts each time it runs (first load, then every hot update of an example page). */
export function setPageExamples(next: Partial<Record<PlatformPage, ExampleDef[]>>) {
  examples = next;
}

/** The examples a page shows (rebuilt pages, app-layer extras, typography hierarchy), for the docs and Zen Studio's frames. */
export function getPageExamples(page: PlatformPage): ExampleDef[] {
  return examples[page] ?? [];
}
