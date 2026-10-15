import type { UiSpec } from "./spec.mjs";

/** What `extractSlots` reads from a sentence; `spans` says where each slot came from. */
export type Slots = {
  title: string | null;
  /** ISO yyyy-mm-dd. */
  date: string | null;
  /** HH:MM, 24 h. */
  time: string | null;
  people: string[] | null;
  place: string | null;
  spans: { slot: "date" | "time" | "people" | "place"; text: string; start: number; end: number; value: unknown }[];
};
export type Classification = { intent: string; confidence: number; slots?: Record<string, unknown> | null; skeleton?: UiSpec | null };
export type LivePhase = "idle" | "skeleton" | "composing" | "ready" | "error";
export type LiveState = {
  phase: LivePhase;
  intent: string | null;
  confidence: number;
  /** Tab (`accept`) kept the intent: it stays while the sentence goes on changing. */
  pinned: boolean;
  slots: Record<string, unknown> | null;
  spec: UiSpec | null;
  skeleton: UiSpec | null;
  text: string;
  answer: string | null;
  error: unknown;
};
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
export type LiveComposer = {
  input(text: string): void;
  /** Tab: keep the intent on screen while the sentence goes on. False when there is nothing to keep. */
  accept(): boolean;
  submit(text: string): Promise<void>;
  reset(): void;
  dispose(): void;
  readonly state: LiveState;
};
export type IntentRule = {
  intent: string;
  words: string[];
  /** A spec, or a template built from the slots. */
  skeleton?: UiSpec | ((slots: Record<string, unknown> | null) => UiSpec | null) | null;
  slots?: (text: string) => Record<string, unknown> | null;
};
export type PrimaryAction = { id: string | null; action: string; args: Record<string, unknown> | null };

export function createLiveComposer(options: LiveComposerOptions): LiveComposer;
export function keywordClassifier(intents: IntentRule[], options?: { minLength?: number; slots?: ((text: string) => Record<string, unknown> | null) | null }): (text: string) => Classification | null;
export function extractSlots(text: string, options?: { now?: Date; dayFirst?: boolean }): Slots | null;
export function primaryActionOf(spec: UiSpec | UiSpec["root"] | null | undefined, options?: { levels?: string[] }): PrimaryAction | null;
export function resolveArgs<T>(value: T, context?: { state?: Record<string, unknown>; data?: Record<string, unknown> }): unknown;
