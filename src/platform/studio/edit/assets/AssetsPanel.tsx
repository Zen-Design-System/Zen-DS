import { useMemo, useState } from "react";
import { IconButton } from "../../../../components/Button";
import { EmptyState } from "../../../../components/EmptyState";
import { Icon } from "../../../../components/Icon";
import { Search } from "../../../../components/Search";
import { Segmented } from "../../../../components/Segmented";
import { plural, Text } from "../../../../components/Text";
import type { IconName } from "../../../../icons/generated/names";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { GROUP_ICON, searchCatalog } from "../../builder/library/catalog";
import { iconTitle, searchIconGlyphs, searchLibraryPhotos } from "../../builder/library/icons";
import { PALETTE, PALETTE_GROUPS, type PaletteItem } from "../../slots/palette";
import { useStudio } from "../../store";
import { iconInsertable, insertAsset, insertItem, paletteInsertable, photoInsertable, pressAsset, type Insertable } from "./assets";
import "./assets.css";

/*
 * The left panel's Assets tab (Figma's Assets): the Zen components the Studio can add, by group, and since GĐ3 M3 the
 * icons (a line or solid glyph per drawing) and the sample photos, each with its search (best first, synonyms in English
 * and Vietnamese: builder/library). A click adds one into the selected layout (else right after the selected layer, else
 * into the frame in view); an icon on a selected Icon swaps its glyph; dragging one onto the canvas shows where it lands.
 * Keyboard: Tab to a row or tile, Enter adds it.
 */

type Kind = "components" | "icons" | "photos";
const KINDS: Array<{ id: Kind; label: string }> = [
  { id: "components", label: "Components" },
  { id: "icons", label: "Icons" },
  { id: "photos", label: "Photos" },
];
/** At most this many icon tiles at once (a search narrows the 900-odd glyphs). */
const MAX_ICONS = 240;

/** Press: a click inserts (the press handles it, it can become a drag); Enter / Space arrive as a click of detail 0. */
const pressProps = (item: Insertable) => ({
  onPointerDown: (event: React.PointerEvent) => pressAsset(event.nativeEvent, item),
  onClick: (event: React.MouseEvent) => { if (event.detail === 0) insertItem(item); },
});

export function AssetsPanel() {
  const [kind, setKind] = useState<Kind>("components");
  const [query, setQuery] = useState("");
  const label = kind === "components" ? "Search components" : kind === "icons" ? "Search icons" : "Search photos";
  return (
    <div className="studio-assets">
      <div className="studio-assets__kinds">
        <Segmented aria-label="Library" size="sm" level="secondary" value={kind} onValueChange={(next) => setKind(next as Kind)} options={KINDS} />
      </div>
      <div className="studio-assets__search" role="search">
        <Search size="sm" placeholder={label} aria-label={label} value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
      </div>
      {kind === "components" ? <ComponentList query={query} /> : kind === "icons" ? <IconGrid query={query} /> : <PhotoGrid query={query} />}
    </div>
  );
}

function ComponentList({ query }: { query: string }) {
  // A search lists its results best first; no search lists the palette by group.
  const groups = useMemo((): Array<{ group: string; items: PaletteItem[] }> => {
    if (query.trim()) {
      const items = searchCatalog(query).map((entry) => entry.item);
      return items.length ? [{ group: "Results", items }] : [];
    }
    return PALETTE_GROUPS.map((group) => ({ group, items: PALETTE.filter((item) => item.group === group) as PaletteItem[] })).filter((entry) => entry.items.length);
  }, [query]);
  return (
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
                  onPointerDown={(event) => pressAsset(event.nativeEvent, paletteInsertable(item))}
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
      )) : <Empty what="components" />}
    </div>
  );
}

function IconGrid({ query }: { query: string }) {
  const [style, setStyle] = useState<"line" | "solid">("line");
  const swapping = useStudio((state) => state.selection?.kind === "node" && !state.selection.part && state.selection.name === "Icon");
  const glyphs = useMemo(() => searchIconGlyphs(query).filter((glyph) => glyph[style] ?? glyph.line), [query, style]);
  const shown = glyphs.slice(0, MAX_ICONS);
  return (
    <div className="studio-assets__scroll">
      <div className="studio-assets__bar">
        <Segmented aria-label="Icon style" size="sm" level="secondary" value={style} onValueChange={(next) => setStyle(next as "line" | "solid")} options={[{ id: "line", label: "Line" }, { id: "solid", label: "Solid" }]} />
        <Text as="p" textStyle="Caption/Regular" tone="base" className="studio-assets__note" role="status">
          {swapping ? "Click an icon to swap the selected Icon" : glyphs.length > shown.length ? `${shown.length} of ${glyphs.length}: search to narrow` : plural(glyphs.length, "icon")}
        </Text>
      </div>
      {shown.length ? (
        <ul className="studio-assets__grid" aria-label="Icons">
          {shown.map((glyph) => {
            const name = (glyph[style] ?? glyph.line ?? glyph.solid) as IconName;
            const title = iconTitle(glyph);
            return (
              <li key={glyph.id}>
                <IconButton className="studio-assets__tile" appearance="flat" level="primary" size="md" icon={name} aria-label={`${title} icon`} data-icon={name} {...pressProps(iconInsertable(name, title))} />
              </li>
            );
          })}
        </ul>
      ) : <Empty what="icons" />}
    </div>
  );
}

function PhotoGrid({ query }: { query: string }) {
  const photos = useMemo(() => searchLibraryPhotos(query), [query]);
  return (
    <div className="studio-assets__scroll">
      {photos.length ? (
        <ul className="studio-assets__photos" aria-label="Photos">
          {photos.map((entry) => (
            <li key={entry.key}>
              <button type="button" className="studio-assets__photo" aria-label={entry.photo.alt} title={`${entry.photo.alt} — drag onto the canvas, or click to add at the selection`} data-photo={entry.key} {...pressProps(photoInsertable(entry))}>
                <img src={entry.photo.src} alt="" loading="lazy" draggable={false} />
              </button>
            </li>
          ))}
        </ul>
      ) : <Empty what="photos" />}
    </div>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <div className="studio-assets__empty">
      <EmptyState title={`No ${what} match`} compactTitle icon="icon-search-line" headingLevel={3}>
        Try another word, in English or Vietnamese, or clear the search.
      </EmptyState>
    </div>
  );
}
