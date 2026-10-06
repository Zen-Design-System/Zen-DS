// Shared code (plan WP-B2, docs/research/studio-builder-plan-2026-10-05.md): files the Studio annotates that are not an
// example page or a template, such as src/platform/PlatformDemoActions.tsx, chatDemo.tsx or PlatformChat*.tsx. Structural
// edits there change every place that uses the code (Figma's "Edit main component"), so the server asks first (op refused
// with code "confirm" until the request says `shared: true`), and says how many files import it.
//
//   isPlaygroundFile(rel) · importersOf(target, files) → repo-relative paths of the files that import `target`
import { posix } from "./posix.mjs";

/** The playground files: their branches render the main component, whose slots stay empty (never restructured). */
export const PLAYGROUND_FILES = new Set(["src/platform/PlatformExamples.tsx", "src/platform/PlatformMobilePlaygrounds.tsx"]);
export const isPlaygroundFile = (rel) => PLAYGROUND_FILES.has(rel);

const IMPORT = /\b(?:import|export)\s[^'"`;]*?from\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const withoutExtension = (rel) => rel.replace(/\.(tsx|ts|jsx|js|mjs)$/, "").replace(/\/index$/, "");

/**
 * The files (from `files`: [rel, text] pairs, repo-relative POSIX paths) whose relative imports resolve to `target`
 * (with or without its extension, or its folder's index). The target itself is left out.
 */
export function importersOf(target, files) {
  const wanted = withoutExtension(target);
  const out = [];
  for (const [rel, text] of files) {
    if (rel === target || typeof text !== "string") continue;
    const dir = posix.dirname(rel);
    IMPORT.lastIndex = 0;
    for (let match = IMPORT.exec(text); match; match = IMPORT.exec(text)) {
      const spec = match[1] ?? match[2];
      if (!spec?.startsWith(".")) continue;
      if (withoutExtension(posix.normalize(posix.join(dir, spec))) === wanted) { out.push(rel); break; }
    }
  }
  return out.sort();
}
