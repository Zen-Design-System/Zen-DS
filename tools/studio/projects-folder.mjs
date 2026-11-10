// Zen Studio projects on the dev server (2026-10-17, tools/studio/project-theme.mjs): one folder per project next to
// the pages, gitignored with the rest of .zen-studio:
//
//   .zen-studio/projects/<id>/project.json   the project: name and theme settings (the source)
//   .zen-studio/projects/<id>/theme.css      its Base Colors (Project) mode, written from project.json on every save
//   .zen-studio/projects/<id>/fonts/<file>   the fonts it uploaded (theme.type.uploads; 2026-11-10), theme.css names them
//
//   projectsFolder(root) → { list(), read(id), write(project), trash(id), writeFont(id, file, bytes), readFont(id, file) }
//
// Rules as for the pages (pages-folder.mjs): ids match PROJECT_ID, no symlink anywhere on the way, writes are atomic,
// project.json is at most MAX_PROJECT bytes and goes through normalizeProject (an unknown value becomes the default),
// nothing is ever deleted over HTTP: trash(id) moves the folder to `.zen-studio/trash/projects/<id>-<stamp>/`.
import fsp from "node:fs/promises";
import path from "node:path";
import { FONT_FILE, MAX_FONT_BYTES, PROJECT_ID, fontKindOf, normalizeProject, projectThemeCss } from "./project-theme.mjs";

export const PROJECTS_DIR = ".zen-studio/projects";
export const MAX_PROJECT = 64 * 1024;

export class ProjectsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function projectsFolder(root, { dir = PROJECTS_DIR } = {}) {
  const projectsAbs = path.join(root, dir);
  const trashAbs = path.join(path.dirname(projectsAbs), "trash", "projects");

  const checkId = (id) => {
    if (typeof id !== "string" || !PROJECT_ID.test(id)) throw new ProjectsError("invalid", `Bad project id ${JSON.stringify(id)}`);
  };
  /** Creates `at` as real folders; refuses when any part under the root is a link. */
  async function ensureDir(at) {
    await fsp.mkdir(at, { recursive: true });
    for (let step = at; step.startsWith(root) && step !== root; step = path.dirname(step)) {
      const stat = await fsp.lstat(step);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new ProjectsError("forbidden", `${path.relative(root, step)} is a link or not a folder`);
    }
  }
  /** A real file's stat, null when missing; refuses a link. */
  async function fileStat(abs, label) {
    let stat;
    try {
      stat = await fsp.lstat(abs);
    } catch {
      return null;
    }
    if (stat.isSymbolicLink() || !stat.isFile()) throw new ProjectsError("forbidden", `${label} is a link or not a file`);
    return stat;
  }
  async function folderOf(id) {
    checkId(id);
    const abs = path.join(projectsAbs, id);
    try {
      const stat = await fsp.lstat(abs);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new ProjectsError("forbidden", `projects/${id} is a link or not a folder`);
      return { abs, exists: true };
    } catch (error) {
      if (error instanceof ProjectsError) throw error;
      return { abs, exists: false };
    }
  }
  async function writeAtomic(folder, name, text) {
    const abs = path.join(folder, name);
    await fileStat(abs, name);
    const temp = path.join(folder, `.${name}.${process.pid}-${Date.now()}.tmp`);
    await fsp.writeFile(temp, text, "utf8");
    try {
      await fsp.rename(temp, abs);
    } catch (error) {
      await fsp.rm(temp, { force: true });
      throw error;
    }
  }

  async function read(id) {
    const { abs, exists } = await folderOf(id);
    if (!exists) throw new ProjectsError("not-found", `No project ${id} in ${dir}`);
    const file = path.join(abs, "project.json");
    const stat = await fileStat(file, `projects/${id}/project.json`);
    if (!stat) throw new ProjectsError("not-found", `projects/${id} has no project.json`);
    if (stat.size > MAX_PROJECT) throw new ProjectsError("invalid", `projects/${id}/project.json is over ${MAX_PROJECT / 1024} KB`);
    let json;
    try {
      json = JSON.parse(await fsp.readFile(file, "utf8"));
    } catch {
      throw new ProjectsError("invalid", `projects/${id}/project.json is not JSON`);
    }
    const { project, errors } = normalizeProject({ ...json, id });
    if (!project) throw new ProjectsError("invalid", `projects/${id}/project.json: ${errors[0]}`);
    return { project, errors, mtime: Math.round(stat.mtimeMs), fonts: await fontsIn(abs) };
  }

