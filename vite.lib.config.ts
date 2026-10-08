import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Library build (`npm run build:lib`) — the installable `@zen-ds/react` package.
 *
 * - ES modules only, one output file per source module (`preserveModules`) so apps tree-shake down to the components
 *   they import. React stays a peer dependency (external).
 * - Component CSS is extracted into `dist/components.css`; `scripts/build-lib-css.mjs` then assembles the public
 *   `dist/styles.css` (Inter font + tokens + text styles + effects + components). Vite's lib mode would inline the
 *   font files as base64, which is why fonts are not imported here.
 * - Every file under `components/` starts with "use client" so React Server Components frameworks can import them.
 * - The docs platform (`src/platform`, `src/foundations`) is not reachable from these entries.
 *
 * `ZEN_LIB_OUT` overrides the output folder (used by experiments; the package always ships `dist/`).
 */
const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: process.env.ZEN_LIB_OUT ?? "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: {
        index: `${src}/index.ts`,
        "icons/all": `${src}/icons/all.ts`,
        "icons/names": `${src}/icons/names.ts`,
        tokens: `${src}/tokens/index.ts`,
      },
      formats: ["es"],
      cssFileName: "components",
    },
    rolldownOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/],
      output: {
        preserveModules: true,
        preserveModulesRoot: src,
        // Name each file after its source path. The default `[name]` collides on case-insensitive disks
        // (Button.tsx vs button.css → "Button2.js"), so CSS proxies keep their extension.
        entryFileNames: (chunk) => {
          const id = chunk.facadeModuleId;
          if (!id || !id.startsWith(src)) return "[name].js";
          const relative = path.relative(src, id).split(path.sep).join("/");
          return /\.(tsx?|jsx?|mjs)$/.test(relative) ? relative.replace(/\.(tsx?|jsx?|mjs)$/, ".js") : `${relative}.js`;
        },
        banner: (chunk) => (chunk.fileName.startsWith("components/") ? '"use client";' : ""),
      },
    },
  },
});
