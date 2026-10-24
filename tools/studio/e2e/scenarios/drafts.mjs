// Draft rows: edits stay drafts until Save, Save writes and checks the file, hot updates stay healthy.
import fs from "node:fs";
import path from "node:path";
import { sleep, until } from "../lib/studio.mjs";
import { expectSource, freshSelect, pickOption, waitSeed } from "./inspector.mjs";

const disk = (ctx, rel) => fs.readFileSync(path.join(ctx.root, rel), "utf8");

export const rows = [
  {
    id: "D-01", feature: "An edit is a draft: the disk is untouched, the Inspector header counts it", wp: "GĐ0",
    async run(ctx) {
      const before = disk(ctx, ctx.saveFile);
      const page = await freshSelect(ctx, "save-a", { frame: 4, file: ctx.saveFile });
      await pickOption(page, "level", "Primary");
      await expectSource(ctx, "save-a", (el) => el.attr("level") === "primary", "the draft edit", { file: ctx.saveFile });
      if (disk(ctx, ctx.saveFile) !== before) throw new Error("the edit reached the disk before Save");
      // The Inspector header's drafts button: the count, its whole sentence in its name (Figma UI3 panel header).
      const drafts = async () => (await page.locator(".studio-drafts__count").first().getAttribute("aria-label", { timeout: 2000 }).catch(() => "")) ?? "";
      const t0 = Date.now();
      try {
        await until(async () => /^2 files with unsaved changes/.test(await drafts()), { timeout: 12_000, message: "2 files with unsaved changes" });
      } catch {
        throw new Error(`the drafts button reads "${(await drafts()).slice(0, 80)}" after 12 s (want 2 files with unsaved changes: the fixture page and the save fixture)`);
      }
      const lag = Date.now() - t0;
      if (lag > 2500) throw new Error(`the header counted the new draft only after ${(lag / 1000).toFixed(1)} s (the drafts poll), not at once`);
      return "draft only; 2 files with unsaved changes";
    },
  },
  {
    id: "D-02", feature: "Save writes the file and runs the harness on it", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "save-a", { frame: 4, file: ctx.saveFile });
      await pickOption(page, "level", "Primary");
      await expectSource(ctx, "save-a", (el) => el.attr("level") === "primary", "the draft edit", { file: ctx.saveFile });
      const result = await ctx.api.save([ctx.saveFile]);
      const written = disk(ctx, ctx.saveFile);
      if (!/data-e2e="save-a" level="primary"/.test(written)) throw new Error("the disk file does not hold the edit");
      if (!result.harness) throw new Error("no harness result in the Save response");
      return `saved; harness ${result.harness.ok === false ? "reported findings" : "ran"}`;
    },
  },
  {
    id: "D-03", feature: "A hot update after an edit raises no errors", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      const before = ctx.server.errors.length;
      await pickOption(page, "level", "Tertiary");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "tertiary", "the edit");
      await sleep(1500);
      const fresh = ctx.server.errors.slice(before);
      if (fresh.length) throw new Error(fresh[0].slice(0, 160));
      return "no Vite errors";
    },
  },
  {
    id: "D-06", feature: "Editing a component file an example imports hot-updates without errors", wp: "WP-A",
    async run(ctx) {
      const page = await freshSelect(ctx, "save-a", { frame: 4, file: ctx.saveFile });
      const before = ctx.server.errors.length;
      await pickOption(page, "level", "Primary");
      await expectSource(ctx, "save-a", (el) => el.attr("level") === "primary", "the edit", { file: ctx.saveFile });
      await sleep(1500);
      const fresh = ctx.server.errors.slice(before);
      if (fresh.length) throw new Error(fresh[0].replace(/^\[console\.error\] \[vite\] /, "").slice(0, 160));
      return "no Vite errors";
    },
  },
  {
    id: "D-04", feature: "Discard, then an edit at once: the canvas shows the edit (no stale module)", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      await ctx.reseed();
      await ctx.api.discard([ctx.file]);
      const seed = await ctx.reseed();
      await page.reload({ waitUntil: "domcontentloaded" });
      try {
        await page.waitForFunction((text) => document.body.innerText.includes(text), `Seed ${seed}`, { timeout: 8000 });
      } catch {
        throw new Error("after discard + edit the canvas still renders the old text, even after a reload");
      }
      return "canvas current";
    },
  },
  {
    id: "D-05", feature: "Undo across a reload (history survives the page reload)", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "btn-a");
      await pickOption(page, "level", "Tertiary");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "tertiary", "the edit");
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitSeed(page, ctx.seed());
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "primary", "undo after the reload");
      return "undone after a reload";
    },
  },
  {
    id: "D-07", feature: "A draft made outside this tab (another browser, the API) shows in its drafts button at once, without focus or the 10 s poll; its discard too (the dev server's zen-studio:drafts event)", wp: "BACKLOG 2026-10-24", timeout: 40_000,
    async run(ctx) {
      const { page } = await ctx.studio();
      await ctx.api.discard([ctx.saveFile]);
      // The files the drafts button counts ("2 files with unsaved changes"; none: 0).
      const files = async () => {
        const label = (await page.locator(".studio-drafts__count").first().getAttribute("aria-label", { timeout: 1000 }).catch(() => "")) ?? "";
        return Number(/^(\d+) files? with unsaved changes/.exec(label)?.[1] ?? 0);
      };
      const expected = (await ctx.api.drafts()).drafts.length;
      await until(async () => (await files()) === expected, { timeout: 12_000, message: `the button counts the ${expected} drafts there are` });
      // Written by the API (another client): the tab is not focused and makes no edit of its own.
      const current = (await ctx.api.source(ctx.saveFile)).content;
      const t0 = Date.now();
      await ctx.api.put(ctx.saveFile, current.replace('data-e2e="save-a"', 'data-e2e="save-a" aria-label="Live push"'));
      await until(async () => (await files()) === expected + 1, { timeout: 8000, message: "the outside draft counted" });
      const shown = Date.now() - t0;
      await ctx.api.discard([ctx.saveFile]);
      await until(async () => (await files()) === expected, { timeout: 8000, message: "the outside discard counted" });
      const gone = Date.now() - t0 - shown;
      if (shown > 2500 || gone > 2500) throw new Error(`the tab heard it after ${(shown / 1000).toFixed(1)} s / ${(gone / 1000).toFixed(1)} s (the poll), not at once`);
      return `outside draft shown in ${shown} ms, its discard in ${gone} ms`;
    },
  },
];

