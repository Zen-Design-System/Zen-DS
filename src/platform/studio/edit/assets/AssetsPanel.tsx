import { useMemo, useState } from "react";
import { EmptyState } from "../../../../components/EmptyState";
import { Icon } from "../../../../components/Icon";
import { Search } from "../../../../components/Search";
import type { IconName } from "../../../../icons/generated/names";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { PALETTE, PALETTE_GROUPS, searchPalette, type PaletteGroup } from "../../slots/palette";
import { insertAsset, pressAsset } from "./assets";
import "./assets.css";

/*
 * The left panel's Assets tab (Figma's Assets): the Zen components the Studio can add, by group, with search. A click
 * adds one into the selected layout (else right after the selected layer); dragging one onto the canvas shows where it
 * lands. Keyboard: Tab to a row, Enter adds it at the selection.
 */

const GROUP_ICON: Record<PaletteGroup, IconName> = {
  Text: "icon-type-01-line",
  Actions: "icon-pointer-line",
  Navigation: "icon-navigation-pointer-01-line",
  "Data display": "icon-table-line",
  Charts: "icon-bar-chart-01-line",
  Feedback: "icon-alert-circle-line",
  Inputs: "icon-text-input-line",
  Overlays: "icon-layers-three-01-line",
  Layout: "icon-layout-grid-01-line",
  Page: "icon-browser-line",
  Chat: "icon-message-chat-circle-line",
};

export function AssetsPanel() {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const items = query.trim() ? searchPalette(PALETTE, query) : PALETTE;
    return PALETTE_GROUPS.map((group) => ({ group, items: items.filter((item) => item.group === group) })).filter((entry) => entry.items.length);
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
                    {item.caption ? <span className={`studio-assets__caption ${typographyStyles["Caption/Regular"]}`}>{item.caption}</span> : null}
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
