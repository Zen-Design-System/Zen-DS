import { useRef } from "react";
import { engineNow, zenComponents } from "../builder/engine";
import { componentsOf, libraryKey, type LocalComponents, type PageNode } from "../builder/render/renderPage";
import { headerProject } from "../builder/store/pageModel";
import { cachedPage, getPage, listPages, usePages } from "../builder/store/pageStore";

/*
 * Libraries' project components, a live link (the user's pick, 2026-10-22; spec docs/research/studio-libraries-spec-
 * 2026-10-22.md, phase 2): the components of every page of a page's project, by page id, so a `<Use of page>` draws
 * from its main where it is, and an edit of that main shows on every page at once. Each page is parsed once per text.
 * The canvas computes it (BuilderBoard); Play and the export draw with the one it last had.
 */

const parsed = new Map<string, { text: string; components: LocalComponents }>();

/** A page's own components (its `<Component>` and `<ComponentSet>` by id), from its text as this browser has it. */
export function pageComponents(id: string): LocalComponents | null {
  const text = cachedPage(id)?.text;
  if (text === undefined) return null;
  const known = parsed.get(id);
  if (known?.text === text) return known.components;
  const engine = engineNow();
  if (!engine) return null;
  let components: LocalComponents = new Map();
  try {
    const tree = engine.parsePage(text, { components: new Set(zenComponents) }) as unknown as { board: PageNode | null };
    components = componentsOf(tree.board ?? null);
  } catch {
    // A page that does not parse lends nothing (its instances elsewhere draw nothing until it does).
  }
  parsed.set(id, { text, components });
  return components;
}

const libraries = new Map<string, ReadonlyMap<string, LocalComponents>>();

/** The library `pageId` was last drawn with (Play and the HTML export draw its instances with the same). */
export const libraryOf = (pageId: string) => libraries.get(pageId);

/** The project of `pageId` (its header's), or null for a draft. */
export const projectOfPage = (pageId: string) => headerProject(cachedPage(pageId)?.text ?? "");

/**
 * The components of every page of `pageId`'s project by page id, `own` for the page itself (its live tree); undefined
 * for a draft. The same object while nothing in it changed, so the canvas keeps its drawn elements.
 */
export function useProjectLibrary(pageId: string | null, own: LocalComponents): ReadonlyMap<string, LocalComponents> | undefined {
  const pages = usePages();
  const last = useRef<{ key: string; library: ReadonlyMap<string, LocalComponents> } | null>(null);
  const project = pageId ? projectOfPage(pageId) : null;
  if (!pageId || !project) {
    if (pageId) libraries.delete(pageId);
    last.current = null;
    return undefined;
  }
  const library = new Map<string, LocalComponents>([[pageId, own]]);
  for (const meta of pages) {
    if (meta.id === pageId || projectOfPage(meta.id) !== project) continue;
    const components = pageComponents(meta.id);
    if (components?.size) library.set(meta.id, components);
  }
  const key = libraryKey(library);
  if (last.current?.key !== key) last.current = { key, library };
  libraries.set(pageId, last.current.library);
  return last.current.library;
}

/**
 * The texts of the other pages of `pageId`'s project by id (the Figma push and Open on phone draw their components'
 * instances). With `from` (the page's text), only the pages its `<Use page>` reach, and the pages those reach in turn.
 */
export async function projectPageTexts(pageId: string, from?: string): Promise<Record<string, string>> {
  const project = projectOfPage(pageId) ?? headerProject((await getPage(pageId))?.text ?? "");
  if (!project) return {};
  const all: Record<string, string> = {};
  for (const meta of await listPages()) {
    if (meta.id === pageId) continue;
    const text = cachedPage(meta.id)?.text ?? (await getPage(meta.id))?.text;
    if (text && headerProject(text) === project) all[meta.id] = text;
  }
  if (from === undefined) return all;
  const reached: Record<string, string> = {};
  const queue = [from];
  for (let text = queue.shift(); text !== undefined; text = queue.shift()) {
    for (const [, id] of text.matchAll(/\bpage="([a-z0-9][a-z0-9-]{0,63})"/g)) {
      if (!(id in all) || id in reached) continue;
      reached[id] = all[id];
      queue.push(all[id]);
    }
  }
  return reached;
}

type Link = { page: string; id: string };
/**
 * Whether the component `from` holds `target` (its main, or a main of its set) anywhere inside it, through the
 * instances its layers hold on any page of the project (a `<Use>` without `page` names its own page's). Figma refuses a
 * component inside itself; an instance placed so would draw nothing.
 */
export function holdsComponent(library: ReadonlyMap<string, LocalComponents> | undefined, from: Link, target: Link): boolean {
  if (!library) return false;
  const seen = new Set<string>();
  const roots = (link: Link): PageNode[] => {
    const entry = library.get(link.page)?.get(link.id);
    if (!entry) return [];
    if (entry.kind === "main") return [entry.root];
    return entry.variants.flatMap((variant) => { const main = library.get(link.page)?.get(variant); return main?.kind === "main" ? [main.root] : []; });
  };
  const named = (link: Link) => {
    if (link.page !== target.page) return false;
    if (link.id === target.id) return true;
    const entry = library.get(link.page)?.get(link.id);
    return entry?.kind === "set" ? entry.variants.includes(target.id) : false;
  };
  const visit = (link: Link): boolean => {
    const key = `${link.page}/${link.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (named(link)) return true;
    const uses: Link[] = [];
    const walk = (node: PageNode) => {
      if (node.name === "Use") {
        const page = node.props.page?.kind === "literal" ? String(node.props.page.value) : link.page;
        const of = node.props.of?.kind === "literal" ? String(node.props.of.value) : "";
        if (of) uses.push({ page, id: of });
      }
      for (const value of Object.values(node.props)) if (value.kind === "element") walk(value.node);
      for (const child of node.children) {
        if (child.kind === "element") walk(child);
        else if (child.kind === "map") walk(child.node);
      }
    };
    roots(link).forEach(walk);
    return uses.some(visit);
  };
  return visit(from);
}

