import type { UiSpec } from "./spec.mjs";

export type Problem = { severity: "error" | "warn"; code: string; path: string; message: string; hint?: string; id?: string };
export type ValidateOptions = {
  /** Allow page chrome (AppShell, Sidebar, TopNavigation…). Default false. */
  chrome?: boolean;
  /** Allow components whose status is "experimental". Default false. */
  experimental?: boolean;
  /** Which nodes must carry an id (reported as a warning). Default "interactive". */
  requireIds?: "interactive" | "all" | "none";
  maxNodes?: number;
  maxDepth?: number;
  /** A `$ref` must start with a key of spec.data, "state" or a map alias. Default false. */
  strictData?: boolean;
};
export type ValidationResult = { ok: boolean; errors: Problem[]; warnings: Problem[]; problems: Problem[] };

export function validateSpec(spec: unknown, catalog: unknown, options?: ValidateOptions): ValidationResult;
export function nearest(name: string, candidates: string[]): string | null;
