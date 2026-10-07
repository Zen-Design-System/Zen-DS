import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { Icon } from "../../../components/Icon";
import { Search } from "../../../components/Search";
import { plural, Text } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { useStudio } from "../store";
import { MyPageRow, MyPagesHeader } from "../builder/MyPages";
import { NewPageDialog } from "../builder/NewPageDialog";
import { usePages } from "../builder/store/pageStore";
import { filterSections, navigate, openLocalPage, pageSections, type PageNavItem } from "./navigation";
import "./shell.css";

export const PAGE_SEARCH_ID = "studio-page-search";

const ROW = ".studio-pages__row";

/**
 * The Pages tab of the left panel: search (⌘/Ctrl+K), My pages (builder pages: New page, options, each page's actions; MyPages.tsx), Get started, Foundation (token collections nested under Design
 * Tokens), Components A–Z. Compact rows like the Layers tab; ↑/↓, Home and End move between pages (one Tab stop).
 */
export function PagesPanel() {
  const page = useStudio((state) => state.page);
  const collection = useStudio((state) => state.collection);
  const localPage = useStudio((state) => state.localPage);
  const myPages = usePages();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const sections = useMemo(() => pageSections(), []);
  const visible = useMemo(() => filterSections(sections, query), [sections, query]);
  const mine = myPages.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));
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
  const tabStop = localPage ? null : rows.find(isCurrent) ?? (mine.length ? null : rows[0]);
  const mineStop = mine.find((item) => item.id === localPage) ?? (tabStop ? null : mine[0]);

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
          placeholder="Search pages"
          aria-label="Search pages"
          shortcut="k"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          onKeyDown={(event) => {
            // Enter opens the first match; ↓ moves into the list; Escape clears the query.
            if (event.key === "Enter") {
              const first = visible[0]?.items[0];
              if (first) { open(first); setQuery(""); }
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
        {/* Builder pages kept in this browser (Studio builder GĐ2), first: the pages people make. */}
        {!searching || mine.length ? (
          <div className="studio-pages__section" data-section="mine">
            <MyPagesHeader onNew={() => setCreating(true)} />
            {mine.length ? (
              <ul className="studio-pages__list" aria-labelledby="studio-pages-mine">
                {mine.map((item) => <MyPageRow key={item.id} item={item} current={item.id === localPage} tabIndex={item === mineStop ? 0 : -1} />)}
              </ul>
            ) : null}
          </div>
        ) : null}
        {searching && !results ? (
          <EmptyState className="studio-pages__empty" title="No pages found" headingLevel={2} compactTitle icon="icon-search-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
            Nothing matches “{query.trim()}”. Try a component name like “Button”.
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
      <NewPageDialog open={creating} onOpenChange={setCreating} />
    </nav>
  );
}
