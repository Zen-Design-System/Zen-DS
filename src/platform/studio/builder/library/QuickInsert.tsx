import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Icon } from "../../../../components/Icon";
import { Search } from "../../../../components/Search";
import { Text } from "../../../../components/Text";
import { typographyStyles } from "../../../../tokens/typography.generated";
import type { IconName } from "../../../../icons/generated/names";
import { canvasApi } from "../../canvas/viewport";
import { iconInsertable, insertAsset, insertItem, photoInsertable, selectedIcon } from "../../edit/assets/assets";
import { previewAttributes } from "../../shell/modes";
import { useStudio } from "../../store";
import type { PaletteItem } from "../../slots/palette";
import { GROUP_ICON, searchCatalog } from "./catalog";
import { iconTitle, searchIconGlyphs, searchLibraryPhotos } from "./icons";
import { ItemPreview } from "./ItemPreview";
import type { LibraryPhoto } from "./media";
import { describeTarget, insertTarget } from "./target";
import "./library.css";

/*
 * Quick insert (Studio builder GĐ3 M2, spec docs/research/studio-builder-library-spec-2026-10-06.md §3c), Figma's ⇧I:
 * a search over the library (synonyms in English and Vietnamese, one typo) floating over the canvas; ↑/↓ pick, Enter
 * adds the item where the line under the field says (into the selected layout, after the selected layer, or into the
 * frame in view; an icon on a selected Icon swaps its glyph), Esc or a click outside closes. Results come in groups:
 * Components, then (GĐ3 M3) Icons and Photos. The focused item is drawn for real beside the list (ItemPreview; an icon or
 * a photo as itself).
 */

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const openQuickInsert = () => { if (!open) { open = true; emit(); } };
export const closeQuickInsert = () => { if (open) { open = false; emit(); } };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** StudioApp mounts it once; it renders while open. */
export function QuickInsert() {
  const isOpen = useSyncExternalStore(subscribe, () => open, () => false);
  return isOpen ? <QuickInsertPanel /> : null;
}

/** At most this many results per group (the search ranks them; a longer query narrows them). */
const MAX = { component: 20, icon: 12, photo: 6 } as const;

type Entry =
  | { kind: "component"; id: string; label: string; caption: string; item: PaletteItem }
  | { kind: "icon"; id: string; label: string; caption: string; name: IconName }
  | { kind: "photo"; id: string; label: string; caption: string; photo: LibraryPhoto };
const GROUP_LABEL: Record<Entry["kind"], string> = { component: "Components", icon: "Icons", photo: "Photos" };

/** The results for `query`: components only for an empty one (the whole palette), else every kind that matches. */
function entriesFor(query: string): Entry[] {
  const components: Entry[] = searchCatalog(query).slice(0, query.trim() ? MAX.component : 40).map((entry) => ({ kind: "component", id: `c-${entry.id}`, label: entry.label, caption: entry.caption ?? entry.group, item: entry.item }));
  if (!query.trim()) return components;
  const icons: Entry[] = searchIconGlyphs(query).slice(0, MAX.icon).map((glyph) => ({ kind: "icon", id: `i-${glyph.id}`, label: iconTitle(glyph), caption: "Icon", name: (glyph.line ?? glyph.solid) as IconName }));
  const photos: Entry[] = searchLibraryPhotos(query).slice(0, MAX.photo).map((entry) => ({ kind: "photo", id: `p-${entry.key}`, label: entry.photo.alt, caption: "Photo", photo: entry }));
  return [...components, ...icons, ...photos];
}

