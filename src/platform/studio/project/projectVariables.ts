import { projectBaseValues, type Project } from "../../../../tools/studio/project-theme.mjs";
import type { Collection } from "../variables/variablesModel";

/*
 * A Studio project's local variables (user, 2026-10-18: "không truy xuất được Local variable của dự án"): in the
 * Variables window, Base Colors (Project) takes the open project's mode as its first column — the values its theme
 * makes (projectBaseValues: aliases to the shipped ramps, or the custom ramps' hex), the Zen value where the theme sets
 * nothing — so every collection resolves through it, as Figma resolves through a file's mode. The column is the theme's
 * output, never a token source: it is edited in Project settings, and tokens/source keeps only the Zen mode.
 */

export const PROJECT_COLLECTION = "Base Colors (Project)";

/** The project's column name: its name, unless a mode of the collection already has it. */
export function projectModeName(project: Project, modes: readonly string[]): string {
  return modes.includes(project.name) ? `${project.name} (project)` : project.name;
}

/** The collections with the project's mode first in Base Colors (Project); unchanged without a project. */
export function withProjectMode(collections: readonly Collection[] | null, project: Project | null): Collection[] | null {
  if (!collections || !project) return collections ? [...collections] : null;
  const values = projectBaseValues(project.theme);
  return collections.map((collection) => {
    if (collection.name !== PROJECT_COLLECTION) return collection;
    const mode = projectModeName(project, collection.modes);
    const zen = collection.modes[0];
    return {
      ...collection,
      modes: [mode, ...collection.modes],
      tokens: collection.tokens.map((token) => ({ ...token, valuesByMode: { [mode]: values[token.name] ?? token.valuesByMode[zen], ...token.valuesByMode } })),
    };
  });
}
