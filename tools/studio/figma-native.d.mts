// Types for figma-native.mjs (a Studio export as Figma's own clipboard: ⌘V on the Zen file's canvas).

/** The definition pack (docs/figma-contracts/native-pack.json, tools/studio/native-pack.mjs). */
export type NativePack = {
  file: string;
  read: string;
  sets: Record<string, { name: string; props: [string, string, string, unknown][]; variants: string[] }>;
  symbols: Record<string, { set?: string; name: string; w: number; h: number; mode?: string; defs: Record<string, string>; props?: [string, string, string, unknown][]; nodes: unknown[][] }>;
  styles: Record<string, [string, string, Record<string, unknown>?]>;
  variables: Record<string, [string, string]>;
  contents: Record<string, Record<string, unknown>[]>;
};

/** The paste's NODE_CHANGES message for an export (pure): its root frame's id and what could not be written. */
export function nativeMessage(pkg: unknown, pack: unknown): { message: Record<string, unknown>; root: { sessionID: number; localID: number }; notes: string[] };
/** The text/html Figma pastes for an export. */
export function figmaPasteHtml(pkg: unknown, pack: unknown): Promise<{ html: string; notes: string[] }>;
export function layerKey(name: string): string;
export function parsePath(d: string, sx?: number, sy?: number): { start: [number, number]; segments: { c1?: [number, number]; c2?: [number, number]; to: [number, number] }[]; closed: boolean }[];
export function pathBounds(subpaths: ReturnType<typeof parsePath>): { minX: number; minY: number; maxX: number; maxY: number };
export function vectorNetwork(subpaths: ReturnType<typeof parsePath>, dx?: number, dy?: number): Uint8Array;
export function indexPack(pack: unknown): unknown;
