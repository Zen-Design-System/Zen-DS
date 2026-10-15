import type { UiSpec } from "./spec.mjs";

export type Classification = { intent: string; confidence: number; slots?: Record<string, unknown> | null; skeleton?: UiSpec | null };
export type LivePhase = "idle" | "skeleton" | "composing" | "ready" | "error";
export type LiveState = { phase: LivePhase; intent: string | null; confidence: number; slots: Record<string, unknown> | null; spec: UiSpec | null; skeleton: UiSpec | null; text: string; answer?: string | null; error: unknown };
export type LiveComposerOptions = {
  classify: (text: string, context: { signal: AbortSignal }) => Classification | null | Promise<Classification | null>;
  compose: (text: string, context: { intent: string | null; slots: Record<string, unknown> | null; signal: AbortSignal }) => Promise<UiSpec | { spec?: UiSpec | null; text?: string } | null>;
  onChange?: (state: LiveState) => void;
  /** Wait after the last keystroke before classifying. Default 300 ms. */
  debounceMs?: number;
  /** The confidence an intent needs before its UI shows. Default 0.6. */
  minConfidence?: number;
  /** How much more likely a new intent must be to replace the one on screen. Default 0.15. */
  switchMargin?: number;
  /** How long an intent stays before a weaker guess may replace it. Default 800 ms. */
  stickMs?: number;
  /** Shorter text clears the preview. Default 3. */
  minLength?: number;
};
export type LiveComposer = { input(text: string): void; submit(text: string): Promise<void>; reset(): void; dispose(): void; readonly state: LiveState };
export function createLiveComposer(options: LiveComposerOptions): LiveComposer;
export function keywordClassifier(intents: Array<{ intent: string; words: string[]; skeleton?: UiSpec | null; slots?: (text: string) => Record<string, unknown> | null }>, options?: { minLength?: number }): (text: string) => Classification | null;
