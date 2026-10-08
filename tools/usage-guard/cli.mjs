#!/usr/bin/env node
// Zen DS usage harness — command line (`zen-usage` when installed from the package).
//
//   In an app:           npx zen-usage [files or dirs…]      default ./src; checks only tags imported from @zen-ds/react
//   In the Zen-DS repo:  npm run usage:check [files or dirs…] default: platform, components, styles, templates (every Zen tag)
//
//   --json        findings as JSON (for agents and CI annotations)
//   --list        the rule registry as JSON
//   --css         also check the app's stylesheets (tokens only, focus rings, reduced motion…); the repo always does
//   --consumer / --repo   force a mode (auto: repo when run from a Zen-DS checkout)
//
// Errors exit 1; warnings are printed only. Suppress one occurrence with a comment containing
// `zen-allow-<allow>: <reason>` within the four lines above the element (the reason is mandatory by convention).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { rules, root, isRepo } from "./check-usage.mjs";
import { createChecker, formatFinding, layoutClassesJson, learnLayoutClasses } from "./engine.mjs";

const walk = (dir, pattern) => {
  if (!fs.existsSync(dir)) return [];
  if (fs.statSync(dir).isFile()) return [dir];
  return fs.readdirSync(dir, { recursive: true })
    .map((f) => path.join(dir, String(f)))
    .filter((f) => pattern.test(f) && !/(^|[\\/])(node_modules|dist|build|\.git)([\\/]|$)/.test(path.relative(dir, f)) && !/\.stories\.[jt]sx$/.test(f));
};

export function main(argv = process.argv.slice(2)) {
  const flag = (name) => argv.includes(`--${name}`);
  if (flag("list")) {
    console.log(JSON.stringify(rules.map(({ check, ...rule }) => rule), null, 2));
    return 0;
  }
  const writeContext = argv.find((a) => a.startsWith("--write-context="))?.slice("--write-context=".length);
  if (writeContext) {
    // Packaged context: Zen's own layout classes (the package ships no src/**/*.css).
    fs.mkdirSync(path.dirname(path.resolve(writeContext)), { recursive: true });
    fs.writeFileSync(path.resolve(writeContext), `${JSON.stringify({ layoutClasses: layoutClassesJson() }, null, 2)}\n`);
    console.log(`✓ Wrote ${writeContext}`);
    return 0;
  }

  const consumer = flag("consumer") || (!flag("repo") && !isRepo);
  const targets = argv.filter((a) => !a.startsWith("--"));
  const base = consumer ? process.cwd() : root;
  // A relative target is looked up from the working directory first, then from the repo root (old behaviour).
  const resolve = (t) => (path.isAbsolute(t) ? t : fs.existsSync(path.resolve(process.cwd(), t)) ? path.resolve(process.cwd(), t) : path.resolve(root, t));
  const scriptPattern = consumer ? /\.[jt]sx$/ : /\.tsx$/;
  const withCss = !consumer || flag("css");
  const pattern = withCss ? new RegExp(`${scriptPattern.source}|\\.css$`) : scriptPattern;

  let files;
  if (targets.length) files = targets.flatMap((t) => walk(resolve(t), pattern));
  else if (consumer) files = walk(fs.existsSync(path.join(base, "src")) ? path.join(base, "src") : base, pattern);
  else files = [
    ...walk(path.join(root, "src/platform"), /\.(tsx|css)$/),
    // Component internals are usage too (a component composing Button/Popover/Input must follow the same rules); stories are demos.
    ...walk(path.join(root, "src/components"), /\.(tsx|css)$/),
    ...walk(path.join(root, "src/styles"), /\.css$/),
    ...walk(path.join(root, "src/templates"), /\.tsx$/),
  ];

  // An app's own layout classes decide whether a small Button gets stretched (button/small-full-width).
  if (consumer) for (const css of walk(fs.existsSync(path.join(base, "src")) ? path.join(base, "src") : base, /\.css$/)) learnLayoutClasses(fs.readFileSync(css, "utf8"));

  const checker = createChecker(rules, { consumer, css: withCss });
  const findings = files.flatMap((file) => checker.checkFile(fs.readFileSync(file, "utf8"), path.relative(base, file) || path.basename(file)));
  const errors = findings.filter((f) => f.rule.severity === "error");

  if (flag("json")) {
    console.log(JSON.stringify(findings.map(({ rule, ...f }) => ({ ...f, rule: rule.id, severity: rule.severity, allow: rule.allow, guideline: rule.guideline })), null, 2));
    return errors.length ? 1 : 0;
  }
  for (const f of findings) console.log(formatFinding(f));
  if (errors.length) {
    console.log(`\n${errors.length} error(s), ${findings.length - errors.length} warning(s). Suppress a deliberate case with "zen-allow-<allow>: <reason>".`);
    return 1;
  }
  console.log(`✓ Usage rules pass (${files.length} files, ${rules.length} rules${findings.length ? `, ${findings.length} warning(s)` : ""}${consumer ? ", app mode" : ""}).`);
  return 0;
}

// Run when executed directly or through the `zen-usage` bin symlink.
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) process.exit(main());
