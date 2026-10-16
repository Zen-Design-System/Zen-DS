// Types of library-keys.mjs (the Zen library's keys, docs/figma-contracts/library-keys.json).

export type LibraryKeyTable = {
  note: string;
  file: string;
  read: string;
  sets: Record<string, { name: string; type: "COMPONENT_SET" | "COMPONENT"; key: string; set?: string }>;
  missing?: string[];
  icons: Record<string, string>;
  iconSets: Record<string, string>;
  collections: Record<string, string>;
  styles: { text: Record<string, string>; paint: Record<string, string>; effect: Record<string, string> };
};
/** The keys one package uses (FigmaPackage.library). */
export type LibraryAsset = { key: string; type: "COMPONENT_SET" | "COMPONENT" };
export type LibraryKeys = {
  file: string;
  read: string;
  sets: Record<string, LibraryAsset>;
  icons: Record<string, LibraryAsset>;
  styles: Record<string, string>;
  collections: Record<string, string>;
};
export const LIBRARY_FILE: string;
export const ICON_PAGE: string;
export const PART_SIZE: number;
export function fnv1a(text: string): string;
export function readCode(kind: "sets" | "icons", options?: { part?: number; ids?: string[] }): string;
export function joinParts(texts: string[]): string[][];
export function tableFrom(lines: { sets: string[][]; icons: string[][] }, options: { read: string }): LibraryKeyTable;
export function libraryKeysFor(pkg: { frame: unknown }, table: LibraryKeyTable): LibraryKeys;
export function pushSetIds(contract: { pages: Array<{ sets: Array<{ id: string }> }> }, sources: string[]): string[];
