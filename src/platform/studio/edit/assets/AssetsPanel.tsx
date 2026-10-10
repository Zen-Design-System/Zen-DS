import { useMemo, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "../../../../components/Button";
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
import { announceEditStatus } from "../../api";
import { altOf, removeUpload, UPLOAD_ACCEPT, uploadPhotos, useUploads } from "../../builder/assets/uploads";
import { iconInsertable, insertAsset, insertItem, paletteInsertable, photoInsertable, pressAsset, uploadInsertable, type Insertable } from "./assets";
import { AssetThumb } from "./AssetThumb";
import "./assets.css";

/*
 * The left panel's Assets tab, in Figma's way (user, 2026-10-09: "cơ chế giống Figma"): one search over every library at
 * the top; with no search, the libraries — Components (Zen DS), Icons, Photos — each a row with its count. A library
 * opens in place (← back to the libraries) with its own search; components sit in groups that fold, as a grid of real
 * thumbnails (AssetThumb) or a list (the Grid · List switch). A search from the top lists the best matches of each
 * library, with "See all" into it. A click adds the asset into the selected layout (else right after the selected
 * layer, else into the frame in view); an icon on a selected Icon swaps its glyph; dragging one onto the canvas shows
 * where it lands. Keyboard: Tab to a row or tile, Enter adds it. Search: synonyms in English and Vietnamese
 * (builder/library).
 */

type Library = "components" | "icons" | "photos";
type View = "grid" | "list";
const LIBRARIES: Array<{ id: Library; label: string; icon: IconName; source: string }> = [
  { id: "components", label: "Components", icon: "icon-cube-line", source: "Zen DS" },
  { id: "icons", label: "Icons", icon: "icon-star-01-line", source: "Zen icons" },
  { id: "photos", label: "Photos", icon: "icon-image-line", source: "Your uploads and the library" },
];
/** At most this many icon tiles at once (a search narrows the 900-odd glyphs). */
const MAX_ICONS = 240;
/** What a search from the top shows of each library before "See all". */
const PEEK = { components: 6, icons: 18, photos: 4 } as const;
const VIEW_KEY = "zen-studio-assets-view";

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}
function storeView(view: View) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // A private window or blocked storage: the switch still works for this session.
  }
}

/** Press: a click inserts (the press handles it, it can become a drag); Enter / Space arrive as a click of detail 0. */
const pressProps = (item: Insertable) => ({
  onPointerDown: (event: React.PointerEvent) => pressAsset(event.nativeEvent, item),
  onClick: (event: React.MouseEvent) => { if (event.detail === 0) insertItem(item); },
});

export function AssetsPanel() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [query, setQuery] = useState("");
  const [view, setViewState] = useState<View>(readView);
  const [iconStyle, setIconStyle] = useState<"line" | "solid">("line");
  const setView = (next: View) => { setViewState(next); storeView(next); };
  const open = LIBRARIES.find((entry) => entry.id === library);
  const label = open ? `Search ${open.label.toLowerCase()}` : "Search all assets";
  const clear = () => setQuery("");
  return (
    <div className="studio-assets">
      {open ? (
        <div className="studio-assets__head">
          {/* Back shows the libraries again: the library's search goes with it ("See all" carries a search the other way). */}
          <IconButton icon="icon-arrow-left-line" aria-label="All libraries" appearance="flat" level="primary" size="xs" onClick={() => { setLibrary(null); setQuery(""); }} />
          <span className={`studio-assets__title ${typographyStyles["Body/Small/Bold"]}`}>{open.label}</span>
          {open.id === "components" ? (
            <Segmented
              aria-label="View"
              size="sm"
              level="secondary"
              value={view}
              onValueChange={(next) => setView(next as View)}
              options={[{ id: "grid", label: "", leading: "icon-grid-01-line", "aria-label": "Grid" }, { id: "list", label: "", leading: "icon-list-line", "aria-label": "List" }]}
            />
          ) : open.id === "icons" ? (
            <Segmented aria-label="Icon style" size="sm" level="secondary" value={iconStyle} onValueChange={(next) => setIconStyle(next as "line" | "solid")} options={[{ id: "line", label: "Line" }, { id: "solid", label: "Solid" }]} />
          ) : null}
        </div>
      ) : null}
      <div className="studio-assets__search" role="search">
        <Search size="sm" placeholder={label} aria-label={label} value={query} onChange={(event) => setQuery(event.target.value)} onClear={clear} />
      </div>
      {library === "components" ? <ComponentLibrary query={query} view={view} onClear={clear} />
        : library === "icons" ? <IconGrid query={query} style={iconStyle} onClear={clear} />
          : library === "photos" ? <PhotoGrid query={query} onClear={clear} />
            : query.trim() ? <AllResults query={query} view={view} onOpen={setLibrary} onClear={clear} />
              : <Libraries onOpen={setLibrary} />}
    </div>
  );
}

