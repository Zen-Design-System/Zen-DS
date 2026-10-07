#!/usr/bin/env node
// Starters coverage (Studio builder GĐ3b, spec docs/research/studio-builder-starters-spec-2026-10-07.md §7): "New page
// from this frame" run in the browser on every example frame of every component page (and the templates), without
// saving: how many frames become a valid builder page, and what each could not keep. Its own Vite server (port
// 5190–5199, the E2E harness's), nothing written.
//
//   node tools/studio/e2e/starters-coverage.mjs                  every page with examples
//   node tools/studio/e2e/starters-coverage.mjs --pages=card,templates
// Report: .qa/studio-e2e/starters-coverage-<stamp>.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, openStudio } from "./lib/studio.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const flag = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
const all = [...fs.readdirSync(path.join(root, "src/platform/examples/pages")).filter((file) => file.endsWith(".tsx")).map((file) => file.replace(/\.tsx$/, "")), "templates"];
const pages = flag("pages")?.split(",").filter(Boolean) ?? all;

/** In the page: every example frame → snapshot → page text → dialect check (the Studio's own modules). */
async function measure(page) {
  return page.evaluate(async () => {
    const { snapshotFrame } = await import("/src/platform/studio/builder/starters/snapshot.ts");
    const { starterPage } = await import("/src/platform/studio/builder/starters/toDialect.ts");
    const { loadEngine, zenComponents } = await import("/src/platform/studio/builder/engine.ts");
    const engine = await loadEngine();
    const components = new Set(zenComponents);
    const out = [];
    for (const frame of document.querySelectorAll('[data-studio-frame^="example:"]')) {
      const id = frame.getAttribute("data-studio-frame");
      try {
        const shot = snapshotFrame(frame);
        const text = starterPage({ title: "Coverage", device: shot.device, nodes: shot.nodes });
        const errors = shot.nodes.length ? engine.validateDialect(text, { components }) : [{ line: 0, message: "no library components" }];
        out.push({ id, label: frame.getAttribute("aria-label"), nodes: shot.nodes.length, elements: (text.match(/^\s*<[A-Z]/gm) ?? []).length, notes: shot.notes, error: errors[0] ? `line ${errors[0].line}: ${errors[0].message}` : null });
      } catch (error) {
        out.push({ id, label: frame.getAttribute("aria-label"), nodes: 0, elements: 0, notes: [], error: `threw: ${error?.message ?? error}` });
      }
    }
    return out;
  });
}

const server = await startServer(root, {});
const browser = await launchBrowser({});
const rows = [];
try {
  for (const slug of pages) {
    let session = null;
    try {
      session = await openStudio(browser, { url: server.url, page: slug });
      await session.page.waitForTimeout(800);
      const frames = await measure(session.page);
      for (const frame of frames) rows.push({ page: slug, ...frame });
      const ok = frames.filter((frame) => !frame.error).length;
      console.log(`  ${ok === frames.length ? "✓" : "✗"} ${slug}: ${ok}/${frames.length}`);
    } catch (error) {
      console.log(`  ✗ ${slug}: ${error.message.split("\n")[0]}`);
      rows.push({ page: slug, id: "-", label: "-", nodes: 0, elements: 0, notes: [], error: `page: ${error.message.split("\n")[0]}` });
    } finally {
      await session?.context.close().catch(() => {});
    }
  }
} finally {
  await browser.close();
  await server.close?.();
}

const ok = rows.filter((row) => !row.error);
const noteCounts = new Map();
for (const row of rows) for (const note of row.notes) {
  const key = note.replace(/ \(×\d+\)$/, "").replace(/^\S+ (\S+)(?=: left out|: a |\.)/, "… $1");
  noteCounts.set(key, (noteCounts.get(key) ?? 0) + 1);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = path.join(root, ".qa/studio-e2e", `starters-coverage-${stamp}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, [
  `# Starters coverage — ${stamp}`,
  "",
  `${ok.length}/${rows.length} frames become a valid builder page (${pages.length} pages). Frames with nothing left out: ${ok.filter((row) => !row.notes.length).length}.`,
  "",
  "## Most frequent notes",
  "",
  ...[...noteCounts].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([note, count]) => `- ${count}× ${note}`),
  "",
  "## Frames",
  "",
  "| Page | Frame | Elements | Result |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => `| ${row.page} | ${String(row.label).replace(/\|/g, "/")} | ${row.elements} | ${row.error ? `✗ ${row.error.replace(/\|/g, "/")}` : row.notes.length ? row.notes.join("; ").replace(/\|/g, "/").slice(0, 300) : "✓"} |`),
  "",
].join("\n"));
console.log(`\n${ok.length}/${rows.length} frames valid · ${ok.filter((row) => !row.notes.length).length} with nothing left out\nReport: ${path.relative(root, out)}`);
process.exit(0);
