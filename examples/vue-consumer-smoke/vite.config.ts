import { defineConfig } from "vite";

// button-only.html measures the smallest real app (budget). App.vue is type-checked only (vue-tsc), so the build needs no
// SFC plugin.
export default defineConfig({
  build: { rolldownOptions: { input: { buttonOnly: "button-only.html" } } },
});
