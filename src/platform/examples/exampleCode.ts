/*
 * Example snippets are their render's source (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): each
 * example is a file, pages/<page>/<slug>.example.tsx, whose default export the page renders and whose text (`?raw`) the
 * Code view shows. These pure text changes are all that differs between the files and what a reader copies. No imports:
 * Node runs this file as it is (tools/code-languages/examples-check.mjs compiles what readers copy).
 */

/** The demo world (examples/data.ts) as a snippet imports it: from the file beside the reader's component. */
const DEMO_IMPORT = /(from\s+["'])(?:\.\.\/)+data(["'])/g;
/** The demo world's photos as demo.ts imports them: from ./media/ beside it. */
const MEDIA_IMPORT = /(from\s+["'])(?:\.\.\/)+(?:assets\/media|templates\/hr\/assets)\//g;

/** An example file's text as the docs show it: the demo world is imported from "./demo". */
export function exampleCode(raw: string): string {
  return raw.replace(DEMO_IMPORT, "$1./demo$2").trimEnd();
}

/** True when a snippet imports the demo world, so the Code view offers demo.ts beside it. */
export const usesDemo = (code: string) => /from\s+["']\.\/demo["']/.test(code);

/** examples/data.ts as the demo.ts a reader copies: its photos from ./media/, and a header for them instead of ours. */
export function demoFileOf(data: string): string {
  const body = data.replace(/^\/\*[\s\S]*?\*\/\s*/, "").replace(MEDIA_IMPORT, "$1./media/").trimEnd();
  return `/* Sample data and formatters for the Zen DS examples: Đìzai Studio, a product studio, on Wednesday, Sep 30, 2026,
   10:30 am. Put the photos in ./media/, or replace the data with your own. */
${body}
`;
}
