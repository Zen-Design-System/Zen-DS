// Types of tools/ai-kit/kit.mjs for the docs platform (allowJs is off).
export const KIT_NAME: string;
export const SKILL: string;
export const KIT_SOURCES: {
  root: string;
  skill: string;
  rules: string;
  guidelines: string;
  contract: string;
  tokens: string;
  tokenFiles: string[];
  styles: string;
  textStyles: string;
};
export function kitPath(repoPath: string): string | null;
export function figmaComponentsMarkdown(contract: unknown): string;
export function figmaTokensMarkdown(input: { collections: Record<string, unknown>; dimensions?: Record<string, number>; styles?: unknown; textStyles?: unknown }): string;
export function buildKit(input: {
  sources: Record<string, string>;
  contract: unknown;
  tokenFiles: Record<string, unknown>;
  styles?: unknown;
  textStyles?: unknown;
  date?: Date;
}): Array<{ path: string; data: string; date: Date }>;
