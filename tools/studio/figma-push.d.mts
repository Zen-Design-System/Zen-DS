// Types of figma-push.mjs (a Studio page as the Figma JSON the Zen plugin imports).
import type { FigmaMapping } from "./figma-map.mjs";

import type { LibraryKeys, LibraryKeyTable } from "./library-keys.mjs";

export type FigmaPackage = { format: "zen-studio-figma"; version: 1; page: { id: string | null; title: string; version?: string; frame?: string }; frame: Record<string, unknown>; images?: Record<string, string | null>; library?: LibraryKeys };
type Options = { mapping: FigmaMapping; nestedLayers?: Readonly<Record<string, Readonly<Record<string, string>>>>; newId?: () => string };
export function figmaIdOf(docId: string | null | undefined): string | undefined;
export function figmaFromPage(text: string, options: Options): { frame: Record<string, unknown> | null; notes: string[]; images?: string[] };
export function figmaPackage(text: string, options: Options & { page?: { id?: string; title?: string }; libraryKeys?: LibraryKeyTable }): { pkg: FigmaPackage | null; notes: string[]; images: string[] };
