// A throwaway Vue project that type-checks emitted snippets as a reader would paste them (Code view P3): each SFC in
// snippets/, demo.ts for Vue beside them, @zen-ds/vue resolved to platforms/vue. Used by vue-snippets.mjs (the
// examples) and by the browser test's `vueTypeCheck` command (the playgrounds, vitest.config.ts).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vueTsc } from "./vue-tsc.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Type-checks `files` (`{ "name.vue": code }`) with `demo` as snippets/demo.ts: `{ ok, output, project }`, the output's
 * paths named by the files' keys. The project is removed unless `keep`. `excerpts`: the files are playground excerpts
 * whose own names are declared `any` (a callback over one then has no parameter type: allowed); every Zen component,
 * prop, slot and event is still checked.
 */
export function typeCheckVue(files, { demo = "", keep = false, excerpts = false } = {}) {
  // Inside the repo, so `vue` resolves from its node_modules as in a reader's app.
  const cache = path.join(root, "node_modules/.cache/zen-vue-snippets");
  fs.mkdirSync(cache, { recursive: true });
  const project = fs.mkdtempSync(path.join(cache, "project-"));
  fs.mkdirSync(path.join(project, "snippets"));
  if (demo) fs.writeFileSync(path.join(project, "snippets/demo.ts"), demo);
  // The demo world's photos: an imported image is a string URL, as a bundler gives it.
  fs.writeFileSync(path.join(project, "env.d.ts"), ["jpg", "png", "webp", "mp4", "webm"].map((ext) => `declare module "*.${ext}" { const url: string; export default url; }`).join("\n"));
  fs.writeFileSync(path.join(project, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", strict: true, noImplicitAny: !excerpts, noEmit: true,
      skipLibCheck: true, isolatedModules: true, resolveJsonModule: true, jsx: "preserve", types: [],
      paths: { "@zen-ds/vue": [path.join(root, "platforms/vue/src/index.ts")], "@zen-ds/core": [path.join(root, "src/core/index.ts")] },
    },
    include: ["env.d.ts", "snippets/**/*.ts", "snippets/**/*.vue"],
  }, null, 2));
  for (const [name, code] of Object.entries(files)) fs.writeFileSync(path.join(project, "snippets", name), code);
  const result = Object.keys(files).length ? vueTsc(path.join(project, "tsconfig.json")) : { ok: true, output: "" };
  if (!keep) fs.rmSync(project, { recursive: true, force: true });
  return { ...result, project };
}
