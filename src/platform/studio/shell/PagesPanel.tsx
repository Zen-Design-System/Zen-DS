import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { Search } from "../../../components/Search";
import { plural, Text } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { useStudio } from "../store";
import { MyPagesHeader } from "../builder/MyPages";
import { NewPageDialog } from "../builder/NewPageDialog";
import { FolderDialog, StudioFolderTree } from "../builder/StudioFolders";
import { useFolders } from "../builder/store/folderStore";
import { usePages } from "../builder/store/pageStore";
import { filterSections, navigate, openLocalPage, pageSections, type PageNavItem } from "./navigation";
import "./shell.css";

export const PAGE_SEARCH_ID = "studio-page-search";

const ROW = ".studio-pages__row";

/**
 * The Pages tab of the left panel, by the toolbar's space (user, 2026-10-09). Document: search (⌘/Ctrl+K), Get started,
 * Foundation (token collections nested under Design Tokens), Components A–Z. Studio: search, the folders and the pages
 * people made (New page, New folder, options; builder/StudioFolders, MyPages). Compact rows like the Layers tab; ↑/↓,
 * Home and End move between rows (one Tab stop).
 */
export function PagesPanel() {
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const localPage = useStudio((state) => state.localPage);
  const studio = useStudio((state) => state.space === "studio") || Boolean(localPage);
  const myPages = usePages();
  const folders = useFolders();
  // New page: open, and the folder it lands in (null: none).
  const [creating, setCreating] = useState<{ folder: string | null } | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [query, setQuery] = useState("");
  const sections = useMemo(() => pageSections(), []);
  const visible = useMemo(() => (studio ? [] : filterSections(sections, query)), [sections, query, studio]);
  const mine = studio ? myPages.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const results = visible.reduce((total, section) => total + section.items.length, 0) + mine.length;
  const searching = query.trim().length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the current page in view (deep links to pages low in the list).
  useEffect(() => {
    scrollRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [page, collection, localPage]);

  const open = (item: PageNavItem) => navigate(item.page, item.collection ?? null);
  const isCurrent = (item: PageNavItem) => !localPage && item.page === page && (item.collection ?? null) === (item.page === "design-tokens" ? collection : null);
  // The current page is the list's one Tab stop (the first row while searching or when it is filtered out).
  const rows = visible.flatMap((section) => section.items.flatMap((item) => [item, ...(!searching && item.children && page === item.page ? item.children : [])]));
  const tabStop = localPage ? null : rows.find(isCurrent) ?? rows[0];

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    // Only from a row: keys in a page's menu or dialog (portals that bubble here through React) stay theirs.
    if (!(event.target as HTMLElement).matches?.(ROW)) return;
    const all = Array.from(scrollRef.current?.querySelectorAll<HTMLElement>(ROW) ?? []);
    if (!all.length) return;
    event.preventDefault();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : event.key === "ArrowDown" ? Math.min(index + 1, all.length - 1) : Math.max(index - 1, 0);
    all[next].focus();
  };

  const row = (item: PageNavItem, child = false) => {
    const current = isCurrent(item);
    return (
      <li key={`${item.page}-${item.collection ?? ""}`}>
        <button
          type="button"
          className="studio-pages__row"
          data-child={child ? "true" : undefined}
          aria-current={current ? "page" : undefined}
          tabIndex={item === tabStop ? 0 : -1}
          onClick={() => open(item)}
        >
          {child ? <span className="studio-pages__indent" aria-hidden="true" /> : <Icon name={item.icon} size="sm" decorative />}
          <span className={`studio-pages__name ${typographyStyles[current ? "Body/Small/Bold" : "Body/Small/Medium"]}`}>{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <nav className="studio-pages" aria-label="Pages">
      <div className="studio-pages__search" role="search">
        <Search
          id={PAGE_SEARCH_ID}
          size="sm"
          placeholder={studio ? "Search your pages" : "Search pages"}
          aria-label={studio ? "Search your pages" : "Search pages"}
          // No ⌘K badge on the field (user, 2026-10-09); ⌘K still opens it (StudioApp, listed in Keyboard shortcuts).
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          onKeyDown={(event) => {
            // Enter opens the first match; ↓ moves into the list; Escape clears the query.
            if (event.key === "Enter") {
              const first = visible[0]?.items[0];
              if (first) { open(first); setQuery(""); }
              else if (mine[0]) { openLocalPage(mine[0].id); setQuery(""); }
            }
            if (event.key === "ArrowDown") { event.preventDefault(); scrollRef.current?.querySelector<HTMLElement>(ROW)?.focus(); }
            if (event.key === "Escape" && query) { event.preventDefault(); event.stopPropagation(); setQuery(""); }
          }}
        />
      </div>
      <Text as="span" textStyle="Caption/Regular" tone="base" className="studio-pages__status" role="status" aria-live="polite">
        {searching && results ? plural(results, "result") : ""}
      </Text>
      <div ref={scrollRef} className="studio-pages__scroll" onKeyDown={moveFocus}>
        {/* Studio space: the folders and the pages people made (builder pages kept in this browser). */}
        {studio ? (
          <div className="studio-pages__section" data-section="mine">
            <MyPagesHeader onNew={() => setCreating({ folder: null })} onNewFolder={() => setNewFolder(true)} />
            <StudioFolderTree folders={folders} pages={mine} searching={searching} onNewPage={(folder) => setCreating({ folder })} />
          </div>
        ) : null}
        {searching && !results ? (
          <EmptyState className="studio-pages__empty" title="No pages found" headingLevel={2} compactTitle icon="icon-search-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
            {studio ? `None of your pages matches “${query.trim()}”.` : <>Nothing matches “{query.trim()}”. Try a component name like “Button”.</>}
          </EmptyState>
        ) : visible.map((section) => (
          <div key={section.id} className="studio-pages__section" data-section={section.id}>
            <Text as="p" id={`studio-pages-${section.id}`} textStyle="Caption/Medium" tone="base" className="studio-pages__kicker">{section.label}</Text>
            <ul className="studio-pages__list" aria-labelledby={`studio-pages-${section.id}`}>
              {section.items.map((item) => [
                row(item),
                // Token collections show under Design Tokens while it is open.
                ...(!searching && item.children && page === item.page ? item.children.map((child) => row(child, true)) : []),
              ])}
            </ul>
          </div>
        ))}
      </div>
      <NewPageDialog open={creating !== null} folder={creating?.folder ?? null} onOpenChange={(next) => { if (!next) setCreating(null); }} />
      {newFolder ? <FolderDialog onClose={() => setNewFolder(false)} /> : null}
    </nav>
  );
}
