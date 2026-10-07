// Types of tools/studio/browser-compile.mjs for the Studio client (allowJs is off).
export type CompiledMedia = { key: string; kind: "media" | "asset"; file: string; name: string };
export type Compiled = {
  code: string;
  component: string;
  screens: Array<{ id: string; title: string; device: string; states: string[] }>;
  overlays: string[];
  handlers: string[];
  media: CompiledMedia[];
};
export function compileReact(text: string, options?: { file?: string; mediaFile?: (kind: "media" | "asset", key: string) => string }): Compiled | { error: string };
export function componentName(title: string): string;
