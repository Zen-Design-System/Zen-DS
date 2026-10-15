import type { SpecOp } from "../../src/ai-ui/ops.mjs";
import type { UiSpec } from "../../src/ai-ui/spec.mjs";
import type { ValidationResult } from "../../src/ai-ui/validate.mjs";
import type { LintFinding } from "./lint.mjs";

export type ChatMessage = { role: "user" | "assistant"; content: string };
/** The app's model call: the system prompt and the conversation so far; returns the reply text. */
export type ModelFn = (call: { system: string; messages: ChatMessage[] }) => Promise<string>;
export type JudgeOptions = { chrome?: boolean; experimental?: boolean; lint?: boolean };
export type Verdict = { ok: boolean; validation: ValidationResult; lint: LintFinding[] };
export type ComposeAttempt = { reply: string; text: string; spec: UiSpec | null; ok: boolean; validation: ValidationResult | null; lint: LintFinding[] };
export type ComposeResult = { ok: boolean; text: string; spec: UiSpec | null; components: string[]; attempts: ComposeAttempt[]; messages: ChatMessage[] };
export type EditAttempt = { reply: string; ok: boolean; kind: "ops" | "state" | "spec" | "text" | "none"; validation: ValidationResult | null; lint: LintFinding[]; error?: string };
export type EditResult = { ok: boolean; kind: EditAttempt["kind"]; text: string; spec: UiSpec; ops: SpecOp[]; state: Record<string, unknown> | null; attempts: EditAttempt[]; messages: ChatMessage[] };

export function composerRules(): string;
export function tier1(catalog: unknown, options?: { chrome?: boolean; experimental?: boolean; props?: boolean }): string;
export const STRUCTURE: readonly string[];
export function tier2(catalog: unknown, names: string[], options?: { brief?: string[] }): string;
export function buildSystemPrompt(catalog: unknown, options?: { components?: string[]; chrome?: boolean; experimental?: boolean; rules?: string }): string;
export function extractJson(text: string): unknown;
export function feedbackFor(verdict: { validation: ValidationResult; lint?: LintFinding[] }): string;
export function judge(spec: unknown, catalog: unknown, options?: JudgeOptions): Verdict;
export function composeUi(input: JudgeOptions & { prompt: string; catalog: unknown; model: ModelFn; data?: Record<string, unknown>; state?: Record<string, unknown>; history?: ChatMessage[]; components?: string[]; pick?: boolean; maxAttempts?: number; maxPick?: number }): Promise<ComposeResult>;
export function composeEdit(input: JudgeOptions & { prompt: string; spec: UiSpec; state?: Record<string, unknown>; catalog: unknown; model: ModelFn; history?: ChatMessage[]; maxAttempts?: number }): Promise<EditResult>;
