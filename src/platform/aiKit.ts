// The Zen AI kit for Figma, built in the browser from the repo's own files (tools/ai-kit/kit.mjs lays it out and writes
// the generated references; build.mjs --check verifies that these globs read the same sources). Loaded only when
// someone downloads the kit (Installation › AI kit for Figma), so none of it is in the docs' first bundle.
import { zipFiles } from "../../tools/studio/zip.mjs";
import { buildKit, KIT_NAME } from "../../tools/ai-kit/kit.mjs";

const textFiles = import.meta.glob<string>(
  [
    "/tools/ai-kit/files/*",
    "/skills/zen-figma-design/**/*",
    "/docs/component-usage-rules.md",
    "/skills/zen-component-usage/references/design-principles.md",
    "/skills/zen-responsive-screens/references/responsive-principles.md",
    "/skills/zen-component-usage/references/ux-principles.md",
    "/skills/zen-component-usage/references/product-patterns.md",
    "/skills/zen-component-usage/references/dashboard-layout.md",
    "/docs/guidelines/*.md",
  ],
  { query: "?raw", import: "default" },
);
const contractFile = import.meta.glob<unknown>("/docs/figma-contracts/component-properties.json", { import: "default" });
const tokenFiles = import.meta.glob<unknown>(
  "/tokens/source/figma/{mode-colors-semantic,spacing,corner-radius,breakpoint-grids,emphasis-level,typography-configuration,global-dimensions}.json",
  { import: "default" },
);
const styleFiles = import.meta.glob<unknown>(["/styles/source/figma/styles.json", "/styles/source/figma/text-styles.json"], { import: "default" });

async function load<T>(files: Record<string, () => Promise<T>>) {
  return Object.fromEntries(await Promise.all(Object.entries(files).map(async ([file, read]) => [file.replace(/^\//, ""), await read()] as const)));
}

/** Builds the kit and saves it as zen-figma-ai-kit.zip; resolves to the number of files in it. */
export async function downloadAiKit(): Promise<number> {
  const [sources, contract, tokens, styles] = await Promise.all([load(textFiles), load(contractFile), load(tokenFiles), load(styleFiles)]);
  const files = buildKit({
    sources,
    contract: contract["docs/figma-contracts/component-properties.json"],
    tokenFiles: Object.fromEntries(Object.entries(tokens).map(([file, json]) => [file.replace(/^.*\/|\.json$/g, ""), json])),
    styles: styles["styles/source/figma/styles.json"],
    textStyles: styles["styles/source/figma/text-styles.json"],
  });
  const blob = new Blob([zipFiles(files) as Uint8Array<ArrayBuffer>], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${KIT_NAME}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return files.length;
}
