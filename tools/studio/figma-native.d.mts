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

/** An export's picture as Figma's image paint names it (nativePictures), or why the paint cannot take it. */
export type NativePicture = { hash: number[]; hex: string; name: string; width: number; height: number; bytes: Uint8Array } | { reason: string };
/** Turns a WebP picture into PNG bytes (Figma's paste takes PNG, JPEG and GIF), or null. */
export type ToPng = (bytes: Uint8Array, mime: string) => Promise<Uint8Array | null>;
/** The paste's NODE_CHANGES message for an export (pure): its root frame's id and what could not be written. */
export function nativeMessage(pkg: unknown, pack: unknown, pictures?: Map<string, NativePicture>): { message: Record<string, unknown>; root: { sessionID: number; localID: number }; notes: string[] };
/** The export's pictures (src → base64 bytes) by src, with their SHA-1, size and bytes. */
export function nativePictures(images: Record<string, string | null> | null | undefined, options?: { toPng?: ToPng | null }): Promise<Map<string, NativePicture>>;
/** A picture file's type and pixel size from its header, or null. */
export function pictureKind(bytes: Uint8Array): { mime: string; width: number; height: number } | null;
/** An image fill as Figma's IMAGE paint. */
export function imagePaint(fill: { scaleMode?: string; crop?: { x: number; y: number; width: number; height: number }; scale?: number }, picture: { hash: number[]; name: string; width?: number; height?: number }): Record<string, unknown>;
/** The text/html Figma pastes for an export; `toPng` turns a WebP picture into PNG bytes. */
export function figmaPasteHtml(pkg: unknown, pack: unknown, options?: { toPng?: ToPng | null }): Promise<{ html: string; notes: string[] }>;
export function layerKey(name: string): string;
export function parsePath(d: string, sx?: number, sy?: number): { start: [number, number]; segments: { c1?: [number, number]; c2?: [number, number]; to: [number, number] }[]; closed: boolean }[];
export function pathBounds(subpaths: ReturnType<typeof parsePath>): { minX: number; minY: number; maxX: number; maxY: number };
export function vectorNetwork(subpaths: ReturnType<typeof parsePath>, dx?: number, dy?: number): Uint8Array;
export function indexPack(pack: unknown): unknown;
