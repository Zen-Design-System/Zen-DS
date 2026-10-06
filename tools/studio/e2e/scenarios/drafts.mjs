// Draft rows: edits stay drafts until Save, Save writes and checks the file, hot updates stay healthy.
import fs from "node:fs";
import path from "node:path";
import { sleep, until } from "../lib/studio.mjs";
import { expectSource, freshSelect, pickOption, waitSeed } from "./inspector.mjs";

const disk = (ctx, rel) => fs.readFileSync(path.join(ctx.root, rel), "utf8");

export const rows = [
  {
    id: "D-01", feature: "An edit is a draft: the disk is untouched, the toolbar says Unsaved", wp: "GĐ0",
    async run(ctx) {
      const before = disk(ctx, ctx.saveFile);
      const page = await freshSelect(ctx, "save-a", { frame: 4, file: ctx.saveFile });
      await pickOption(page, "level", "primary");
      await expectSource(ctx, "save-a", (el) => el.attr("level") === "primary", "the draft edit", { file: ctx.saveFile });
      if (disk(ctx, ctx.saveFile) !== before) throw new Error("the edit reached the disk before Save");
      const toolbar = async () => (await page.locator("header").first().innerText({ timeout: 2000 }).catch(() => "")).replace(/\s+/g, " ");
      const t0 = Date.now();
      try {
        await until(async () => /Unsaved · 2 files/.test(await toolbar()), { timeout: 12_000, message: "Unsaved · 2 files" });
      } catch {
        throw new Error(`toolbar reads "${(await toolbar()).slice(0, 80)}" after 12 s (want Unsaved · 2 files: the fixture page and the save fixture)`);
      }
      const lag = Date.now() - t0;
      if (lag > 2500) throw new Error(`the toolbar counted the new draft only after ${(lag / 1000).toFixed(1)} s (the drafts poll), not at once`);
      return "draft only; Unsaved · 2 files";
    },
  },
  {
    id: "D-02", feature: "Save writes the file and runs the harness on it", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "save-a", { frame: 4, file: ctx.saveFile });
      await pickOption(page, "level", "primary");
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
      await pickOption(page, "level", "tertiary");
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
      await pickOption(page, "level", "primary");
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
      await pickOption(page, "level", "tertiary");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "tertiary", "the edit");
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitSeed(page, ctx.seed());
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await expectSource(ctx, "btn-a", (el) => el.attr("level") === "primary", "undo after the reload");
      return "undone after a reload";
    },
  },
];

