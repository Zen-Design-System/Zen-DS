// Zen Studio dev-server plugin (spec: docs/research/zen-studio-spec-2026-10-02.md §8). Two parts, dev server only:
//   1. zen-studio:annotate — data-zen-src="<file>:<line>:<col>" on every JSX element of the platform example sources,
//      so the Studio can map a clicked DOM node (through its React fiber) back to the JSX that rendered it. Its `load`
//      hook serves a file's admin draft instead of the disk, so the canvas renders the draft.
//   2. zen-studio:api — /__zen-studio/{ping,source,element,detach-plan,edit,write,drafts,frame-drafts,save,discard}: read source,
//      describe an element, say whether it can be detached, apply edit ops (detach and wrap included) and undo/redo writes to
//      the file's admin DRAFT, list, save (write to disk, then style-guard + usage-guard) and discard drafts (admin role
//      header, per-server token, same Origin only, annotated files only, atomic writes).
// Admin drafts (2026-10-03): edits never touch the disk until POST /save. A draft = { base (disk text when it
// started), baseHash, content, updatedAt } per repo-relative file, kept in memory and in
// node_modules/.cache/zen-studio/drafts-<port>.json (one file per dev server, restored when it starts). Every reader
// (/source, /element, /detach-plan, /edit, /write, the module loader) sees the "effective" text: the draft, else disk.
// A disk change to a drafted file rebases the draft onto it (both show); only a collision leaves it stale.
// Per frame (2026-10-03): /frame-drafts says which canvas frames hold which changes; /save and /discard with
// { frame: { locs } } write or drop only that frame's changes (frame-scope.mjs), the rest stays the draft.
// The pure parts (parse, describe, apply ops, detach recipes, draft bookkeeping and rebase) live in jsx-source.mjs,
// detach.mjs and drafts.mjs; `node tools/studio/selftest.mjs` tests them.
// Builder pages (2026-10-06, GĐ2 M2): GET /pages, POST /pages/write, POST /pages/trash keep the pages made in the
// Studio in the gitignored `.zen-studio/pages/` (pages-folder.mjs: id regex, no links, 2 MB, dialect check first).
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { cssRules, detachPlan } from "./detach.mjs";
import { changedLines, draftInfo, followDisk, nextDraft, parseDrafts, planSave, rebaseDraft, serializeDrafts } from "./drafts.mjs";
import { frameRangesOf, lineChanges, ownChanges, splitDraft } from "./frame-scope.mjs";
import { dataFieldEdit, isDataFile, originsOf } from "./data-source.mjs";
import { importersOf } from "./shared-code.mjs";
import { annotate, applyOps, describeElement, isAnnotatedFile, parseSource, sha1 } from "./jsx-source.mjs";
import { SLOT_OPS, describeSlots, requiredFromApi, withSlots } from "./slots.mjs";
import { componentModulesFrom } from "./component-modules.mjs";
import { validateDialect } from "./dialect.mjs";
import { PAGES_DIR, PagesError, pagesFolder } from "./pages-folder.mjs";

const PREFIX = "/__zen-studio";
const ROLE_HEADER = "x-zen-studio-role";
const TOKEN_HEADER = "x-zen-studio-token";
const MAX_BODY = 8 * 1024 * 1024;
/** A request body must arrive within this; a queued edit or write must finish within TASK_TIMEOUT. */
const BODY_TIMEOUT = 10_000;
const TASK_TIMEOUT = 10_000;
/** Style-guard and usage-guard on the saved files must finish within this (they take well under a second per file). */
const HARNESS_TIMEOUT = 60_000;
/** The drafts of each dev server persist here (relative to the root), as drafts-<port>.json. */
const DRAFTS_DIR = "node_modules/.cache/zen-studio";
const STATUS = { forbidden: 403, "not-found": 404, stale: 409, invalid: 400, confirm: 409 };
const ROUTES = new Set(["/ping", "/source", "/element", "/detach-plan", "/edit", "/write", "/drafts", "/frame-drafts", "/save", "/discard", "/pages", "/pages/write", "/pages/trash"]);
/** A frame request names at most this many frames and locs (a page renders a few thousand elements). */
const MAX_FRAMES = 200;
const MAX_LOCS = 50_000;

class HttpError extends Error {
  constructor(code, message, status, extra) { super(message); this.code = code; this.status = status; this.extra = extra; }
}

const toPosix = (value) => value.split(path.sep).join("/");

