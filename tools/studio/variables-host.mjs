// The dev server's side of the Variables window (Zen Studio P5, 2026-10-17; spec
// docs/research/studio-figma-native-parity-2026-10-17.md §10). The token sources (tokens/source/figma/*.json) are Studio
// files like the examples: read through /source, changed by /variable-edit as drafts (undo, history, Save), and while
// one has a draft the dev server serves src/styles/tokens.css built from the drafts by the token build's own code
// (scripts/token-outputs.mjs), so the canvas shows a value at once. A save runs the token build and the coverage check,
// and keeps the text each file had before its first save since the last hand-over to Figma: the package for the Zen
// plugin (`zen-studio-variables`) is the difference from those texts to the disk.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { HIGH_CONTRAST_MODE, highContrastValues, neutralRampsOf } from "../../scripts/high-contrast.mjs";
import { SOURCE_FILES, tokenOutputs } from "../../scripts/token-outputs.mjs";
import { TOKEN_SOURCE, VariableEditError, aliasReaders, applyVariableOps, cssNameOf, readCollection, variablesOf, variablesPackage } from "./variables.mjs";

export const TOKENS_CSS = "src/styles/tokens.css";
export const TOKEN_FILES = SOURCE_FILES.map(([file]) => `tokens/source/figma/${file}`);
export const isTokenSource = (rel) => typeof rel === "string" && TOKEN_SOURCE.test(rel) && TOKEN_FILES.includes(rel);

const GLOBAL_COLORS = "tokens/source/figma/global-colors.json";
const BASE_COLORS = "tokens/source/figma/base-colors-project.json";

/**
 * Global Colors' Zen-High-Contrast mode follows its Zen values by the high-contrast algorithm (scripts/high-contrast.mjs,
 * the Zen plugin writes the same after every Global Colors change in Figma): written again after each edit.
 */
function withHighContrast(text, baseText) {
  const collection = readCollection(text);
  if (!collection.modes.includes(HIGH_CONTRAST_MODE)) return text;
  const values = highContrastValues({ tokens: collection.tokens }, neutralRampsOf(readCollection(baseText)));
  for (const token of collection.tokens) token.valuesByMode = { ...token.valuesByMode, [HIGH_CONTRAST_MODE]: values.get(token.name) ?? token.valuesByMode.Zen };
  return `${JSON.stringify({ [collection.name]: { modes: collection.modes, tokens: collection.tokens } }, null, 2)}\n`;
}

/** Where the hand-over to Figma keeps its base texts (beside the builder pages, out of git). */
const FIGMA_BASE = ".zen-studio/variables-figma.json";
/** Generated files: they repeat every token, so they never count as a reader. */
const GENERATED = /^src\/(?:styles\/tokens\.css|tokens\/|icons\/generated\/)|\.generated\.[a-z]+$/;

const run = (cwd, script) => new Promise((resolve) => {
  execFile(process.execPath, [script], { cwd, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
    resolve({ step: script, ok: !error, output: `${stdout}${stderr}`.trim().split("\n").slice(-12).join("\n") });
  });
});

/**
 * `realRoot()`: the repo root with links resolved (draft keys are relative to it). `drafts`: the server's Map of
 * drafts (file → { content, … }).
 */
