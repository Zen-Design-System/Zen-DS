import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Icon } from "../../../../components/Icon";
import { Search } from "../../../../components/Search";
import { Text } from "../../../../components/Text";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { canvasApi } from "../../canvas/viewport";
import { insertAsset } from "../../edit/assets/assets";
import { useStudio } from "../../store";
import type { PaletteItem } from "../../slots/palette";
import { GROUP_ICON, searchCatalog } from "./catalog";
import { ItemPreview } from "./ItemPreview";
import { describeTarget, insertTarget } from "./target";
import "./library.css";

/*
 * Quick insert (Studio builder GĐ3 M2, spec docs/research/studio-builder-library-spec-2026-10-06.md §3c), Figma's ⇧I:
 * a search over the library (synonyms in English and Vietnamese, one typo) floating over the canvas; ↑/↓ pick, Enter
 * adds the item where the line under the field says (into the selected layout, after the selected layer, or into the
 * frame in view), Esc or a click outside closes. The focused item is drawn for real beside the list (ItemPreview).
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

/** At most this many results are listed (the search ranks them; a longer query narrows them). */
const MAX_RESULTS = 40;

function QuickInsertPanel() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Where the pointer last was over the list: the browser sends a pointer move when the list changes under a still
   *  pointer, which must not steal the focus from the keyboard (only a real move does). */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const selection = useStudio((state) => state.selection);
  const results = useMemo(() => searchCatalog(query).slice(0, MAX_RESULTS), [query]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the target follows the selection (and is read again on open)
  const target = useMemo(() => insertTarget(), [selection]);
  const item: PaletteItem | undefined = results[Math.min(active, results.length - 1)]?.item;

  const close = () => {
    closeQuickInsert();
    requestAnimationFrame(() => canvasApi.getViewportElement()?.focus({ preventScroll: true }));
  };
  const choose = (next: PaletteItem | undefined) => {
    if (!next) return;
    close();
    insertAsset(next);
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
      choose(item);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const blocked = typeof target === "string";
  const optionId = (id: string) => `studio-qi-option-${id}`;
  return (
    <div ref={panelRef} className="studio-qi" role="dialog" aria-label="Quick insert" data-e2e="quick-insert">
      <div className="studio-qi__search">
        <Search
          variant="popover"
          autoFocus
          placeholder="Search components"
          aria-label="Search components"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="studio-qi-list"
          aria-autocomplete="list"
          aria-activedescendant={item ? optionId(item.id) : undefined}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          onKeyDown={onKeyDown}
        />
      </div>
      <Text as="p" textStyle="Caption/Regular" tone={blocked ? "negative" : "base"} className="studio-qi__target" data-e2e="quick-insert-target">
        {blocked ? target : describeTarget(target)}
      </Text>
      <div className="studio-qi__body">
        {results.length ? (
          <ul ref={listRef} id="studio-qi-list" className="studio-qi__list" role="listbox" aria-label="Components">
            {results.map((entry, index) => (
              <li
                key={entry.id}
                id={optionId(entry.id)}
                role="option"
                aria-selected={entry.item === item}
                className="studio-qi__option"
                onPointerMove={(event) => {
                  const last = pointer.current;
                  pointer.current = { x: event.clientX, y: event.clientY };
                  if (!last || (last.x === event.clientX && last.y === event.clientY)) return;
                  if (index !== active) setActive(index);
                }}
                onClick={() => choose(entry.item)}
              >
                <Icon name={GROUP_ICON[entry.item.group]} size="sm" decorative />
                <span className={`studio-qi__name ${typographyStyles["Body/Small/Medium"]}`}>{entry.label}</span>
                <span className={`studio-qi__caption ${typographyStyles["Caption/Regular"]}`}>{entry.caption ?? entry.group}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" tone="base" textStyle="Body/Small/Regular" className="studio-qi__empty">Nothing matches “{query.trim()}”. Try another word, in English or Vietnamese.</Text>
        )}
        {item ? <ItemPreview item={item} /> : null}
      </div>
    </div>
  );
}
