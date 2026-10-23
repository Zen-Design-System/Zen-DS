import type { PageDoc } from "./browser-engine.mjs";

export type FigmaExport = { version: string; at: number; base: PageDoc; synced: PageDoc };
export type FigmaPull = { base: PageDoc; synced?: PageDoc; version?: string; at: number };
export type PageFigma = { format: 1; exports: FigmaExport[]; pull?: FigmaPull };

export const FIGMA_FORMAT: 1;
export const FIGMA_EXPORTS: number;
export function emptyFigma(): PageFigma;
export function validateFigma(doc: unknown): string[];
export function joinFigma(a: PageFigma | null | undefined, b: PageFigma | null | undefined): PageFigma;
export function fitFigma(doc: PageFigma, maxBytes: number): PageFigma;
