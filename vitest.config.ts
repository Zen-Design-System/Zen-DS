import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

// Browser tests: Vitest browser mode in headless Chromium (Playwright), so layout, focus, the CSS custom-property
// cascade and axe colour contrast are real.
//   npm test                                   every suite
//   npm test -- tests/smoke                    one folder
//   ZEN_UPDATE_AXE=1 npm test -- tests/smoke   rewrite tests/smoke/axe-baseline.json from the current results
export default defineConfig({
  plugins: [react()],
  define: { __ZEN_UPDATE_AXE__: JSON.stringify(process.env.ZEN_UPDATE_AXE === "1") },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    browser: {
      enabled: true,
      headless: true,
      // Reduced motion: every Zen animation has a prefers-reduced-motion fallback, so overlays and fades settle at once
      // and axe never samples a colour mid-transition.
      provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
      instances: [{ browser: "chromium", viewport: { width: 1280, height: 900 } }],
      screenshotFailures: false,
    },
  },
});