export function variablesHost({ realRoot, drafts }) {
  const disk = (rel) => fs.readFileSync(path.join(realRoot(), rel), "utf8");
  const textOf = (rel) => drafts.get(rel)?.content ?? disk(rel);

  let cache = { drafts: [], css: null };
  /** tokens.css as the build writes it from the token sources and their drafts; null without a token draft. */
  function draftCss() {
    const drafted = TOKEN_FILES.map((rel) => drafts.get(rel) ?? null);
    if (!drafted.some(Boolean)) return null;
    if (cache.css !== null && drafted.every((draft, index) => draft === cache.drafts[index])) return cache.css;
    const byFile = new Map(SOURCE_FILES.map(([file], index) => [file, TOKEN_FILES[index]]));
    try {
      const { css } = tokenOutputs({
        readSource: (file) => JSON.parse(textOf(byFile.get(file))),
        motion: JSON.parse(disk("tokens/source/motion.json")),
        warn: () => {},
      });
      cache = { drafts: drafted, css };
      return css;
    } catch {
      // A draft the build refuses (an edit checks first, so only a hand-written draft): the saved tokens stay.
      return null;
    }
  }

  /** Every collection as the Studio sees it now (drafts included). */
  function collections(sha1) {
    return TOKEN_FILES.map((rel) => {
      const text = textOf(rel);
      const collection = readCollection(text);
      return { file: rel, name: collection.name, modes: collection.modes, tokens: collection.tokens, hash: sha1(text), draft: drafts.has(rel) };
    });
  }

  /** The source files under src/ that read a variable: by its CSS name (`--zen-…`, `css`) or its Figma name in quotes
   *  (`quoted`: a lookup by name, which a rename would break; the CSS name survives as the build's alias). */
  function codeReaders(names) {
    const wanted = names.map((name) => ({ name, css: new RegExp(`--zen-${cssNameOf(name)}(?![a-z0-9-])`), quoted: [`"${name}"`, `'${name}'`, `\`${name}\``] }));
    const found = new Map(names.map((name) => [name, { css: [], quoted: [] }]));
    const walk = (dir) => {
      for (const entry of fs.readdirSync(path.join(realRoot(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) { walk(rel); continue; }
        if (!/\.(css|tsx?|mjs)$/.test(entry.name) || GENERATED.test(rel)) continue;
        const text = drafts.get(rel)?.content ?? fs.readFileSync(path.join(realRoot(), rel), "utf8");
        for (const want of wanted) {
          if (want.css.test(text)) found.get(want.name).css.push(rel);
          if (want.quoted.some((quoted) => text.includes(quoted))) found.get(want.name).quoted.push(rel);
        }
      }
    };
    walk("src");
    return found;
  }

  /** A collection's ZenProvider axis: its data-* attribute and prop (scripts/token-outputs.mjs modeSelector, ZenProvider). */
  const MODE_AXIS = {
    "Base Colors (Project)": ["brand", "brand"], "Mode Colors (Semantic)": ["theme", "theme"], "Component Theme": ["component-theme", "componentTheme"],
    "Component Size": ["density", "density"], "Corner Radius": ["radius", "radius"], "Emphasis Level": ["emphasis", "emphasis"],
    "Breakpoint & Grids": ["breakpoint", "breakpoint"], "Typography Configuration": ["typography", "typography"],
  };

  /** The source files under src/ that use a mode by its id: `data-<axis>="id"` (CSS or JSX) or the ZenProvider prop. */
  function modeReaders(collection, mode) {
    const axis = MODE_AXIS[collection];
    if (!axis) return [];
    const id = cssNameOf(mode).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`data-${axis[0]}=["']${id}["']|\\b${axis[1]}(=|:\\s*|=\\{)["']${id}["']`);
    const found = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(path.join(realRoot(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) { walk(rel); continue; }
        if (!/\.(css|tsx?|mjs)$/.test(entry.name) || GENERATED.test(rel)) continue;
        const text = drafts.get(rel)?.content ?? fs.readFileSync(path.join(realRoot(), rel), "utf8");
        if (pattern.test(text)) found.push(rel.replace(/^src\//, ""));
      }
    };
    walk("src");
    return found;
  }

  /**
   * One edit of one collection: { text, changed, label } (variables.mjs), checked against every collection and, for
   * a rename or a delete, against what reads the variable (other variables' aliases, code under src/).
   */
  function edit(rel, before, ops) {
    const texts = new Map(TOKEN_FILES.map((file) => [file, file === rel ? before : textOf(file)]));
    const variables = variablesOf(texts);
    // A delete also asks about the variable's old names (code may still read --zen-<old>).
    const touched = ops.filter((op) => op?.op === "rename" || op?.op === "delete").flatMap((op) => [op.name, ...(op.op === "delete" ? variables.get(op.name)?.formerNames ?? [] : [])]);
    const code = touched.length ? codeReaders(touched) : new Map();
    const short = (file) => file.replace(/^src\//, "");
    const codeOf = (name) => { const found = code.get(name); return found ? [...new Set([...found.css, ...found.quoted])] : []; };
    const readers = (name) => [...new Set([...aliasReaders(variables, name), ...[name, ...(variables.get(name)?.formerNames ?? [])].flatMap(codeOf).map(short)])];
    const nameReaders = (name) => (code.get(name)?.quoted ?? []).map(short);
    if (rel === GLOBAL_COLORS && ops.some((op) => op?.op === "setValue" && op.mode === HIGH_CONTRAST_MODE)) {
      throw new VariableEditError("invalid", `${HIGH_CONTRAST_MODE} follows the Zen values (the high-contrast algorithm): change the Zen value`);
    }
    const result = applyVariableOps(before, ops, { variables, readers, nameReaders, modeReaders });
    return rel === GLOBAL_COLORS ? { ...result, text: withHighContrast(result.text, textOf(BASE_COLORS)) } : result;
  }

  const readBase = () => {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(realRoot(), FIGMA_BASE), "utf8"));
      return json && typeof json.files === "object" ? json : null;
    } catch {
      return null;
    }
  };

  /** Before a save writes token sources: the texts they had, kept when no earlier save since the hand-over kept one. */
  function keepBase(prior) {
    if (!prior.size) return;
    const base = readBase() ?? { since: new Date().toISOString(), files: {} };
    let changed = false;
    for (const [rel, text] of prior) {
      if (rel in base.files) continue;
      base.files[rel] = text;
      changed = true;
    }
    if (!changed) return;
    fs.mkdirSync(path.dirname(path.join(realRoot(), FIGMA_BASE)), { recursive: true });
    fs.writeFileSync(path.join(realRoot(), FIGMA_BASE), `${JSON.stringify(base)}\n`);
  }

  /** What Figma does not have yet: the saved changes since the last hand-over, as the plugin's package. */
  function pending() {
    const base = readBase();
    if (!base) return { pkg: variablesPackage(new Map(), new Map()), since: null };
    const files = Object.keys(base.files).filter(isTokenSource);
    return { pkg: variablesPackage(new Map(files.map((rel) => [rel, base.files[rel]])), new Map(files.map((rel) => [rel, disk(rel)]))), since: base.since };
  }

  /** The person handed the package to Figma: what is saved now is what Figma has. */
  function handedOver() {
    fs.rmSync(path.join(realRoot(), FIGMA_BASE), { force: true });
  }

  /** After a save of token sources: the token build (tokens.css, generated.ts, catalog, native packages), then the check. */
  async function build() {
    const steps = [];
    for (const script of ["scripts/build-tokens.mjs", "scripts/build-native-tokens.mjs", "scripts/check-token-coverage.mjs"]) {
      const step = await run(realRoot(), script);
      steps.push(step);
      if (!step.ok) break;
    }
    return { ok: steps.every((step) => step.ok), steps };
  }

  return { draftCss, collections, edit, keepBase, pending, handedOver, build };
}