  /** The font files a project's fonts/ folder holds (their names; a link or an odd name is skipped). */
  async function fontsIn(abs) {
    try {
      const folder = path.join(abs, "fonts");
      if ((await fsp.lstat(folder)).isSymbolicLink()) return [];
      return (await fsp.readdir(folder, { withFileTypes: true })).filter((entry) => entry.isFile() && FONT_FILE.test(entry.name)).map((entry) => entry.name).sort();
    } catch {
      return [];
    }
  }
  /** A font file's path in an existing project's fonts/ folder; refuses an odd name. */
  async function fontPath(id, file) {
    if (typeof file !== "string" || !FONT_FILE.test(file)) throw new ProjectsError("invalid", `Bad font file name ${JSON.stringify(file)}`);
    const { abs, exists } = await folderOf(id);
    if (!exists) throw new ProjectsError("not-found", `No project ${id} in ${dir}`);
    return { folder: path.join(abs, "fonts"), abs: path.join(abs, "fonts", file) };
  }

  return {
    dir,

    /** Every readable project: [{ project, errors, mtime }], by name (a broken one is skipped). */
    async list() {
      let entries;
      try {
        const stat = await fsp.lstat(projectsAbs);
        if (stat.isSymbolicLink() || !stat.isDirectory()) return [];
        entries = await fsp.readdir(projectsAbs, { withFileTypes: true });
      } catch {
        return [];
      }
      const projects = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || !PROJECT_ID.test(entry.name)) continue;
        try {
          projects.push(await read(entry.name));
        } catch {
          // not a project folder
        }
      }
      return projects.sort((a, b) => a.project.name.localeCompare(b.project.name));
    },

    read,

    /** Writes project.json and its theme.css (normalised first; `errors` names the values that fell back). */
    async write(input) {
      const text = JSON.stringify(input ?? null);
      if (Buffer.byteLength(text, "utf8") > MAX_PROJECT) throw new ProjectsError("invalid", `A project is at most ${MAX_PROJECT / 1024} KB`);
      const { project, errors } = normalizeProject(input);
      if (!project) throw new ProjectsError("invalid", errors[0]);
      const { abs } = await folderOf(project.id);
      await ensureDir(abs);
      await writeAtomic(abs, "project.json", `${JSON.stringify(project, null, 2)}\n`);
      await writeAtomic(abs, "theme.css", projectThemeCss(project.id, project.theme, { name: project.name }));
      const stat = await fsp.stat(path.join(abs, "project.json"));
      return { project, errors, mtime: Math.round(stat.mtimeMs) };
    },

    /**
     * Keeps an uploaded font in the project's fonts/ folder: a font file (its first bytes say the kind its name ends in)
     * of up to 5 MB. Its name holds a hash of its bytes, so a file already there is the same font and stays.
     */
    async writeFont(id, file, bytes) {
      const at = await fontPath(id, file);
      if (!bytes?.length || bytes.length > MAX_FONT_BYTES) throw new ProjectsError("invalid", `A font file is at most ${MAX_FONT_BYTES / 1024 / 1024} MB`);
      if (fontKindOf(bytes) !== file.split(".").pop()) throw new ProjectsError("invalid", `${file} is not a ${file.split(".").pop()} font`);
      await ensureDir(at.folder);
      if (await fileStat(at.abs, `projects/${id}/fonts/${file}`)) return { file, written: false };
      const temp = path.join(at.folder, `.${file}.${process.pid}-${Date.now()}.tmp`);
      await fsp.writeFile(temp, bytes);
      try {
        await fsp.rename(temp, at.abs);
      } catch (error) {
        await fsp.rm(temp, { force: true });
        throw error;
      }
      return { file, written: true };
    },

    /** An uploaded font's bytes from the project's fonts/ folder. */
    async readFont(id, file) {
      const at = await fontPath(id, file);
      const stat = await fileStat(at.abs, `projects/${id}/fonts/${file}`);
      if (!stat) throw new ProjectsError("not-found", `projects/${id} has no font ${file}`);
      if (stat.size > MAX_FONT_BYTES) throw new ProjectsError("invalid", `projects/${id}/fonts/${file} is over ${MAX_FONT_BYTES / 1024 / 1024} MB`);
      return fsp.readFile(at.abs);
    },

    /** Moves the project's folder to the trash (never deletes); a missing one is already gone. Its pages stay. */
    async trash(id) {
      const { abs, exists } = await folderOf(id);
      if (!exists) return { id, trashed: false };
      await ensureDir(trashAbs);
      const to = path.join(trashAbs, `${id}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
      await fsp.rename(abs, to);
      return { id, trashed: true, to: path.relative(root, to).split(path.sep).join("/") };
    },
  };
}
