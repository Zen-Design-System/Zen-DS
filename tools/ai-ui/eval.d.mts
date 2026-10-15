import type { ModelFn } from "./compose.d.mts";

export interface EvalExpect { kind?: "ui" | "text" | "any"; all?: string[]; any?: string[]; none?: string[] }
export interface EvalEditExpect { kind?: ("ops" | "state" | "spec" | "text") | ("ops" | "state" | "spec" | "text")[]; ops?: string[] }
export interface EvalCase {
  id: string;
  prompt: string;
  /** The classifier's expected intent; null when no intent should be confident; omit to leave the case out of that metric. */
  intent?: string | null;
  data?: Record<string, unknown>;
  state?: Record<string, unknown>;
  components?: string[];
  expect?: EvalExpect;
  edits?: { id: string; prompt: string; expect?: EvalEditExpect }[];
}
export interface PromptSet {
  intents?: { intent: string; words: string[] }[];
  data?: Record<string, unknown>;
  cases: EvalCase[];
}
export interface Usage { input: number; output: number; cacheRead: number; cacheWrite: number }
export interface EvalEditRecord {
  id: string; prompt: string; skipped?: string; ok?: boolean; kind?: string; ops?: string[]; text?: string; attempts?: number;
  validFirst?: boolean; problems?: { code: string; path: string; message: string }[]; lint?: { rule: string; id: string | null; message: string }[];
  expected?: { ok: boolean; reasons: string[] }; ms?: number; usage?: Usage; replies?: string[]; error?: string;
}
export interface EvalRecord {
  id: string; prompt: string; intent: string | null; run?: number; ok: boolean; kind: "ui" | "text" | "none" | "error"; validFirst: boolean;
  attempts: number; specAttempts: number; specValid: number; problems: { code: string; path: string; message: string }[];
  lint: { rule: string; id: string | null; message: string }[]; picked: string[]; components: string[];
  expected: { ok: boolean; reasons: string[] }; msToUi: number | null; msTotal: number; calls: number; usage: Usage;
  edits: EvalEditRecord[]; text: string; spec: object | null; replies: string[]; error?: string;
}
export interface ClassifierMetric {
  fractions: { fraction: number; correct: number; of: number; falsePositives: number; misses: number }[];
  minConfidence: number;
  details: { id: string; intent: string | null; firstConfidentAt: number | null; guesses: { fraction: number; intent: string | null; confidence: number }[] }[];
  positives: number;
  negatives: number;
}
export interface EvalSummary {
  cases: number; ok: number; errors: number;
  validFirst: { n: number; of: number }; validFinal: { n: number; of: number }; specAttempts: { valid: number; of: number };
  wrongUi: { n: number; of: number }; textAnswers: number; attemptsMean: number;
  problems: { code: string; count: number }[]; lint: { rule: string; count: number }[];
  msToUi: { median: number | null; p90: number | null; max: number | null; n: number }; msTotal: number;
  usage: Usage & { calls: number };
  edits: { n: number; ok: number; expected: number; validFirst: number };
  classifier: Pick<ClassifierMetric, "minConfidence" | "fractions" | "positives" | "negatives">;
  notMeasured: string[];
}
export interface EvalResult { records: EvalRecord[]; classifier: ClassifierMetric; summary: EvalSummary }
export interface RunEvalOptions {
  catalog: object;
  /** Returns the model function for one case; `onUsage` receives each response's usage so tokens land on that case. */
  makeModel: (hooks: { onUsage: (usage: object) => void }) => ModelFn;
  only?: string[]; limit?: number; repeat?: number; concurrency?: number; maxAttempts?: number; pick?: boolean; chrome?: boolean; experimental?: boolean;
  onRecord?: (record: EvalRecord, index: number, total: number) => void;
}

export function loadPromptSet(file?: string): PromptSet;
export function loadCatalog(): object;
export function typesIn(spec: object, catalog: object): string[];
export function matches(expect: EvalExpect | undefined, answer: { kind: string; types: string[] }): { ok: boolean; reasons: string[] };
export function matchesEdit(expect: EvalEditExpect | undefined, outcome: { kind: string; ops?: string[] }): { ok: boolean; reasons: string[] };
export function sumUsage(list: object[]): Usage;
export function runCase(entry: EvalCase, options: Omit<RunEvalOptions, "only" | "limit" | "repeat" | "concurrency" | "onRecord"> & { data?: Record<string, unknown> }): Promise<EvalRecord>;
export function classifierMetric(cases: EvalCase[], intents?: { intent: string; words: string[] }[], options?: { fractions?: number[]; minConfidence?: number }): ClassifierMetric;
export function runEval(promptSet: PromptSet, options: RunEvalOptions): Promise<EvalResult>;
export function summarize(records: (EvalRecord | undefined)[], classifier?: ClassifierMetric): EvalSummary;
export function renderReport(result: { summary: EvalSummary; records: (EvalRecord | undefined)[]; classifier?: ClassifierMetric }, options?: { title?: string; model?: string; effort?: string; stamp?: string }): string;
export function dryModel(): ModelFn;
export function main(argv?: string[]): Promise<number>;