export function zenStudio() {
  let root = process.cwd();
  /** The root with links resolved: file keys (drafts, resolveFile's real paths) are relative to it. */
  let realRoot = root;
  /** Per server start: /ping hands it to the Studio page, /edit and /write require it (another origin cannot read /ping). */
  const token = randomBytes(18).toString("base64url");

  /* Admin drafts: repo-relative real path → { base, baseHash, content, updatedAt } (drafts.mjs). */
  const drafts = new Map();
  /** changedLines per draft object (a draft is replaced on every change, so the object is the cache key). */
  const lineCounts = new WeakMap();
  /** Per draft object: its content's AST and its line changes (frame-scope.mjs), for /frame-drafts. */
  const frameCache = new WeakMap();
  let devServer = null;
  let logger = console;
  /** Restored from disk once per server start (on `listening`, or by the first request that needs the drafts). */
  let restored = false;
  /** node_modules/.cache/zen-studio/drafts-<port>.json; null until restored (nothing persists before that). */
  let draftsFile = null;
  let persistQueue = Promise.resolve();

  const setRoot = (config) => {
    root = config.root;
    try {
      realRoot = fs.realpathSync.native(root);
    } catch {
      realRoot = root;
    }
  };

  const annotatePlugin = {
    name: "zen-studio:annotate",
    enforce: "pre",
    apply: "serve",
    configResolved: setRoot,
    // A drafted file compiles from its draft: the annotate transform below and @vitejs/plugin-react see the draft, so
    // the canvas shows it. Ids with a query (?raw code samples) keep reading the disk.
    load(id) {
      if (process.env.VITEST || id.includes("?") || id.startsWith("\0")) return null;
      ensureRestored();
      if (!drafts.size) return null;
      const draft = drafts.get(toPosix(path.relative(realRoot, id)));
      return draft ? { code: draft.content, map: null } : null;
    },
    transform: {
      filter: { id: { include: /\/src\/(?:platform|templates)\/.*\.tsx$/, exclude: /\?/ } },
      handler(code, id) {
        if (process.env.VITEST || id.includes("?") || id.startsWith("\0")) return null;
        const rel = toPosix(path.relative(root, id));
        if (!isAnnotatedFile(rel)) return null;
        return annotate(code, rel, id);
      },
    },
  };

  const apiPlugin = {
    name: "zen-studio:api",
    apply: "serve",
    configResolved: setRoot,
    configureServer(server) {
      devServer = server;
      logger = server.config.logger ?? console;
      if (!process.env.VITEST) {
        // The port names the drafts file, so restore once the server listens (a busy port may move it).
        server.httpServer?.once("listening", ensureRestored);
        // Another session or editor changed a drafted file: the draft follows the disk (its edits re-applied on the
        // new text, so both show); a collision keeps it stale (Save rebases or reports it); one that now equals the
        // disk has nothing left to save and is dropped.
        const onDisk = (abs) => { void diskChanged(abs); };
        server.watcher.on("change", onDisk);
        server.watcher.on("add", onDisk);
      }
      server.middlewares.use((req, res, next) => {
        // The builder pages folder is read through GET /pages only (token), never served as a file (/@fs/ included).
        if (/\/\.zen-studio(?:\/|$)/.test(safeDecode(req.url ?? ""))) return send(res, 403, { ok: false, code: "forbidden", error: "Builder pages are read through /__zen-studio/pages" });
        if (!req.url?.startsWith(`${PREFIX}/`)) return next();
        handle(req, res).catch((error) => send(res, 500, { ok: false, code: "invalid", error: String(error?.message ?? error) }));
      });
    },
  };

  /* ── requests ───────────────────────────────────────────────────────────────────────────────────────────────── */

  // Vite's CORS middleware runs first and may already have set Access-Control-Allow-Origin for another localhost port:
  // send() strips it, and checkOrigin refuses that origin, so such a page can neither read /ping's token nor write.
  async function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    const route = `${req.method} ${url.pathname.slice(PREFIX.length)}`;
    try {
      checkOrigin(req);
      ensureRestored();
      if (route === "GET /ping") return send(res, 200, { ok: true, root, writable: isWritable(), token: loopbackHost(req) ? token : null, drafts: true });
      if (route === "GET /source") {
        const target = await resolveFile(url.searchParams.get("file"), false);
        const draft = drafts.get(target.realRel);
        if (!draft) {
          const content = await readText(target.abs);
          return send(res, 200, { file: target.rel, content, hash: sha1(content) });
        }
        const disk = await readDisk(target.realRel);
        return send(res, 200, {
          file: target.rel, content: draft.content, hash: sha1(draft.content),
          draft: true, base: draft.base, baseHash: draft.baseHash, diskHash: disk === null ? null : sha1(disk),
        });
      }
      if (route === "GET /element") {
        const target = await resolveFile(url.searchParams.get("file"), false);
        if (!/\.[jt]sx$/.test(target.rel)) throw new HttpError("invalid", "Only .tsx/.jsx files hold JSX elements");
        const content = await effectiveText(target);
        // Slots (slots.mjs): selfClosing, the elements inside JSX attribute values and expression children (+ their form).
        // With a draft, also what differs from the saved file (base = the disk text): childrenModified, per attribute
        // modified, modifiedProps, newSinceSave (Figma's "Modified" tag and Reset slot).
        const loc = url.searchParams.get("loc") ?? "";
        const base = drafts.has(target.realRel) ? await readDisk(target.realRel) : null;
        const element = withSlots(describeElement(content, target.rel, loc), describeSlots(content, target.rel, loc, base === null ? {} : { base }));
        if (!element) throw new HttpError("not-found", `No JSX element starts at ${target.rel}:${url.searchParams.get("loc")}`);
        // Where each expression prop and expression child gets its value as data (data-source.mjs, `dataSource`; not
        // jsx-source's `origin`, which says what the expression reads): the Inspector edits a .map row or a data const
        // at its source (op setDataField) and says why the rest stay read-only.
        withDataSources(element, content, target.rel, loc);
        return send(res, 200, element);
      }
      if (route === "GET /detach-plan") {
        // Same path checks as /element. `instances` (optional): how many times the element renders on the page; more
        // than one outside a .map callback cannot be detached alone. `lists` (optional, a .map row): how many separate
        // lists render it; more than one cannot be detached as one row.
        const target = await resolveFile(url.searchParams.get("file"), false);
        if (!/\.[jt]sx$/.test(target.rel)) throw new HttpError("invalid", "Only .tsx/.jsx files hold JSX elements");
        const name = url.searchParams.get("name");
        if (!name) throw new HttpError("invalid", "Missing `name` (the element's tag name)");
        if (!isAnnotatedFile(target.rel)) return send(res, 200, { ok: false, reason: `${target.rel} is not an editable example source` });
        const content = await effectiveText(target);
        const count = (key) => {
          const raw = url.searchParams.get(key);
          const value = raw === null || raw === "" ? NaN : Number(raw);
          return Number.isInteger(value) ? value : undefined;
        };
        return send(res, 200, detachPlan(content, url.searchParams.get("loc") ?? "", name, { file: target.rel, instances: count("instances"), lists: count("lists") }));
      }
      if (route === "POST /edit" || route === "POST /write") {
        checkWriteHeaders(req);
        // The body is read before the queue: a slow or abandoned upload never holds up other writes.
        const body = await readJson(req);
        const gone = watchClient(req, res);
        const result = await exclusive(() => (route === "POST /edit" ? edit(body) : write(body)), gone);
        return send(res, 200, result);
      }
      if (route === "GET /drafts") {
        // Any role may list the drafts (a Viewer says that drafts are shown); the token keeps other pages out.
        checkToken(req);
        return send(res, 200, { ok: true, drafts: await listDrafts() });
      }
      if (route === "POST /frame-drafts") {
        // Which frames on the canvas hold which draft changes (any role, like GET /drafts).
        checkToken(req);
        if (!String(req.headers["content-type"] ?? "").includes("application/json")) throw new HttpError("invalid", "Send JSON (content-type: application/json)");
        const frames = frameList(await readJson(req));
        return send(res, 200, { ok: true, ...(await frameDrafts(frames)) });
      }
      if (route === "POST /save" || route === "POST /discard") {
        checkWriteHeaders(req);
        const body = await readJson(req);
        const frame = body.frame === undefined ? null : frameLocs(body.frame);
        if (frame && body.files !== undefined) throw new HttpError("invalid", "Send { files } or { frame }, not both");
        const files = frame ? null : draftFiles(body);
        const gone = watchClient(req, res);
        if (route === "POST /discard") return send(res, 200, await exclusive(() => (frame ? discardFrame(frame) : discard(files)), gone));
        const { saved, conflicts } = await exclusive(() => (frame ? saveFrame(frame) : save(files)), gone);
        // The harness runs outside the write queue: edits can go on while it checks the saved files.
        const harness = await runHarness(saved.map((entry) => entry.file));
        return send(res, 200, { ok: true, saved, conflicts, harness });
      }
      if (route === "GET /pages") {
        // Builder pages in .zen-studio/pages/ (the browser keeps its copy in IndexedDB and syncs with these).
        checkToken(req);
        return send(res, 200, { ok: true, dir: pages().dir, pages: await pagesCall(() => pages().list()) });
      }
      if (route === "POST /pages/write" || route === "POST /pages/trash") {
        checkWriteHeaders(req);
        const body = await readJson(req);
        const result = await exclusive(() => pagesCall(() => (route === "POST /pages/write" ? pages().write(body.id, body.text) : pages().trash(body.id))));
        return send(res, 200, { ok: true, ...result });
      }
      if (ROUTES.has(url.pathname.slice(PREFIX.length))) throw new HttpError("invalid", `${req.method} is not allowed here`, 405);
      throw new HttpError("not-found", `Unknown endpoint ${url.pathname}`);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      return send(res, error.status ?? STATUS[error.code] ?? 400, { ok: false, code: error.code, error: error.message, ...error.extra });
    }
  }

  async function edit(body) {
    const { file, loc, name, ops, hash } = body;
    if (typeof loc !== "string" || typeof name !== "string" || !Array.isArray(ops) || (hash !== undefined && typeof hash !== "string")) {
      throw new HttpError("invalid", "Expected { file, loc, name, ops, hash? }");
    }
    for (const op of ops) {
      if (op?.op !== "setTypography") continue;
      const keys = typographyKeys();
      if (!keys.size) throw new HttpError("invalid", "The typography styles (src/tokens/typography.generated.ts) cannot be read, so setTypography is off");
      if (!keys.has(op.to)) throw new HttpError("invalid", `"${op.to}" is not a typographyStyles key`);
    }
    const target = await resolveFile(file, true);
    if (ops.length === 1 && ops[0]?.op === "setDataField") return editData(target, body);
    // The edit applies to the effective text (the draft, else the disk) and goes into the draft, never to the disk.
    const disk = await readText(target.abs);
    const before = drafts.get(target.realRel)?.content ?? disk;
    const hashBefore = sha1(before);
    if (hash && hash !== hashBefore) throw new HttpError("stale", `${target.rel} changed since it was read`);
    // setTextStyle checks its key against typographyStyles and imports it relative to the edited file. A detach lists the
    // repo CSS keyed on the component's classes (read now: detach edits are rare, and the CSS may have just changed).
    const componentCss = ops.some((op) => op?.op === "detach") ? readComponentCss() : undefined;
    // Slot ops import Zen components by folder and refuse removing required content (read once per server start);
    // resetSlot puts a slot back to the saved file: the disk text, when the file has a draft (none: nothing to reset).
    const slots = ops.some((op) => SLOT_OPS.has(op?.op)) ? slotData() : {};
    const base = drafts.has(target.realRel) ? disk : undefined;
    const result = applyOps(before, loc, name, ops, { typographyKeys: typographyKeys(), file: target.rel, componentCss, ...slots, hash, base, shared: body.shared === true });
    // Shared code (plan WP-B2): the client asks the person, naming who uses it, then sends the edit again with shared: true.
    if ("error" in result && result.code === "confirm") {
      const users = sharedUsers(target.rel);
      throw new HttpError("confirm", result.error, undefined, { uses: users.length, users: users.slice(0, 5) });
    }
    if ("error" in result) throw new HttpError(result.code, result.error);
    const draft = result.code !== before ? await setDraft(target, disk, result.code) : drafts.has(target.realRel);
    const response = { ok: true, file: target.rel, hash: sha1(result.code), hashBefore, before, after: result.code, changed: result.changed, draft };
    if (result.snippet) response.snippet = result.snippet;
    // op "detach": the new root element (its loc in the new text) and what the primitives could not reproduce.
    if (result.detached) response.detached = result.detached;
    // op "wrap": the new wrapper (its opening tag's loc in the new text), so the client can select it.
    if (result.wrapped) response.wrapped = result.wrapped;
    // op "unwrap": the element that took the wrapper's place, to select it.
    if (result.unwrapped) response.unwrapped = result.unwrapped;
    // Slot ops: the new element (insertChild, duplicateElement) or the moved one, to select it; removeElement,
    // clearSlot, resetSlot: true.
    if (result.inserted) response.inserted = result.inserted;
    if (result.moved) response.moved = result.moved;
    if (result.removed) response.removed = true;
    if (result.cleared) response.cleared = true;
    if (result.reset) response.reset = true;
    // Data-slot item ops (items.mjs): where the item is now, to select it; `updated` for insert, duplicate and move.
    if (result.item) response.item = result.item;
    if (result.updated) response.updated = true;
    return response;
  }

  /** The effective text (draft, else disk) of a repo-relative file, read synchronously for data-source.mjs; null if none. */
  /** The example pages, templates and platform files that import `rel` (their drafts included), for "used in N files". */
  function sharedUsers(rel) {
    const files = [];
    for (const dir of ["src/platform", "src/templates"]) {
      let names = [];
      try { names = fs.readdirSync(path.join(realRoot, dir), { recursive: true }); } catch { continue; }
      for (const name of names) {
        const relName = `${dir}/${toPosix(String(name))}`;
        if (!/\.(tsx|ts)$/.test(relName) || relName.startsWith("src/platform/studio/")) continue;
        const text = readEffectiveSync(relName);
        if (text !== null) files.push([relName, text]);
      }
    }
    return importersOf(rel, files);
  }

  function readEffectiveSync(rel) {
    if (typeof rel !== "string" || !rel.startsWith("src/") || rel.includes("\0") || path.posix.normalize(rel) !== rel) return null;
    const draft = drafts.get(rel);
    if (draft) return draft.content;
    try {
      const abs = path.join(realRoot, rel);
      return fs.statSync(abs).size <= MAX_BODY ? fs.readFileSync(abs, "utf8") : null;
    } catch {
      return null;
    }
  }

  /** GET /element: `dataSource` on every expression attribute and expression child (literal values have none). */
  function withDataSources(element, content, rel, loc) {
    const attrs = element.attributes.filter((attr) => attr.kind === "expression" && attr.name);
    let childIndex = -1;
    const children = [];
    for (const child of element.children ?? []) {
      if (child.kind === "text" && !String(child.value ?? "").trim()) continue;
      childIndex += 1;
      if (child.kind === "expression") children.push({ child, index: childIndex });
    }
    const targets = [...attrs.map((attr) => ({ prop: attr.name })), ...children.map((entry) => ({ child: entry.index }))];
    if (!targets.length) return;
    const origins = originsOf(content, rel, loc, targets, { read: readEffectiveSync });
    attrs.forEach((attr, index) => { attr.dataSource = origins[index]; });
    children.forEach((entry, index) => { entry.child.dataSource = origins[attrs.length + index]; });
  }

  /**
   * Op setDataField (data-source.mjs): the value is written where the data holds it, possibly another file (examples/
   * data.ts); that file gets the draft. The response names it (`file`), so undo and redo write it back there.
   */
  async function editData(target, body) {
    const { loc, name, ops, hash } = body;
    const host = await effectiveText(target);
    if (hash && hash !== sha1(host)) throw new HttpError("stale", `${target.rel} changed since it was read`);
    const result = dataFieldEdit(host, target.rel, loc, name, ops[0], { read: readEffectiveSync });
    if (result.error) throw new HttpError(result.code ?? "forbidden", result.error);
    const dataTarget = await resolveFile(result.file, true);
    const disk = await readText(dataTarget.abs);
    const before = drafts.get(dataTarget.realRel)?.content ?? disk;
    const draft = result.code !== before ? await setDraft(dataTarget, disk, result.code) : drafts.has(dataTarget.realRel);
    return { ok: true, file: dataTarget.rel, hash: sha1(result.code), hashBefore: sha1(before), before, after: result.code, changed: result.changed, draft, data: { source: result.source } };
  }

  async function write(body) {
    const { file, content, expectHash } = body;
    if (typeof content !== "string" || typeof expectHash !== "string") throw new HttpError("invalid", "Expected { file, content, expectHash }");
    const target = await resolveFile(file, true);
    const disk = await readText(target.abs);
    const current = drafts.get(target.realRel)?.content ?? disk;
    if (sha1(current) !== expectHash) throw new HttpError("stale", `${target.rel} changed since this edit; not overwritten`);
    const draft = content !== current ? await setDraft(target, disk, content) : drafts.has(target.realRel);
    return { ok: true, hash: sha1(content), draft };
  }

  /* ── admin drafts ───────────────────────────────────────────────────────────────────────────────────────────── */

  /** The text every reader sees: the file's draft, else the disk. */
  async function effectiveText(target) {
    return drafts.get(target.realRel)?.content ?? readText(target.abs);
  }

  /** The disk text of a repo-relative real path, null when it cannot be read. */
  async function readDisk(rel) {
    try {
      return await fsp.readFile(path.join(realRoot, rel), "utf8");
    } catch {
      return null;
    }
  }

  /** An edit or write produced `content`: it becomes the draft (dropped when it equals the disk again). */
  async function setDraft(target, disk, content) {
    const next = nextDraft(drafts.get(target.realRel), disk, content);
    if (next) drafts.set(target.realRel, next);
    else drafts.delete(target.realRel);
    await persist();
    reloadFile(target.realRel);
    return Boolean(next);
  }

  async function listDrafts() {
    const rows = [];
    for (const file of [...drafts.keys()].sort()) {
      const disk = await readDisk(file);
      // The draft as it is after the read (an edit may have changed or dropped it meanwhile).
      const draft = drafts.get(file);
      if (!draft) continue;
      let lines = lineCounts.get(draft);
      if (!lines) {
        lines = changedLines(draft.base, draft.content);
        lineCounts.set(draft, lines);
      }
      rows.push(draftInfo(file, draft, disk, lines));
    }
    return rows;
  }

  /** `files` of a /save or /discard body: omitted = every draft. */
  function draftFiles(body) {
    if (body.files === undefined) return null;
    if (!Array.isArray(body.files) || !body.files.every((file) => typeof file === "string")) throw new HttpError("invalid", "Expected { files?: string[] }");
    return [...new Set(body.files)];
  }

  /**
   * Writes each draft to disk (atomically): as it is when the disk still holds its base, rebased onto the disk when the
   * disk changed (drafts.mjs planSave), or not at all (a conflict: the draft stays). A draft is cleared after its write
   * (until then every reader keeps seeing the draft, never the old disk text).
   */
  async function save(files) {
    const saved = [];
    const conflicts = [];
    for (const file of files ?? [...drafts.keys()].sort()) {
      const draft = drafts.get(file);
      if (!draft) continue;
      let target;
      try {
        target = await resolveFile(file, true);
      } catch (error) {
        conflicts.push({ file, conflict: true, reason: error?.code === "not-found" ? "the file is no longer on disk" : String(error?.message ?? error) });
        continue;
      }
      const plan = await planSave(draft, await readDisk(target.realRel));
      if ("conflict" in plan) {
        conflicts.push({ file, conflict: true, reason: plan.conflict });
        continue;
      }
      if (!plan.unchanged) {
        try {
          await writeAtomic(target.abs, plan.text);
        } catch (error) {
          conflicts.push({ file, conflict: true, reason: `the file could not be written (${error?.message ?? error})` });
          continue;
        }
      }
      if (drafts.get(file) === draft) drafts.delete(file);
      // The canvas shows the draft; when the disk now holds other text (a rebase, or a draft undone to its base on a
      // changed disk, which writes nothing) reload it rather than wait for the watcher.
      if (plan.text !== draft.content) reloadFile(file);
      saved.push(plan.rebased ? { file, hash: sha1(plan.text), rebased: true } : { file, hash: sha1(plan.text) });
    }
    await persist();
    return { saved, conflicts };
  }

  /** Drops the drafts: the canvas reloads those files from disk. */
  async function discard(files) {
    const discarded = [];
    for (const file of files ?? [...drafts.keys()].sort()) {
      if (!drafts.delete(file)) continue;
      discarded.push(file);
      reloadFile(file);
    }
    if (discarded.length) await persist();
    return { ok: true, discarded };
  }

  /* ── per frame ──────────────────────────────────────────────────────────────────────────────────────────────── */

  /**
   * A frame of a /save, /discard or /frame-drafts body: { locs: ["src/…/button.tsx:84:6", …] } (its DOM's data-zen-src,
   * "file:line" also works) → Map(file → lines). Files that are not annotated sources are ignored.
   */
  function frameLocs(frame) {
    const locs = frame?.locs;
    if (!Array.isArray(locs) || locs.length > MAX_LOCS || !locs.every((loc) => typeof loc === "string")) throw new HttpError("invalid", "Expected frame: { locs: string[] }");
    const byFile = new Map();
    for (const loc of locs) {
      const match = /^(src\/[^:]+):(\d+)(?::\d+)?$/.exec(loc);
      if (!match || !isAnnotatedFile(match[1])) continue;
      const lines = byFile.get(match[1]) ?? new Set();
      lines.add(Number(match[2]));
      byFile.set(match[1], lines);
    }
    return byFile;
  }

  /** The body of /frame-drafts: { frames: [{ id, locs }] }. */
  function frameList(body) {
    const frames = body.frames;
    if (!Array.isArray(frames) || frames.length > MAX_FRAMES || !frames.every((frame) => frame && typeof frame.id === "string")) throw new HttpError("invalid", "Expected { frames: [{ id, locs }] }");
    if (frames.reduce((sum, frame) => sum + (Array.isArray(frame.locs) ? frame.locs.length : 0), 0) > MAX_LOCS) throw new HttpError("invalid", `At most ${MAX_LOCS} locs`);
    return frames.map((frame) => ({ id: frame.id, byFile: frameLocs(frame) }));
  }

  /** A frame's files that have a draft: [{ file (the draft key), draft, lines }]. */
  async function draftedFiles(byFile) {
    const out = [];
    for (const [rel, lines] of byFile) {
      let target;
      try {
        target = await resolveFile(rel, true);
      } catch {
        continue;
      }
      const draft = drafts.get(target.realRel);
      if (draft) out.push({ file: target.realRel, target, draft, lines: [...lines] });
    }
    return out;
  }

  /** The content's AST and line changes of a draft, computed once per draft object. */
  function frameInfo(draft) {
    let info = frameCache.get(draft);
    if (!info) {
      info = { ast: parseSource(draft.content), changes: lineChanges(draft.base, draft.content) };
      frameCache.set(draft, info);
    }
    return info;
  }

  /**
   * POST /frame-drafts: for each frame, the draft changes it owns ({ changes, added, removed, files }), and the changes
   * no listed frame owns (`outside`: only Save all writes them). Import lines are not counted (they follow the frame).
   */
  async function frameDrafts(frames) {
    const result = {};
    const claimed = new Map();
    for (const frame of frames) {
      const entry = { changes: 0, added: 0, removed: 0, files: [] };
      for (const { file, draft, lines } of await draftedFiles(frame.byFile)) {
        const info = frameInfo(draft);
        if (!info.ast) continue;
        const own = ownChanges(info.changes, frameRangesOf(info.ast, lines));
        if (!own.length) continue;
        entry.changes += own.length;
        entry.added += own.reduce((sum, change) => sum + change.b[1] - change.b[0], 0);
        entry.removed += own.reduce((sum, change) => sum + change.a[1] - change.a[0], 0);
        entry.files.push(file);
        const set = claimed.get(draft) ?? new Set();
        for (const change of own) set.add(change);
        claimed.set(draft, set);
      }
      result[frame.id] = entry;
    }
    const outside = { changes: 0, files: [] };
    for (const [file, draft] of [...drafts].sort(([a], [b]) => a.localeCompare(b))) {
      const set = claimed.get(draft);
      const rest = frameInfo(draft).changes.filter((change) => !change.imports && !set?.has(change)).length;
      if (!rest) continue;
      outside.changes += rest;
      outside.files.push(file);
    }
    return { frames: result, outside };
  }

  /**
   * POST /save { frame }: in each drafted file the frame renders, its changes (and the imports they need) go to disk;
   * the file's other changes stay its draft, now on top of the saved text. A disk that changed since the draft started
   * gets both the frame's part and the rest rebased onto it, or neither (a conflict).
   */
  async function saveFrame(byFile) {
    const saved = [];
    const conflicts = [];
    for (const { file, target, draft, lines } of await draftedFiles(byFile)) {
      const info = frameInfo(draft);
      if (!info.ast) { conflicts.push({ file, conflict: true, reason: "the draft does not parse, so its frames cannot be told apart" }); continue; }
      const split = splitDraft(draft.base, draft.content, frameRangesOf(info.ast, lines), "save");
      if (!split.taken) continue;
      const disk = await readDisk(target.realRel);
      if (disk === null) { conflicts.push({ file, conflict: true, reason: "the file is no longer on disk" }); continue; }
      let text = split.text;
      let rest = draft.content;
      const rebased = sha1(disk) !== draft.baseHash;
      if (rebased) {
        text = await rebaseDraft(draft.base, split.text, disk);
        rest = await rebaseDraft(draft.base, draft.content, disk);
        if (text === null || rest === null) {
          conflicts.push({ file, conflict: true, reason: "the file on disk changed the drafted lines or the lines around them since the draft started" });
          continue;
        }
      }
      if (text !== disk) {
        try {
          await writeAtomic(target.abs, text);
        } catch (error) {
          conflicts.push({ file, conflict: true, reason: `the file could not be written (${error?.message ?? error})` });
          continue;
        }
      }
      if (drafts.get(file) === draft) {
        if (rest === text) drafts.delete(file);
        else drafts.set(file, { base: text, baseHash: sha1(text), content: rest, updatedAt: draft.updatedAt });
      }
      if (rest !== draft.content) reloadFile(file);
      saved.push({ file, hash: sha1(text), ...(rebased ? { rebased: true } : {}), partial: drafts.has(file) });
    }
    await persist();
    return { saved, conflicts };
  }

  /** POST /discard { frame }: the frame's changes (and the imports only they needed) leave each draft it renders. */
  async function discardFrame(byFile) {
    const discarded = [];
    const partial = [];
    for (const { file, target, draft, lines } of await draftedFiles(byFile)) {
      const info = frameInfo(draft);
      if (!info.ast) continue;
      const split = splitDraft(draft.base, draft.content, frameRangesOf(info.ast, lines), "discard");
      if (!split.taken) continue;
      await setDraft(target, await readDisk(target.realRel) ?? draft.base, split.text);
      discarded.push(file);
      if (drafts.has(file)) partial.push(file);
    }
    return { ok: true, discarded, partial };
  }

  /**
   * The watcher saw a drafted file change on disk (or a restored draft's file changed while the server was down): in
   * the write queue, the draft follows the disk (drafts.mjs followDisk): rebased onto it, kept (stale) on a collision,
   * or dropped when the disk now holds it.
   */
  async function diskChanged(abs) {
    if (!drafts.size) return;
    const file = toPosix(path.relative(realRoot, abs));
    if (!drafts.has(file)) return;
    try {
      await exclusive(async () => {
        const draft = drafts.get(file);
        if (!draft) return;
        const next = await followDisk(draft, await readDisk(file));
        if (drafts.get(file) !== draft || (next.draft && !next.changed)) return;
        if (next.draft) drafts.set(file, next.draft);
        else drafts.delete(file);
        await persist();
        // The canvas showed the draft; it now shows the draft on the new disk text (or the disk itself).
        reloadFile(file);
        if (next.draft) logger.info?.(`[zen-studio] ${file} changed on disk: its admin draft now sits on top of the new text`, { timestamp: true });
      });
    } catch (error) {
      logger.warn?.(`[zen-studio] could not follow the disk change of ${file} (${error?.message ?? error}); the draft stays as it was`);
    }
  }

  /**
   * HMR for a file whose effective text changed (draft set, changed, saved after a rebase, discarded): each of its
   * modules reloads as if the file had changed on disk; the `load` hook then serves the draft or the disk. A file not
   * loaded yet needs nothing; a server without reloadModule gets a full page reload.
   */
  function reloadFile(rel) {
    if (!devServer) return;
    const file = toPosix(path.join(realRoot, rel));
    try {
      const env = devServer.environments?.client;
      const graph = env?.moduleGraph ?? devServer.moduleGraph;
      const modules = graph?.getModulesByFile?.(file);
      if (!modules?.size) return;
      const reload = env?.reloadModule ? (mod) => env.reloadModule(mod) : devServer.reloadModule ? (mod) => devServer.reloadModule(mod) : null;
      if (!reload) {
        devServer.ws.send({ type: "full-reload" });
        return;
      }
      for (const mod of modules) {
        Promise.resolve(reload(mod)).catch((error) => {
          logger.warn?.(`[zen-studio] HMR for ${rel} failed (${error?.message ?? error}); reloading the page`);
          devServer.ws.send({ type: "full-reload" });
        });
      }
    } catch (error) {
      logger.warn?.(`[zen-studio] HMR for ${rel} failed (${error?.message ?? error}); reloading the page`);
      devServer.ws?.send({ type: "full-reload" });
    }
  }

  /** A draft key from a persisted file: a normalised repo-relative path of an annotated file. */
  const draftable = (file) => typeof file === "string" && !file.includes("\\") && !file.includes("\0") && path.posix.normalize(file) === file && !path.posix.isAbsolute(file) && file.startsWith("src/") && (isAnnotatedFile(file) || isDataFile(file));

  /** Loads this server's persisted drafts (once). A missing file means no drafts; an unreadable one is moved aside. */
  function ensureRestored() {
    if (restored || process.env.VITEST || !devServer) return;
    restored = true;
    const address = devServer.httpServer?.address?.();
    const port = address && typeof address === "object" ? address.port : devServer.config.server?.port ?? "dev";
    draftsFile = path.join(root, DRAFTS_DIR, `drafts-${port}.json`);
    let text;
    try {
      text = fs.readFileSync(draftsFile, "utf8");
    } catch {
      return;
    }
    const { drafts: loaded, dropped, error } = parseDrafts(text, draftable);
    if (error) {
      const aside = draftsFile.replace(/\.json$/, `.unreadable-${Date.now()}.json`);
      try { fs.renameSync(draftsFile, aside); } catch { /* the next save overwrites it */ }
      logger.warn?.(`[zen-studio] ${path.relative(root, draftsFile)} is ${error}; moved to ${path.basename(aside)}, starting without drafts`);
      return;
    }
    let settled = 0;
    for (const [file, draft] of loaded) {
      let disk = null;
      try { disk = fs.readFileSync(path.join(realRoot, file), "utf8"); } catch { /* gone from disk: kept, Save reports it */ }
      if (disk === draft.content) settled += 1;
      else drafts.set(file, draft);
    }
    if (dropped || settled) void persist();
    // Files changed while the server was down: their drafts follow the new disk text.
    for (const [file, draft] of drafts) {
      let disk = null;
      try { disk = fs.readFileSync(path.join(realRoot, file), "utf8"); } catch { continue; }
      if (sha1(disk) !== draft.baseHash) void diskChanged(path.join(realRoot, file));
    }
    if (drafts.size) logger.info?.(`[zen-studio] ${drafts.size} unsaved admin draft(s) restored: ${[...drafts.keys()].join(", ")}`, { timestamp: true });
  }

  /** Writes the drafts file after every change (in order, atomically); no drafts = no file. */
  function persist() {
    if (!draftsFile) return persistQueue;
    const target = draftsFile;
    const snapshot = drafts.size ? serializeDrafts(drafts) : null;
    persistQueue = persistQueue
      .then(async () => {
        if (snapshot === null) {
          await fsp.rm(target, { force: true });
          return;
        }
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await writeAtomic(target, snapshot);
      })
      .catch((error) => logger.warn?.(`[zen-studio] cannot save the drafts file (${error?.message ?? error}); drafts stay in memory`));
    return persistQueue;
  }

  /**
   * style-guard (--json) and usage-guard on the saved files. `ok`: neither reports an error (exit 0); `findings`: their
   * errors (✗) and warnings (⚠), one line each: "✗ src/…/button.tsx:84 spacing/token-only — message".
   */
  async function runHarness(files) {
    if (!files.length) return { ok: true, findings: [] };
    const [style, usage] = await Promise.all([
      runNode(["tools/style-guard/check-styles.mjs", "--json", ...files]),
      runNode(["tools/usage-guard/check-usage.mjs", ...files]),
    ]);
    const findings = [];
    let ok = true;
    let list = null;
    try { list = style.error ? null : JSON.parse(style.stdout); } catch { list = null; }
    if (!Array.isArray(list)) {
      ok = false;
      findings.push(`✗ style-guard did not run: ${style.error ?? firstLine(style.stderr || style.stdout) ?? "no output"}`);
    } else {
      for (const item of list) {
        if (item?.new === false) continue;
        findings.push(`${item?.severity === "error" ? "✗" : "⚠"} ${item?.file}:${item?.line} ${item?.rule} — ${item?.message}`);
      }
      if (style.code !== 0) ok = false;
    }
    if (usage.error) {
      ok = false;
      findings.push(`✗ usage-guard did not run: ${usage.error}`);
    } else {
      let found = 0;
      for (const line of `${usage.stdout}\n${usage.stderr}`.split(/\r?\n/)) {
        const match = /^([✗⚠])\s+(\S+:\d+)\s+\[([^\]]+)\]\s+(.*?)(?:\s+→\s+\S+)?$/.exec(line.trim());
        if (!match) continue;
        found += 1;
        findings.push(`${match[1]} ${match[2]} ${match[3]} — ${match[4]}`);
      }
      if (usage.code !== 0) {
        ok = false;
        if (!found) findings.push(`✗ usage-guard failed: ${firstLine(usage.stderr || usage.stdout) ?? `exit ${usage.code}`}`);
      }
    }
    return { ok, findings };
  }

  /** `node <args>` in the repo root: { code, stdout, stderr } or { error } (could not start, timed out). */
  function runNode(args) {
    return new Promise((resolve) => {
      execFile(process.execPath, args, { cwd: root, timeout: HARNESS_TIMEOUT, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" }, (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") resolve({ error: error.killed ? `timed out after ${HARNESS_TIMEOUT / 1000} s` : String(error.message ?? error), stdout, stderr });
        else resolve({ code: error ? error.code : 0, stdout, stderr });
      });
    });
  }

  /** Every route: a request that names an Origin must come from this server's own origin. */
  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (origin === undefined) return;
    let host = null;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    if (!host || host !== req.headers.host) throw new HttpError("forbidden", `Origin ${origin} may not use the Zen Studio API`);
  }

  /** GET /drafts and every write: a loopback Host (no DNS rebinding) and this server's token. */
  function checkToken(req) {
    if (!loopbackHost(req)) throw new HttpError("forbidden", "Source edits are only accepted on localhost");
    if (req.headers[TOKEN_HEADER] !== token) throw new HttpError("forbidden", `Missing or outdated ${TOKEN_HEADER} (GET ${PREFIX}/ping gives it)`, 403, { reason: "token" });
  }

  /** /edit, /write, /save, /discard: a loopback Host, admin role, this server's token, a JSON body. */
  function checkWriteHeaders(req) {
    if (!loopbackHost(req)) throw new HttpError("forbidden", "Source edits are only accepted on localhost");
    if (req.headers[ROLE_HEADER] !== "admin") throw new HttpError("forbidden", `Editing needs the ${ROLE_HEADER}: admin header`);
    checkToken(req);
    if (!String(req.headers["content-type"] ?? "").includes("application/json")) throw new HttpError("invalid", "Send JSON (content-type: application/json)");
  }

  /* ── files ──────────────────────────────────────────────────────────────────────────────────────────────────── */

  /**
   * A repo-relative path under src/, resolved (symlinks, case) to the file on disk. Edits need the exact real path of an
   * annotated file: a link, or a differently-cased spelling on a case-insensitive disk, is refused.
   */
  async function resolveFile(rel, forEdit) {
    if (typeof rel !== "string" || !rel || rel.includes("\0") || rel.includes("\\")) throw new HttpError("invalid", "Missing or malformed `file`");
    if (path.posix.normalize(rel) !== rel || path.posix.isAbsolute(rel)) throw new HttpError("forbidden", `${rel} is not a normalised repo-relative path`);
    if (!rel.startsWith("src/")) throw new HttpError("forbidden", `${rel} is outside src/`);
    // Data files (examples/data.ts, a template's data) take the edits a value's source gets (op setDataField, then undo).
    if (forEdit && !isAnnotatedFile(rel) && !isDataFile(rel)) throw new HttpError("forbidden", `${rel} is not an editable example source`);
    const srcDir = path.join(root, "src");
    const abs = path.resolve(root, rel);
    if (!abs.startsWith(srcDir + path.sep)) throw new HttpError("forbidden", `${rel} is outside src/`);
    let real;
    let realRoot;
    try {
      real = fs.realpathSync.native(abs);
      realRoot = fs.realpathSync.native(root);
    } catch {
      throw new HttpError("not-found", `${rel} does not exist`);
    }
    const realRel = toPosix(path.relative(realRoot, real));
    if (!realRel.startsWith("src/") || realRel.startsWith("../") || path.isAbsolute(realRel)) throw new HttpError("forbidden", `${rel} resolves outside src/`);
    if (forEdit) {
      if (realRel !== rel) throw new HttpError("forbidden", `${rel} is a link or a differently-cased path (the file is ${realRel})`);
      if (!isAnnotatedFile(realRel) && !isDataFile(realRel)) throw new HttpError("forbidden", `${realRel} is not an editable example source`);
    }
    // realRel keys the drafts (a read may name the file by another spelling).
    return { rel, realRel, abs: real };
  }

  async function readText(abs) {
    try {
      const stat = await fsp.stat(abs);
      if (!stat.isFile()) throw new HttpError("not-found", "Not a file");
      if (stat.size > MAX_BODY) throw new HttpError("invalid", "File too large");
      return await fsp.readFile(abs, "utf8");
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError("not-found", `Cannot read ${toPosix(path.relative(root, abs))}`);
    }
  }

  function isWritable() {
    try {
      fs.accessSync(path.join(root, "src"), fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  let typographyCache = null;
  /** Keys of typographyStyles (src/tokens/typography.generated.ts), to refuse a setTypography / setTextStyle to an unknown style. */
  function typographyKeys() {
    if (!typographyCache?.size) {
      try {
        const source = fs.readFileSync(path.join(root, "src/tokens/typography.generated.ts"), "utf8");
        // Only the typographyStyles object: textStyleDefinitions below it also has "className": "zen-type-…" lines.
        const block = /export const typographyStyles = \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
        typographyCache = new Set([...block.matchAll(/^\s*"([^"]+)":\s*"zen-type-/gm)].map((match) => match[1]));
      } catch {
        typographyCache = new Set();
      }
    }
    return typographyCache;
  }

  let pagesCache = null;
  /** The builder pages folder (pages-folder.mjs); a write must be a valid page with this library's components. */
  function pages() {
    // ZEN_STUDIO_PAGES_DIR (relative to the root): the Studio E2E server keeps its pages apart from the real ones.
    pagesCache ??= pagesFolder(root, {
      dir: process.env.ZEN_STUDIO_PAGES_DIR || PAGES_DIR,
      validate: (text) => validateDialect(text, { components: new Set([...slotData().componentModules.keys()].filter((name) => /^[A-Z]/.test(name))) }),
    });
    return pagesCache;
  }
  async function pagesCall(task) {
    try {
      return await task();
    } catch (error) {
      if (error instanceof PagesError) throw new HttpError(error.code, error.message);
      throw error;
    }
  }

  let slotCache = null;
  /**
   * What the slot ops need from the repo, read once per server start: every value src/components/*\/index.ts exports →
   * its folder (componentModules), and the components whose children or props are required (src/platform/api.generated.json).
   */
  function slotData() {
    if (!slotCache) {
      let api = {};
      try { api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8")); } catch { /* nothing required */ }
      slotCache = { componentModules: componentModulesFrom(root), ...requiredFromApi(api) };
    }
    return slotCache;
  }

  /** The rules of src/**\/*.css whose selectors name a .zen-* class (detach.mjs cssRules): [{ file, line, selector }]. */
  function readComponentCss() {
    const out = [];
    const visit = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && !entry.name.startsWith(".")) visit(abs);
        } else if (entry.name.endsWith(".css")) {
          try {
            const css = fs.readFileSync(abs, "utf8");
            if (css.includes(".zen-")) out.push(...cssRules(css, toPosix(path.relative(root, abs))));
          } catch {
            // an unreadable stylesheet adds nothing
          }
        }
      }
    };
    visit(path.join(root, "src"));
    return out;
  }

  return [annotatePlugin, apiPlugin];
}

/* ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * One write at a time: an edit reads, checks and writes without another request in between. A task whose client went
 * away before its turn is skipped; a task that hangs is given up after TASK_TIMEOUT, so the queue always moves on.
 */
let queue = Promise.resolve();
function exclusive(task, gone = () => false) {
  const run = queue.then(() => {
    if (gone()) throw new HttpError("invalid", "The request was cancelled before its turn");
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new HttpError("invalid", "The dev server took too long to apply the change", 503)), TASK_TIMEOUT);
    });
    return Promise.race([Promise.resolve().then(task), timeout]).finally(() => clearTimeout(timer));
  });
  queue = run.catch(() => undefined);
  return run;
}

const firstLine = (text) => String(text ?? "").split(/\r?\n/).find((line) => line.trim())?.trim() ?? null;

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** The request was addressed to this machine by a loopback name (localhost, *.localhost, 127.x.x.x, [::1]). */
function loopbackHost(req) {
  let hostname = "";
  try {
    hostname = new URL(`http://${req.headers.host ?? ""}`).hostname;
  } catch {
    return false;
  }
  return hostname === "localhost" || hostname.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "[::1]";
}

/** Whether the client has hung up (its response can no longer be delivered). */
function watchClient(req, res) {
  // Not req.destroyed: a fully read request destroys itself (autoDestroy) while its socket stays open for the answer.
  let gone = false;
  const hangUp = () => { if (!res.writableEnded) gone = true; };
  res.once("close", hangUp);
  return () => gone || Boolean(req.socket?.destroyed);
}

