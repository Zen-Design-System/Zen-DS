import type { IconName } from "../../../components/Icon";
import { collections } from "../../../foundations/collections";
import { componentNavigation, pageLabels } from "../../PlatformApp";
import type { PlatformPage } from "../../PlatformExamples";
import { studioStore } from "../store";

/* Routing and the page list of Zen Studio: the classic PlatformApp's URL scheme (?page=…&collection=…), its labels and
   its navigation search, so links are shared between the two UIs. */

const componentIds = new Set<PlatformPage>(componentNavigation.map((item) => item.id));
export const isComponentPage = (page: PlatformPage) => componentIds.has(page);

export function readLocation(): { page: PlatformPage; collection: string | null; localPage: string | null } {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("page");
  // A builder page kept in this browser (Studio builder GĐ2): ?page=local:<id>. The docs page stays as it was.
  const local = requested ? /^local:([a-z0-9][a-z0-9-]{0,63})$/.exec(requested)?.[1] ?? null : null;
  if (local) return { page: studioStore.getState().page, collection: studioStore.getState().collection, localPage: local };
  const page = requested && requested in pageLabels ? (requested as PlatformPage) : "overviews";
  const slug = params.get("collection");
  const collection = page === "design-tokens" && slug && collections.some((item) => item.slug === slug) ? slug : null;
  return { page, collection, localPage: null };
}

/** Opens a page (a history entry is pushed by StudioApp). The selection and Present belong to the page they were on. */
export function navigate(page: PlatformPage, collection: string | null = null) {
  const state = studioStore.getState();
  const nextCollection = page === "design-tokens" ? collection : null;
  if (state.page === page && state.collection === nextCollection && !state.localPage) { if (state.drawer === "left") studioStore.setState({ drawer: null }); return; }
  studioStore.setState({ page, collection: nextCollection, localPage: null, selection: null, presenting: null, drawer: state.drawer === "left" ? null : state.drawer });
}

/** Opens a builder page kept in this browser (?page=local:<id>). */
export function openLocalPage(id: string) {
  const state = studioStore.getState();
  if (state.localPage === id) { if (state.drawer === "left") studioStore.setState({ drawer: null }); return; }
  studioStore.setState({ localPage: id, selection: null, presenting: null, drawer: state.drawer === "left" ? null : state.drawer });
}

export const collectionName = (slug: string | null) => (slug ? collections.find((item) => item.slug === slug)?.name ?? slug : null);

/** "Button", "Design Tokens", "Global Colors": the document title and the canvas name. */
export const pageTitle = (page: PlatformPage, collection: string | null) => collectionName(collection) ?? pageLabels[page];

export type StudioCrumb = { id: string; label: string; page?: PlatformPage; section?: string };

/** Group / page, from the Pages panel sections (the classic getBreadcrumbs with the group named). */
export function breadcrumbsFor(page: PlatformPage, collection: string | null, local?: { id: string; title: string } | null): StudioCrumb[] {
  // A builder page kept in this browser (Studio builder GĐ2).
  if (local) return [{ id: "mine", label: "My pages" }, { id: `local:${local.id}`, label: local.title }];
  if (page === "overviews" || page === "installation") return [{ id: "get-started", label: "Get started", section: "get-started" }, { id: page, label: pageLabels[page] }];
  if (page === "design-tokens") {
    const name = collectionName(collection);
    return name
      ? [{ id: "foundation", label: "Foundation", section: "foundation" }, { id: "design-tokens", label: "Design Tokens", page: "design-tokens" }, { id: collection!, label: name }]
      : [{ id: "foundation", label: "Foundation", section: "foundation" }, { id: page, label: pageLabels[page] }];
  }
  if (page === "typography" || page === "iconography") return [{ id: "foundation", label: "Foundation", section: "foundation" }, { id: page, label: pageLabels[page] }];
  return [{ id: "components", label: "Components", section: "components" }, { id: page, label: pageLabels[page] }];
}

export type PageNavItem = { id: string; label: string; page: PlatformPage; collection?: string; icon: IconName; children?: PageNavItem[] };
export type PageNavSection = { id: string; label: string; items: PageNavItem[] };

export function pageSections(): PageNavSection[] {
  return [
    { id: "get-started", label: "Get started", items: [
      { id: "overviews", label: "Overviews", page: "overviews", icon: "icon-home-03-line" },
      { id: "installation", label: "Installation", page: "installation", icon: "icon-disc-line" },
    ] },
    { id: "foundation", label: "Foundation", items: [
      { id: "design-tokens", label: "Design Tokens", page: "design-tokens", icon: "icon-beaker-01-line", children: collections.map((item) => ({ id: item.slug, label: item.name, page: "design-tokens" as PlatformPage, collection: item.slug, icon: "icon-beaker-01-line" as IconName })) },
      { id: "typography", label: "Typography", page: "typography", icon: "icon-type-01-line" },
      { id: "iconography", label: "Iconography", page: "iconography", icon: "icon-bezier-curve-02-line" },
    ] },
    { id: "components", label: "Components", items: componentNavigation
      .map(({ id, label }) => ({ id, label, page: id, icon: "icon-cube-line" as IconName }))
      .sort((left, right) => left.label.localeCompare(right.label)) },
  ];
}

/** Case- and accent-insensitive text for matching ("Tokens", "tokens", "Tóken" all match "token"). */
const searchable = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * The classic navigation search: every query word matches the start of a label word ("to" → Toast, Toggle, Design
 * Tokens — not Button); when that finds nothing, any substring counts. Nested pages (token collections) match on their
 * own label and are listed on their own while searching.
 */
export function filterSections(sections: PageNavSection[], query: string): PageNavSection[] {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (!words.length) return sections;
  const prefix = (label: string) => { const parts = searchable(label).split(/[^a-z0-9]+/); return words.every((word) => parts.some((part) => part.startsWith(word))); };
  const substring = (label: string) => words.every((word) => searchable(label).includes(word));
  const byPrefix = filterWith(sections, prefix);
  return byPrefix.length ? byPrefix : filterWith(sections, substring);
}

function filterWith(sections: PageNavSection[], matches: (label: string) => boolean): PageNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.flatMap((item) => [
        ...(matches(item.label) ? [{ ...item, children: undefined }] : []),
        ...(item.children ?? []).filter((child) => matches(child.label)),
      ]),
    }))
    .filter((section) => section.items.length);
}
