import { projectBaseValues, type Project } from "../../../../tools/studio/project-theme.mjs";
import type { Collection } from "../variables/variablesModel";

/*
 * A Studio project's local variables (user, 2026-10-18: "không truy xuất được Local variable của dự án"): in the
 * Variables window, Base Colors (Project) shows the open project's mode — the values its theme makes
 * (projectBaseValues: aliases to the shipped ramps, or the custom ramps' hex), the Zen value where the theme sets
 * nothing — so every collection resolves through it, as Figma resolves through a file's mode. It is the only mode shown
 * (user, 2026-10-18: "chỉ hiện của project đó, không cho hiện project khác hoặc mặc định (mode Zen)"): Zen is Drafts'
 * mode, and other projects are other files. The column is the theme's output, never a token source: it is edited in
 * Project settings, and tokens/source keeps only the Zen mode, so the collection's rows stay fixed inside a project.
 */

export const PROJECT_COLLECTION = "Base Colors (Project)";

/** The collections with Base Colors (Project) reduced to the project's mode; unchanged without a project. */
export function withProjectMode(collections: readonly Collection[] | null, project: Project | null): Collection[] | null {
  if (!collections || !project) return collections ? [...collections] : null;
  const values = projectBaseValues(project.theme);
  return collections.map((collection) => {
    if (collection.name !== PROJECT_COLLECTION) return collection;
    const mode = project.name;
    const zen = collection.modes[0];
    return {
      ...collection,
      modes: [mode],
      tokens: collection.tokens.map((token) => ({ ...token, valuesByMode: { [mode]: values[token.name] ?? token.valuesByMode[zen] } })),
    };
  });
}
