// Builder pages on the dev server (Studio builder GĐ2 M2, spec docs/research/studio-builder-pages-spec-2026-10-06.md
// §3 2c): `.zen-studio/pages/<id>.zen.tsx` under the repo root, gitignored and outside src/ (tsc, QA and HMR never see
// it). On the dev server this folder is the pages' source of truth; the browser's IndexedDB is the working copy
// (src/platform/studio/builder/store/pageStore.ts syncs the two).
//
//   pagesFolder(root, { validate }) → { list(), read(id), write(id, text), trash(id) }
//
// Rules: ids match PAGE_ID; the folder and each page must be real files (no symlink anywhere on the way); a page is at
// most MAX_PAGE bytes; `validate(text)` (dialect.mjs validateDialect) must return no errors before a write. Nothing is
// ever deleted over HTTP: trash(id) moves the file to `.zen-studio/trash/<id>-<stamp>.zen.tsx`.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const PAGE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const MAX_PAGE = 2 * 1024 * 1024;
export const PAGES_DIR = ".zen-studio/pages";
export const TRASH_DIR = ".zen-studio/trash";
const SUFFIX = ".zen.tsx";

export class PagesError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** `dir`: the pages folder relative to the root (the E2E server uses its own); its trash is the sibling `trash/`. */
export function pagesFolder(root, { validate = () => [], dir = PAGES_DIR } = {}) {
  const pagesAbs = path.join(root, dir);
  const trashAbs = path.join(path.dirname(pagesAbs), path.basename(TRASH_DIR));

  const checkId = (id) => {
    if (typeof id !== "string" || !PAGE_ID.test(id)) throw new PagesError("invalid", `Bad page id ${JSON.stringify(id)}`);
  };

  /** Creates `dir` (and .zen-studio) as real folders; refuses when any part is a link. */
  async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
    for (let at = dir; at.startsWith(root) && at !== root; at = path.dirname(at)) {
      const stat = await fsp.lstat(at);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new PagesError("forbidden", `${path.relative(root, at)} is a link or not a folder`);
    }
  }

  /** The page's path; refuses a link. Returns null when it does not exist. */
  async function pageFile(id) {
    checkId(id);
    const abs = path.join(pagesAbs, `${id}${SUFFIX}`);
    let stat;
    try {
      stat = await fsp.lstat(abs);
    } catch {
      return { abs, stat: null };
    }
    if (stat.isSymbolicLink() || !stat.isFile()) throw new PagesError("forbidden", `${id}${SUFFIX} is a link or not a file`);
    if (stat.size > MAX_PAGE) throw new PagesError("invalid", `${id}${SUFFIX} is over ${MAX_PAGE / 1024 / 1024} MB`);
    return { abs, stat };
  }

  return {
    dir,

    /** Every page in the folder: [{ id, text, mtime }] (links, other files and oversized pages are skipped). */
    async list() {
      let entries;
      try {
        const stat = await fsp.lstat(pagesAbs);
        if (stat.isSymbolicLink() || !stat.isDirectory()) return [];
        entries = await fsp.readdir(pagesAbs, { withFileTypes: true });
      } catch {
        return [];
      }
      const pages = [];
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(SUFFIX)) continue;
        const id = entry.name.slice(0, -SUFFIX.length);
        if (!PAGE_ID.test(id)) continue;
        try {
          const { abs, stat } = await pageFile(id);
          if (stat) pages.push({ id, text: await fsp.readFile(abs, "utf8"), mtime: Math.round(stat.mtimeMs) });
        } catch {
          // a link or an oversized file is not a page
        }
      }
      return pages.sort((a, b) => a.id.localeCompare(b.id));
    },

    async read(id) {
      const { abs, stat } = await pageFile(id);
      if (!stat) throw new PagesError("not-found", `No page ${id} in ${dir}`);
      return { id, text: await fsp.readFile(abs, "utf8"), mtime: Math.round(stat.mtimeMs) };
    },

    /** Writes a page atomically (temp file + rename) after the dialect check. */
    async write(id, text) {
      checkId(id);
      if (typeof text !== "string") throw new PagesError("invalid", "Send { text }");
      if (Buffer.byteLength(text, "utf8") > MAX_PAGE) throw new PagesError("invalid", `A page is at most ${MAX_PAGE / 1024 / 1024} MB`);
      const errors = validate(text);
      if (errors.length) throw new PagesError("invalid", `Not a valid page (line ${errors[0].line}: ${errors[0].message})`);
      await ensureDir(pagesAbs);
      const { abs } = await pageFile(id);
      const temp = path.join(pagesAbs, `.${id}.${process.pid}-${Date.now()}.tmp`);
      await fsp.writeFile(temp, text, "utf8");
      try {
        await fsp.rename(temp, abs);
      } catch (error) {
        await fsp.rm(temp, { force: true });
        throw error;
      }
      const stat = fs.statSync(abs);
      return { id, mtime: Math.round(stat.mtimeMs) };
    },

    /** Moves the page to the trash folder (never deletes); a missing page is already gone. */
    async trash(id) {
      const { abs, stat } = await pageFile(id);
      if (!stat) return { id, trashed: false };
      await ensureDir(trashAbs);
      const to = path.join(trashAbs, `${id}-${new Date().toISOString().replace(/[:.]/g, "-")}${SUFFIX}`);
      await fsp.rename(abs, to);
      return { id, trashed: true, to: path.relative(root, to).split(path.sep).join("/") };
    },
  };
}
