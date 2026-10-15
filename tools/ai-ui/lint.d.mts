import type { UiSpec } from "../../src/ai-ui/spec.mjs";
import type { ValidateOptions, ValidationResult } from "../../src/ai-ui/validate.mjs";

export type LintFinding = { rule: string; severity: "error" | "warn"; message: string; guideline: string; tag: string; line: number; id: string | null };
export type LintOptions = { consumer?: boolean; file?: string };
export function lintSpec(spec: UiSpec, catalog: unknown, options?: LintOptions): LintFinding[];
export function checkSpec(spec: UiSpec, catalog: unknown, options?: LintOptions & ValidateOptions): { ok: boolean; validation: ValidationResult; lint: LintFinding[]; code: string | null };
