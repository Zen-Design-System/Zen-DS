export type HiddenValue = true | "mobile" | "desktop";
export const HIDDEN_PROP: "hidden";
export const HIDDEN_SLOTS_PROP: "hiddenSlots";
export const HIDDEN_LAYOUTS: Array<"mobile" | "desktop">;
export const STUDIO_ONLY_PROPS: Set<string>;
export function hiddenValueOf(value: unknown): HiddenValue | null;
export function hiddenOn(value: unknown, layout: "mobile" | "desktop" | undefined): boolean;
export function hiddenSlotsOf(value: unknown): string[];
export function hiddenLabel(value: unknown): string;
export function pruneHidden<T>(node: T, layout: "mobile" | "desktop" | undefined, options?: { hiddenIf?: (value: unknown) => boolean }): T | null;
/** Whether a `hidden` value reads a prototype variable (`vars.x`, `!vars.x`, `vars.x === …`; W-52 B). */
export function bindsVars(value: unknown): boolean;
