// Global styles and icons, in the order the platform and Storybook load them (src/main.tsx, .storybook/preview.ts).
import "../src/styles/fonts.css";
import "../src/styles/reset.css";
import "../src/styles/tokens.css";
import "../src/styles/typography.css";
import "../src/styles/style-effects.css";
// Register every icon so tests never wait on a lazy bucket.
import "../src/icons/all";
import { afterEach, beforeEach, expect } from "vitest";

/** Every test fails on a React warning or any other console.error it causes (invalid DOM nesting, missing keys…). */
let consoleErrors: string[] = [];
const originalError = console.error;

beforeEach(() => {
  consoleErrors = [];
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "));
    originalError(...args);
  };
});

afterEach(() => {
  console.error = originalError;
  expect(consoleErrors, "console.error was called").toEqual([]);
});
