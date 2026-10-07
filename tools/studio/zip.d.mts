// Types of tools/studio/zip.mjs for the Studio client (allowJs is off).
export type ZipInput = { path: string; data: string | Uint8Array; date?: Date };
export function crc32(bytes: Uint8Array): number;
export function zipFiles(files: ZipInput[], options?: { date?: Date }): Uint8Array;
export function unzipFiles(bytes: Uint8Array): Array<{ path: string; data: Uint8Array }>;
