import { headerProject } from "../builder/store/pageModel";
import { cachedPage, usePages, type PageMeta } from "../builder/store/pageStore";
import { useProjects } from "./projectStore";

/* Which Studio project a page belongs to (its header `project`, 2026-10-17), for the lists: no UI imports, so the Pages
   panel, the page rows and the projects home all read it without importing one another. */

/** The project a page belongs to among the known ones; a page naming a project that is gone is a draft. */
export function pageProjectOf(id: string, known: ReadonlySet<string>): string | null {
  const project = headerProject(cachedPage(id)?.text ?? "");
  return project && known.has(project) ? project : null;
}

/** The pages of a project (null: Drafts). */
export function usePagesOf(project: string | null): PageMeta[] {
  const pages = usePages();
  const known = new Set(useProjects().map((item) => item.id));
  return pages.filter((page) => pageProjectOf(page.id, known) === project);
}
