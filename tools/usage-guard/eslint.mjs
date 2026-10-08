// Zen DS usage harness as an ESLint (flat config) plugin: the same rules as `zen-usage`, reported in the editor and
// in `eslint .`. It checks only JSX tags imported from "@zen-ds/react" (app mode), so an app's own components
// are never judged by Zen's rules.
//
//   // eslint.config.js — with typescript-eslint (or any JSX-capable parser) already set up:
//   import zen from "@zen-ds/react/eslint";
//   export default [ ...yourConfig, zen.configs.recommended ];
//
//   // No TypeScript lint setup? zen.configs.standalone brings a pass-through parser for .jsx/.tsx files:
//   export default [ zen.configs.standalone ];
//
// Rules: zen/usage (every error-severity Zen rule) and zen/usage-warn (the judgement calls). Suppress one occurrence
// with `zen-allow-<allow>: <reason>` (see the message), or with the usual eslint-disable comments.
import fs from "node:fs";
import path from "node:path";
import { rules } from "./check-usage.mjs";
import { createChecker, learnLayoutClasses } from "./engine.mjs";

let checker = null;
/** Learn the app's own layout classes once per process (button/small-full-width reads them), then build the checker. */
function getChecker(cwd) {
  if (checker) return checker;
  const src = fs.existsSync(path.join(cwd, "src")) ? path.join(cwd, "src") : cwd;
  try {
    for (const f of fs.readdirSync(src, { recursive: true }).map(String)) {
      if (f.endsWith(".css") && !/(^|[\\/])(node_modules|dist|build)([\\/]|$)/.test(f)) learnLayoutClasses(fs.readFileSync(path.join(src, f), "utf8"));
    }
  } catch { /* no stylesheets: the packaged Zen classes are enough */ }
  checker = createChecker(rules, { consumer: true, css: false });
  return checker;
}

const make = (severity) => ({
  meta: {
    type: severity === "error" ? "problem" : "suggestion",
    docs: { description: `Zen DS usage rules (${severity} severity): the same checks as zen-usage, from docs/guidelines/*.md` },
    schema: [],
  },
  create(context) {
    return {
      "Program:exit"() {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const findings = getChecker(context.cwd ?? process.cwd()).checkFile(sourceCode.text, context.filename ?? context.getFilename());
        for (const f of findings) {
          if (f.rule.severity !== severity) continue;
          context.report({
            loc: sourceCode.getLocFromIndex(f.index),
            message: `[${f.rule.id}] <${f.tag}> ${f.message} (${f.rule.guideline}; deliberate exception: zen-allow-${f.rule.allow}: <reason>)`,
          });
        }
      },
    };
  },
});

/** Parser that skips parsing: enough for zen/usage (it reads the source text), for projects without a JSX parser. */
const passThroughParser = {
  meta: { name: "zen-pass-through" },
  parseForESLint(code) {
    const lines = code.split("\n");
    return {
      ast: {
        type: "Program", body: [], sourceType: "module", tokens: [], comments: [],
        range: [0, code.length], loc: { start: { line: 1, column: 0 }, end: { line: lines.length, column: lines.at(-1).length } },
      },
      visitorKeys: { Program: [] },
    };
  },
};

const plugin = {
  meta: { name: "@zen-ds/react/eslint", version: "0.4.0" },
  rules: { usage: make("error"), "usage-warn": make("warn") },
  parser: passThroughParser,
  configs: {},
};
plugin.configs.recommended = { name: "zen/recommended", plugins: { zen: plugin }, rules: { "zen/usage": "error", "zen/usage-warn": "warn" } };
plugin.configs.standalone = { ...plugin.configs.recommended, name: "zen/standalone", files: ["**/*.jsx", "**/*.tsx"], languageOptions: { parser: passThroughParser } };

export default plugin;