function QuickInsertPanel() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Where the pointer last was over the list: the browser sends a pointer move when the list changes under a still
   *  pointer, which must not steal the focus from the keyboard (only a real move does). */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const selection = useStudio((state) => state.selection);
  const preview = useStudio((state) => state.preview);
  const results = useMemo(() => entriesFor(query), [query]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the target follows the selection (and is read again on open)
  const target = useMemo(() => insertTarget(), [selection]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the same: the selected Icon an icon would swap
  const swap = useMemo(() => selectedIcon(), [selection]);
  const entry: Entry | undefined = results[Math.min(active, results.length - 1)];

  const close = () => {
    closeQuickInsert();
    requestAnimationFrame(() => canvasApi.getViewportElement()?.focus({ preventScroll: true }));
  };
  const choose = (next: Entry | undefined) => {
    if (!next) return;
    close();
    if (next.kind === "component") insertAsset(next.item);
    else if (next.kind === "icon") insertItem(iconInsertable(next.name, next.label));
    else insertItem(photoInsertable(next.photo));
  };

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, results]);
  // A press outside the panel closes it (as Figma's Quick insert).
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (panelRef.current && event.target instanceof Node && !panelRef.current.contains(event.target)) closeQuickInsert();
    };
    window.addEventListener("pointerdown", onPointer, true);
    return () => window.removeEventListener("pointerdown", onPointer, true);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(entry);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const blocked = typeof target === "string";
  const swapping = entry?.kind === "icon" && swap;
  const optionId = (id: string) => `studio-qi-option-${id}`;
  const groups = (["component", "icon", "photo"] as const).map((kind) => ({ kind, entries: results.filter((row) => row.kind === kind) })).filter((group) => group.entries.length);
  return (
    <div ref={panelRef} className="studio-qi" role="dialog" aria-label="Quick insert" data-e2e="quick-insert">
      <div className="studio-qi__search">
        <Search
          variant="popover"
          autoFocus
          placeholder="Search components, icons and photos"
          aria-label="Search components"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="studio-qi-list"
          aria-autocomplete="list"
          aria-activedescendant={entry ? optionId(entry.id) : undefined}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          onKeyDown={onKeyDown}
        />
      </div>
      <Text as="p" textStyle="Caption/Regular" tone={blocked && !swapping ? "negative" : "base"} className="studio-qi__target" data-e2e="quick-insert-target">
        {swapping ? "Swap the selected Icon" : blocked ? target : describeTarget(target)}
      </Text>
      <div className="studio-qi__body">
        {results.length ? (
          <ul ref={listRef} id="studio-qi-list" className="studio-qi__list" role="listbox" aria-label="Library">
            {groups.map((group) => (
              <li key={group.kind} role="presentation" className="studio-qi__group">
                {groups.length > 1 ? <span id={`studio-qi-group-${group.kind}`} className={`studio-qi__kicker ${typographyStyles["Caption/Medium"]}`}>{GROUP_LABEL[group.kind]}</span> : null}
                <ul role="group" aria-labelledby={groups.length > 1 ? `studio-qi-group-${group.kind}` : undefined} aria-label={groups.length > 1 ? undefined : GROUP_LABEL[group.kind]} className="studio-qi__options">
                  {group.entries.map((row) => {
                    const index = results.indexOf(row);
                    return (
                      <li
                        key={row.id}
                        id={optionId(row.id)}
                        role="option"
                        aria-selected={row === entry}
                        data-kind={row.kind}
                        className="studio-qi__option"
                        onPointerMove={(event) => {
                          const last = pointer.current;
                          pointer.current = { x: event.clientX, y: event.clientY };
                          if (!last || (last.x === event.clientX && last.y === event.clientY)) return;
                          if (index !== active) setActive(index);
                        }}
                        onClick={() => choose(row)}
                      >
                        {row.kind === "component" ? <Icon name={GROUP_ICON[row.item.group]} size="sm" decorative />
                          : row.kind === "icon" ? <Icon name={row.name} size="sm" decorative />
                            : <img className="studio-qi__thumb" src={row.photo.photo.src} alt="" loading="lazy" />}
                        <span className={`studio-qi__name ${typographyStyles["Body/Small/Medium"]}`}>{row.label}</span>
                        <span className={`studio-qi__caption ${typographyStyles["Caption/Regular"]}`}>{row.caption}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" tone="base" textStyle="Body/Small/Regular" className="studio-qi__empty">Nothing matches “{query.trim()}”. Try another word, in English or Vietnamese.</Text>
        )}
        {entry?.kind === "component" ? <ItemPreview item={entry.item} />
          : entry?.kind === "icon" ? (
            <div className="studio-qi__preview" data-e2e="quick-insert-preview" data-ready="true" aria-hidden="true" {...previewAttributes(preview)}>
              <Icon name={entry.name} size="3xl" decorative className="studio-qi__glyph" />
            </div>
          ) : entry?.kind === "photo" ? (
            <div className="studio-qi__preview" data-e2e="quick-insert-preview" data-ready="true" aria-hidden="true">
              <img className="studio-qi__photo" src={entry.photo.photo.src} alt="" />
            </div>
          ) : null}
      </div>
    </div>
  );
}
