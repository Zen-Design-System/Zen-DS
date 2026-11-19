import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { zenStudio } from "./tools/studio/vite-plugin-zen-studio.mjs";

// Zen Studio's own dev server (port 5180) while it is built, so the shared platform server on 5173 is untouched.
// Open http://127.0.0.1:5180/studio.html?page=button. Same alias as vite.config.ts.
export default defineConfig({
  plugins: [zenStudio(), react()],
  // The AI UI entry first: "@zen-ds/react" alone would take "@zen-ds/react/ai-ui" too (the docs' AI examples import it).
  resolve: { alias: { "@zen-ds/react/ai-ui": fileURLToPath(new URL("./src/ai-ui/index.ts", import.meta.url)), "@zen-ds/react": fileURLToPath(new URL("./src/index.ts", import.meta.url)) } },
  server: { port: 5180, strictPort: true, host: "127.0.0.1" },
  // Own optimizer cache: sharing node_modules/.vite would re-optimize under the 5173 server other sessions use.
  cacheDir: "node_modules/.vite-studio",
  build: { outDir: "dist-platform" },
});
