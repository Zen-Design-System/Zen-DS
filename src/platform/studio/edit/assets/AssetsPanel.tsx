import { useMemo, useState } from "react";
import { EmptyState } from "../../../../components/EmptyState";
import { Icon } from "../../../../components/Icon";
import { Search } from "../../../../components/Search";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { GROUP_ICON, searchCatalog } from "../../builder/library/catalog";
import { PALETTE, PALETTE_GROUPS, type PaletteItem } from "../../slots/palette";
import { insertAsset, pressAsset } from "./assets";
import "./assets.css";

/*
 * The left panel's Assets tab (Figma's Assets): the Zen components the Studio can add, by group, with search (best
 * first, synonyms in English and Vietnamese: builder/library). A click adds one into the selected layout (else right
 * after the selected layer, else into the frame in view); dragging one onto the canvas shows where it lands. Keyboard:
 * Tab to a row, Enter adds it at the selection.
 */


export function AssetsPanel() {
  const [query, setQuery] = useState("");
  // A search lists its results best first (builder/library: synonyms in English and Vietnamese, one typo); no search lists
  // the palette by group.
  const groups = useMemo((): Array<{ group: string; items: PaletteItem[] }> => {
    if (query.trim()) {
      const items = searchCatalog(query).map((entry) => entry.item);
      return items.length ? [{ group: "Results", items }] : [];
    }
    return PALETTE_GROUPS.map((group) => ({ group, items: PALETTE.filter((item) => item.group === group) as PaletteItem[] })).filter((entry) => entry.items.length);
  }, [query]);

  return (
    <div className="studio-assets">
      <div className="studio-assets__search" role="search">
        <Search
          size="sm"
          placeholder="Search components"
          aria-label="Search components"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
        />
      </div>
      <div className="studio-assets__scroll">
        {groups.length ? groups.map(({ group, items }) => (
          <section key={group} className="studio-assets__section" aria-label={group}>
            <p className={`studio-assets__kicker ${typographyStyles["Caption/Medium"]}`}>{group}</p>
            <ul className="studio-assets__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="studio-assets__row"
                    title={`${item.label}${item.caption ? ` · ${item.caption}` : ""} — drag onto the canvas, or click to add at the selection`}
                    onPointerDown={(event) => pressAsset(event.nativeEvent, item)}
                    // A pointer click is handled by the press (it can turn into a drag); Enter / Space arrive here.
                    onClick={(event) => { if (event.detail === 0) insertAsset(item); }}
                  >
                    <Icon name={GROUP_ICON[item.group]} size="sm" decorative />
                    <span className={`studio-assets__name ${typographyStyles["Body/Small/Medium"]}`}>{item.label}</span>
                    {item.caption || group === "Results" ? <span className={`studio-assets__caption ${typographyStyles["Caption/Regular"]}`}>{item.caption ?? item.group}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )) : (
          <div className="studio-assets__empty">
            <EmptyState title="No components match" compactTitle icon="icon-search-line" headingLevel={3}>
              Try another name, or clear the search.
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
