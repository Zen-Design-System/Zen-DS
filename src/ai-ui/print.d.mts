import type { UiSpec } from "./spec.mjs";

export type PrintOptions = { catalog?: unknown; componentName?: string; ids?: boolean };
export type Printed = { code: string; lines: Record<number, string>; components: string[] };
export function toJsx(spec: UiSpec, options?: PrintOptions): Printed;
