// Types of figma-push.mjs (a Studio page as the Figma JSON the Zen plugin imports).
import type { FigmaMapping } from "./figma-map.mjs";

import type { LibraryKeys, LibraryKeyTable } from "./library-keys.mjs";

/** Another page's component a page's instances show (Libraries' project components): its page and title, its Studio id, its definition. */
export type ProjectComponent = { page: string; title: string; local: string; spec: Record<string, unknown> };
export type FigmaPackage = { format: "zen-studio-figma"; version: 1; page: { id: string | null; title: string; version?: string; frame?: string }; frame: Record<string, unknown>; images?: Record<string, string | null>; library?: LibraryKeys; components?: ProjectComponent[] };
type Options = { mapping: FigmaMapping; nestedLayers?: Readonly<Record<string, Readonly<Record<string, string>>>>; newId?: () => string; /** The project's other pages by id (their text), for `<Use page>`. */ pages?: Readonly<Record<string, string>>; /** This page's id (a `<Use page>` naming it is one of its own). */ pageId?: string; /** Only this component of the page (another page's instance needs it). */ componentOf?: string; components?: Map<string, ProjectComponent | null> };
export function figmaIdOf(docId: string | null | undefined): string | undefined;
export function figmaFromPage(text: string, options: Options): { frame?: Record<string, unknown> | null; component?: Record<string, unknown> | null; notes: string[]; images?: string[]; components?: ProjectComponent[] };
export function figmaPackage(text: string, options: Options & { page?: { id?: string; title?: string }; libraryKeys?: LibraryKeyTable }): { pkg: FigmaPackage | null; notes: string[]; images: string[] };
