export function instanceLayerPaths<T extends { name: string; props?: Record<string, unknown>; children?: unknown[] }>(root: T | null | undefined, useName?: (node: T) => string | null | undefined): Map<T, string>;
export const WORDS_KEY: "children";
export function nestedValueKey(kind: "variant" | "props", name: string): string;
export const NESTED_VALUE_KEY: RegExp;