/** Temp file in the same folder, then rename: the watcher and the browser never see a half-written file. */
async function writeAtomic(abs, content) {
  const temp = path.join(path.dirname(abs), `.${path.basename(abs)}.${process.pid}-${Date.now()}.zen-studio-tmp`);
  let mode;
  try {
    mode = (await fsp.stat(abs)).mode & 0o777;
  } catch {
    mode = undefined;
  }
  await fsp.writeFile(temp, content, { encoding: "utf8", mode });
  try {
    await fsp.rename(temp, abs);
  } catch (error) {
    await fsp.rm(temp, { force: true });
    throw error;
  }
}

async function readJson(req) {
  const raw = await readBody(req);
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    return body;
  } catch {
    throw new HttpError("invalid", "The body is not a JSON object");
  }
}

/**
 * The request body as text. Settles on every path: end, error, abort/close before the end, and a BODY_TIMEOUT stall.
 * A body over MAX_BODY is read to its end without keeping it, then refused with 413, so the client gets the answer.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.readableEnded) { reject(new HttpError("invalid", "The request body was already read")); return; }
    if (req.destroyed) { reject(new HttpError("invalid", "The request was aborted")); return; }
    const chunks = [];
    let size = 0;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => {
      finish(new HttpError("invalid", "The request body did not arrive in time", 408));
      req.destroy();
    }, BODY_TIMEOUT);
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) chunks.length = 0;
      else chunks.push(chunk);
    });
    req.on("end", () => {
      if (size > MAX_BODY) finish(new HttpError("invalid", `Request body too large (over ${MAX_BODY / 1024 / 1024} MB)`, 413));
      else finish(null, Buffer.concat(chunks).toString("utf8"));
    });
    req.on("aborted", () => finish(new HttpError("invalid", "The request was aborted")));
    req.on("close", () => { if (!req.complete) finish(new HttpError("invalid", "The request was aborted")); });
    req.on("error", (error) => finish(error));
  });
}

function send(res, status, body) {
  if (res.headersSent || res.destroyed || res.writableEnded) return;
  const json = JSON.stringify(body);
  res.statusCode = status;
  for (const name of res.getHeaderNames()) if (name.startsWith("access-control-")) res.removeHeader(name);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(json);
}
