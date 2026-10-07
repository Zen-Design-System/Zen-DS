// Types of tools/studio/standins.mjs for the Studio client (allowJs is off).
export type Required = { props?: Record<string, string>; fields?: Record<string, Record<string, string>> };
export const REQUIRED_FUNCTIONS: Record<string, Required>;
export function standInKind(signature: string): "void" | "null" | "string" | null;
export function requiredFunctions(component: string): Required | null;
export function isColumnCell(component: string, prop: string, field: string): boolean;
export function showsAsText(value: unknown): value is string | number;
