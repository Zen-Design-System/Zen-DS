import type { ZenBreakpointKey } from "./screen-devices.mjs";

export { BREAKPOINTS, screenBreakpoint } from "./screen-devices.mjs";
export const RESPONSIVE_PROPS: Readonly<Record<string, string[]>>;
export const HIDE_ON_PROP: "hideOn";
export const RESPONSIVE_DEFAULTS: Readonly<Record<string, Record<string, string | number | boolean>>>;
export function isResponsiveProp(component: string, prop: string): boolean;
export function modesBreakpoint(value: unknown): ZenBreakpointKey | null;
export function perBreakpoint(value: unknown): boolean;
export function valueAt(value: unknown, breakpoint: ZenBreakpointKey): unknown;
export function hideOnList(value: unknown): ZenBreakpointKey[];
export function hiddenAt(element: { name: string; props: Record<string, unknown> }, breakpoint: ZenBreakpointKey): boolean;
export function withBreakpointValue(current: unknown, next: unknown, breakpoint: ZenBreakpointKey, fallback?: unknown): unknown;
export function atBreakpoint<T>(node: T, breakpoint: ZenBreakpointKey, count?: { resolved: number; hidden: number }): T | null;
