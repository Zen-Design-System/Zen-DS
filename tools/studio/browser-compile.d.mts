// Types of tools/studio/browser-compile.mjs for the Studio client (allowJs is off).
export type CompiledMedia = { key: string; kind: "media" | "asset"; file: string; name: string };
export type Compiled = {
  code: string;
  component: string;
  screens: Array<{ id: string; title: string; device: string; states: string[] }>;
  overlays: string[];
  handlers: string[];
  /** Each prototype action: where it is (frame "screen:<id>" / "overlay:<id>", "<Button> onClick"), what it does. */
  actions: Array<{ frame: string | null; where: string; action: string; target: unknown }>;
  /** The library components the code imports. */
  components: string[];
  /** The sample data's type (`export type …Mock = …;`), when the page has some. */
  dataType: string | null;
  media: CompiledMedia[];
};
export function compileReact(text: string, options?: { file?: string; mediaFile?: (kind: "media" | "asset", key: string) => string; suffix?: string }): Compiled | { error: string };
export function componentName(title: string): string;
