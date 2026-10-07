import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Two pages: button-only.html measures the smallest real app (budget), index.html exercises the wider API.
export default defineConfig({
  plugins: [react()],
  build: { rolldownOptions: { input: { app: "index.html", buttonOnly: "button-only.html" } } },
});