/* ── the libraries (no search) ───────────────────────────────────────────────────────────────────── */

function Libraries({ onOpen }: { onOpen: (library: Library) => void }) {
  const uploads = useUploads();
  const counts: Record<Library, number> = useMemo(() => ({
    components: PALETTE.length,
    icons: searchIconGlyphs("").length,
    photos: searchLibraryPhotos("").length,
  }), []);
  return (
    <div className="studio-assets__scroll">
      <p className={`studio-assets__kicker ${typographyStyles["Caption/Medium"]}`}>Libraries</p>
      <ul className="studio-assets__list" aria-label="Libraries">
        {LIBRARIES.map((entry) => {
          const count = counts[entry.id] + (entry.id === "photos" ? uploads.length : 0);
          return (
            <li key={entry.id}>
              <button type="button" className="studio-assets__library" aria-label={entry.label} title={`${entry.source} · ${count}`} onClick={() => onOpen(entry.id)}>
                <span className="studio-assets__library-icon"><Icon name={entry.icon} size="sm" decorative /></span>
                <span className="studio-assets__library-text">
                  <span className={`studio-assets__name ${typographyStyles["Body/Small/Medium"]}`}>{entry.label}</span>
                  <span className={`studio-assets__source ${typographyStyles["Caption/Regular"]}`}>{entry.source}</span>
                </span>
                <span className={`studio-assets__count ${typographyStyles["Caption/Regular"]}`}>{count}</span>
                <Icon name="icon-chevron-right-line" size="xs" decorative />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── a search over every library ─────────────────────────────────────────────────────────────── */

function AllResults({ query, view, onOpen, onClear }: { query: string; view: View; onOpen: (library: Library) => void; onClear: () => void }) {
  const uploads = useUploads();
  const components = useMemo(() => searchCatalog(query).map((entry) => entry.item), [query]);
  const glyphs = useMemo(() => searchIconGlyphs(query).filter((glyph) => glyph.line ?? glyph.solid), [query]);
  const photos = useMemo(() => searchLibraryPhotos(query), [query]);
  const words = query.trim().toLowerCase();
  const mine = uploads.filter((upload) => `${upload.name} ${altOf(upload.name)}`.toLowerCase().includes(words));
  if (!components.length && !glyphs.length && !photos.length && !mine.length) return <div className="studio-assets__scroll"><Empty what="assets" onClear={onClear} /></div>;
  return (
    <div className="studio-assets__scroll">
      {components.length ? (
        <ResultSection title="Components" count={components.length} onAll={() => onOpen("components")}>
          <ComponentItems items={components.slice(0, PEEK.components)} view={view} showGroup />
        </ResultSection>
      ) : null}
      {glyphs.length ? (
        <ResultSection title="Icons" count={glyphs.length} onAll={() => onOpen("icons")}>
          <ul className="studio-assets__grid" aria-label="Icons">
            {glyphs.slice(0, PEEK.icons).map((glyph) => {
              const name = (glyph.line ?? glyph.solid) as IconName;
              const title = iconTitle(glyph);
              return <li key={glyph.id}><IconButton className="studio-assets__tile" appearance="flat" level="primary" size="md" icon={name} aria-label={`${title} icon`} data-icon={name} {...pressProps(iconInsertable(name, title))} /></li>;
            })}
          </ul>
        </ResultSection>
      ) : null}
      {photos.length || mine.length ? (
        <ResultSection title="Photos" count={photos.length + mine.length} onAll={() => onOpen("photos")}>
          <ul className="studio-assets__photos" aria-label="Photos">
            {[...mine.map((upload) => ({ key: upload.id, label: altOf(upload.name), src: upload.url, item: uploadInsertable(upload), data: { "data-upload": upload.id } })),
              ...photos.map((entry) => ({ key: entry.key, label: entry.photo.alt, src: entry.photo.src, item: photoInsertable(entry), data: { "data-photo": entry.key } }))]
              .slice(0, PEEK.photos)
              .map((photo) => (
                <li key={photo.key}>
                  <button type="button" className="studio-assets__photo" aria-label={photo.label} title={`${photo.label} — drag onto the canvas, or click to add at the selection`} {...photo.data} {...pressProps(photo.item)}>
                    <img src={photo.src} alt="" loading="lazy" draggable={false} />
                  </button>
                </li>
              ))}
          </ul>
        </ResultSection>
      ) : null}
    </div>
  );
}

function ResultSection({ title, count, onAll, children }: { title: string; count: number; onAll: () => void; children: ReactNode }) {
  return (
    <section className="studio-assets__section" aria-label={title}>
      <div className="studio-assets__bar">
        <p className={`studio-assets__label ${typographyStyles["Caption/Medium"]}`}>{title} · {count}</p>
        {/* zen-allow-compact-button: a link-like action on a 24px section label in a dense tool panel (Figma's "See all") */}
        <Button appearance="flat" level="primary" size="xs" onClick={onAll}>See all</Button>
      </div>
      {children}
    </section>
  );
}

/* ── Components ───────────────────────────────────────────────────────────────────────────────── */

function ComponentLibrary({ query, view, onClear }: { query: string; view: View; onClear: () => void }) {
  // Groups fold as Figma's pages do; a search lists its results best first.
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
  const groups = useMemo((): Array<{ group: string; items: PaletteItem[] }> => {
    if (query.trim()) {
      const items = searchCatalog(query).map((entry) => entry.item);
      return items.length ? [{ group: "Results", items }] : [];
    }
    return PALETTE_GROUPS.map((group) => ({ group, items: PALETTE.filter((item) => item.group === group) as PaletteItem[] })).filter((entry) => entry.items.length);
  }, [query]);
  const toggle = (group: string) => setFolded((current) => {
    const next = new Set(current);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    return next;
  });
  return (
    <div className="studio-assets__scroll">
      {groups.length ? groups.map(({ group, items }) => {
        const open = group === "Results" || !folded.has(group);
        return (
          <section key={group} className="studio-assets__section" aria-label={group}>
            {group === "Results" ? <p className={`studio-assets__kicker ${typographyStyles["Caption/Medium"]}`}>{plural(items.length, "result")}</p> : (
              <button type="button" className="studio-assets__fold" aria-expanded={open} onClick={() => toggle(group)}>
                <Icon name={open ? "icon-chevron-down-line" : "icon-chevron-right-line"} size="xs" decorative />
                <span className={`studio-assets__fold-name ${typographyStyles["Caption/Medium"]}`}>{group}</span>
                <span className={`studio-assets__count ${typographyStyles["Caption/Regular"]}`}>{items.length}</span>
              </button>
            )}
            {open ? <ComponentItems items={items} view={view} showGroup={group === "Results"} /> : null}
          </section>
        );
      }) : <Empty what="components" onClear={onClear} />}
    </div>
  );
}

/** Components as Figma's asset grid (real thumbnails, the name under each) or as a list (icon, name, caption). */
function ComponentItems({ items, view, showGroup }: { items: PaletteItem[]; view: View; showGroup?: boolean }) {
  const title = (item: PaletteItem) => `${item.label}${item.caption ? ` · ${item.caption}` : ""} — drag onto the canvas, or click to add at the selection`;
  const press = (item: PaletteItem) => ({
    onPointerDown: (event: React.PointerEvent) => pressAsset(event.nativeEvent, paletteInsertable(item)),
    onClick: (event: React.MouseEvent) => { if (event.detail === 0) insertAsset(item); },
  });
  if (view === "grid") {
    return (
      <ul className="studio-assets__cards">
        {items.map((item) => (
          // The thumbnail draws the component for real (it may hold buttons of its own): it sits beside the card's
          // button, inert, and the button's hit area covers the whole card.
          <li key={item.id} className="studio-assets__card">
            <AssetThumb item={item} />
            <button type="button" className="studio-assets__card-button" data-asset={item.id} title={title(item)} {...press(item)}>
              <span className={`studio-assets__name ${typographyStyles["Caption/Regular"]}`}>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="studio-assets__list">
      {items.map((item) => (
        <li key={item.id}>
          <button type="button" className="studio-assets__row" data-asset={item.id} title={title(item)} {...press(item)}>
            <Icon name={GROUP_ICON[item.group]} size="sm" decorative />
            <span className={`studio-assets__name ${typographyStyles["Body/Small/Medium"]}`}>{item.label}</span>
            {item.caption || showGroup ? <span className={`studio-assets__caption ${typographyStyles["Caption/Regular"]}`}>{item.caption ?? item.group}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────────────────────────────── */

function IconGrid({ query, style, onClear }: { query: string; style: "line" | "solid"; onClear: () => void }) {
  const swapping = useStudio((state) => state.selection?.kind === "node" && !state.selection.part && state.selection.name === "Icon");
  // Every glyph shows: one drawn only in the other style shows that drawing (the count matches the Libraries row).
  const glyphs = useMemo(() => searchIconGlyphs(query).filter((glyph) => glyph[style] ?? glyph.line ?? glyph.solid), [query, style]);
  const shown = glyphs.slice(0, MAX_ICONS);
  return (
    <div className="studio-assets__scroll">
      <Text as="p" textStyle="Caption/Regular" tone="base" className="studio-assets__note" role="status">
        {swapping ? "Click an icon to swap the selected Icon" : glyphs.length > shown.length ? `${shown.length} of ${plural(glyphs.length, "icon")} · search to narrow` : plural(glyphs.length, "icon")}
      </Text>
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
      ) : <Empty what="icons" onClear={onClear} />}
    </div>
  );
}

/* ── Photos ────────────────────────────────────────────────────────────────────────────────────── */

function PhotoGrid({ query, onClear }: { query: string; onClear: () => void }) {
  const photos = useMemo(() => searchLibraryPhotos(query), [query]);
  const uploads = useUploads();
  const admin = useStudio((state) => state.role === "admin");
  const input = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  // Delete on a focused photo asks once, a second Delete removes it (a page naming it then shows "Missing photo").
  const [removing, setRemoving] = useState<string | null>(null);
  const words = query.trim().toLowerCase();
  const mine = words ? uploads.filter((upload) => `${upload.name} ${altOf(upload.name)}`.toLowerCase().includes(words)) : uploads;
  const add = (files: File[]) => {
    if (!files.length) return;
    void uploadPhotos(files).then(({ added, refused }) => {
      if (refused.length) announceEditStatus({ kind: "error", message: `Not uploaded: ${refused.join("; ")}`, at: Date.now() });
      else announceEditStatus({ kind: "saved", message: `Uploaded ${plural(added.length, "photo")}: click one to add it to a page you made, or drag it there`, at: Date.now() });
    });
  };
  const withFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");
  return (
    <div
      className="studio-assets__scroll"
      data-dropping={dropping ? "true" : undefined}
      onDragOver={(event) => { if (!withFiles(event) || !admin) return; event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDropping(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false); }}
      onDrop={(event) => { if (!withFiles(event) || !admin) return; event.preventDefault(); setDropping(false); add(Array.from(event.dataTransfer.files)); }}
    >
      <section className="studio-assets__section" aria-label="Your photos">
        <div className="studio-assets__bar">
          <p className={`studio-assets__label ${typographyStyles["Caption/Medium"]}`}>Your photos</p>
          {/* zen-allow-compact-button: the section label's own action in a dense tool panel, as Figma's library headers */}
          <Button appearance="flat" level="primary" size="xs" startIcon="icon-upload-01-line" disabled={!admin} onClick={() => input.current?.click()}>Upload</Button>
        </div>
        <input ref={input} type="file" accept={UPLOAD_ACCEPT} multiple hidden data-e2e="upload-photos" onChange={(event) => {
          // Copied first: clearing the input (so the same file can be picked again) empties its live FileList.
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          add(files);
        }} />
        {mine.length ? (
          <ul className="studio-assets__photos" aria-label="Your photos">
            {mine.map((upload) => (
              <li key={upload.id}>
                <button type="button" className="studio-assets__photo" aria-label={altOf(upload.name)} title={`${upload.name} — drag onto a page you made, or click to add at the selection (on a selected Image: replace its picture); Delete twice removes it`} data-upload={upload.id} aria-keyshortcuts={admin ? "Delete" : undefined} onBlur={() => setRemoving(null)} onKeyDown={(event) => {
                  if (!admin || (event.key !== "Delete" && event.key !== "Backspace") || event.repeat) return;
                  event.preventDefault();
                  if (removing !== upload.id) {
                    setRemoving(upload.id);
                    announceEditStatus({ kind: "warning", message: `Press Delete again to remove ${upload.name} (pages that show it then show "Missing photo"; a connected folder keeps it in its trash)`, at: Date.now() });
                    return;
                  }
                  setRemoving(null);
                  void removeUpload(upload.id).then(() => announceEditStatus({ kind: "saved", message: `Removed ${upload.name}`, at: Date.now() }));
                }} {...pressProps(uploadInsertable(upload))}>
                  <img src={upload.url} alt="" draggable={false} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" textStyle="Caption/Regular" tone="base" className="studio-assets__hint">
            {words ? "None of your photos match." : "Upload or drop PNG, JPEG, WebP, GIF or SVG files, up to 5 MB each. They stay in this browser and go with the page's exports."}
          </Text>
        )}
      </section>
      <section className="studio-assets__section" aria-label="Library">
        <p className={`studio-assets__kicker ${typographyStyles["Caption/Medium"]}`}>Library</p>
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
        ) : <Empty what="photos" onClear={onClear} />}
      </section>
    </div>
  );
}

function Empty({ what, onClear }: { what: string; onClear: () => void }) {
  return (
    <div className="studio-assets__empty">
      <EmptyState title={`No ${what} match`} compactTitle icon="icon-search-line" headingLevel={3} secondaryAction={{ label: "Clear search", onClick: onClear }}>
        Try another word, in English or Vietnamese.
      </EmptyState>
    </div>
  );
}
