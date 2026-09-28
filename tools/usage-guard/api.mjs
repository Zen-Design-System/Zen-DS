// Zen DS usage harness — programmatic API (`import { checkSource, rules } from "@zen/design-system/usage"`), used by
// the MCP server and by tools that want the findings as data instead of CLI output.
import { rules } from "./check-usage.mjs";
import { createChecker, formatFinding } from "./engine.mjs";

export { rules, createChecker, formatFinding };

const checkers = new Map();

/**
 * Check one file's source text. App mode (default) checks only tags imported from "@zen/design-system", as
 * `zen-usage` does in an app; `{ consumer: false }` checks every Zen tag, as the repo does.
 * @returns {{ rule: string, severity: "error" | "warn", message: string, line: number, column: number, tag: string, guideline: string, allow: string }[]}
 */
export function checkSource(text, file = "input.tsx", { consumer = true } = {}) {
  const key = consumer ? "app" : "repo";
  if (!checkers.has(key)) checkers.set(key, createChecker(rules, { consumer, css: true }));
  return checkers.get(key).checkFile(text, file).map(({ rule, index, ...finding }) => ({
    ...finding, rule: rule.id, severity: rule.severity, allow: rule.allow, guideline: rule.guideline,
  }));
}
