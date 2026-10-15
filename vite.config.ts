import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loopbackBothFamilies } from "./tools/dev/loopback-both-families.mjs";
import { zenStudio } from "./tools/studio/vite-plugin-zen-studio.mjs";
import { aiUiDevServer } from "./tools/ai-ui/vite-plugin.mjs";

export default defineConfig({
  // zenStudio(): dev server only (Zen Studio, src/platform/studio): data-zen-src on platform JSX and the
  // /__zen-studio/* source API that writes the edits made on the canvas. It must run before react().
  // loopbackBothFamilies(): the dev server answers on 127.0.0.1 and [::1] alike (Node binds "localhost" to one only).
  // aiUiDevServer(): dev only, /ai-ui/* (docs/ai-ui): the compose loop with a model when ANTHROPIC_API_KEY is set.
  plugins: [zenStudio(), react(), loopbackBothFamilies(), aiUiDevServer()],
  // Page templates (src/templates) import the public package name so they can be copied into apps unchanged.
  resolve: { alias: { "@zen-ds/react": fileURLToPath(new URL("./src/index.ts", import.meta.url)) } },
  // The docs platform app. The installable library is built by vite.lib.config.ts into dist/.
  build: { outDir: "dist-platform" },
});
