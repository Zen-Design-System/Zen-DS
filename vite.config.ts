import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Page templates (src/templates) import the public package name so they can be copied into apps unchanged.
  resolve: { alias: { "@zen/design-system": fileURLToPath(new URL("./src/index.ts", import.meta.url)) } },
  // The docs platform app. The installable library is built by vite.lib.config.ts into dist/.
  build: { outDir: "dist-platform" },
});
