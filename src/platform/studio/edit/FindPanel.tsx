import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button, IconButton } from "../../../components/Button";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parsePage } from "../../../../tools/studio/browser-engine.mjs";
import { announceEditStatus, applyEdit, studioApi } from "../api";
import { pageFile, usePage } from "../builder/store/pageStore";
import { canvasApi, getViewport } from "../canvas/viewport";
import { findBySrc, selectHit } from "../select/picker";
import { canEdit, studioStore, useStudio } from "../store";
import type { EditOp } from "../types";
import { countMatches, findTexts, replaceMatches, type FindHit } from "./findModel";
import "./find.css";

/*
 * Figma's Find and replace (⌘F, Studio parity F10) on a page you made: the words of its text layers (a Text, a Heading,
 * a TextRun, a component's own words), case ignored. Enter and ⇧Enter step through the results, selecting each layer
 * and bringing it into view; a result row does the same. Replace all writes every match with the new words in one edit
 * (one ⌘Z). Esc closes it.
 */

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
/** ⌘F: opens Find (or focuses it when open). */
export const openFind = () => { open = true; emit(); window.setTimeout(() => document.querySelector<HTMLInputElement>(".studio-find input[type='search']")?.select(), 0); };
export const closeFind = () => { if (open) { open = false; emit(); } };
const useFindOpen = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => open, () => false);

const say = (kind: "unchanged" | "error", message: string) => announceEditStatus({ kind, message, at: Date.now() });

/** Selects the layer of a result and brings it into view (Figma's Find steps). */
function reveal(file: string, hit: FindHit) {
  const world = canvasApi.getWorldElement();
  const found = world ? findBySrc(world, `${file}:${hit.loc}`)[0] : null;
  const host = found?.hosts[0];
  if (!found || !host) { say("unchanged", `${hit.name} is not on the canvas (a hidden layer or a variant)`); return; }
  selectHit(found, world);
  // Into view at the zoom it has (never closer than 100 %): Figma keeps the zoom when it can.
  canvasApi.zoomToRect(host.getBoundingClientRect(), { padding: 160, maxZoom: Math.max(1, getViewport().zoom) });
}

/** Replace all: every result's text children with the new words, one edit through `many` setProps. */
async function replaceAll(file: string, hits: readonly FindHit[], query: string, replacement: string): Promise<number> {
  const opsByLoc: Record<string, EditOp[]> = {};
  let replaced = 0;
  let first: { loc: string; name: string; hash: string } | null = null;
  for (const hit of hits) {
    const element = await studioApi.element(file, hit.loc).catch(() => null);
    if (!element) continue;
    const ops: EditOp[] = [];
    for (const child of element.children) {
      if (child.kind !== "text") continue;
      const matches = countMatches(child.value, query);
      if (!matches) continue;
      ops.push({ op: "setText", index: child.index, value: replaceMatches(child.value, query, replacement) });
      replaced += matches;
    }
    if (!ops.length) continue;
    opsByLoc[hit.loc] = ops;
    first ??= { loc: element.loc, name: element.name, hash: element.hash };
  }
  if (!first) return 0;
  const response = await applyEdit({ file, loc: first.loc, name: first.name, ops: [{ op: "many", action: "setProps", locs: Object.keys(opsByLoc), opsByLoc }], hash: first.hash }, `Replace "${query}" → "${replacement}"`);
  return response.ok ? replaced : -1;
}

export function FindPanel() {
  const shown = useFindOpen();
  const localPage = useStudio((state) => state.localPage);
  const editable = useStudio((state) => canEdit(state));
  const page = usePage(shown ? localPage : null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [at, setAt] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => {
    if (!page || !query.trim()) return [];
    const { board } = parsePage(page.text);
    return board ? findTexts(board, query) : [];
  }, [page, query]);
  useEffect(() => { setAt(-1); }, [query]);
  useEffect(() => { if (shown) inputRef.current?.select(); }, [shown]);
  // Another page: Find closes (its results were that page's).
  useEffect(() => { closeFind(); }, [localPage]);
  if (!shown) return null;
  if (!localPage) {
    return (
      <div className="studio-find" role="search" aria-label="Find">
        <p className={typographyStyles["Body/Small/Regular"]}>Find and replace works on pages you made.</p>
        <IconButton icon="icon-x-line" aria-label="Close find" appearance="flat" level="primary" size="xs" onClick={closeFind} />
      </div>
    );
  }
  const file = pageFile(localPage);
  const total = hits.reduce((sum, hit) => sum + hit.count, 0);
  const step = (by: number) => {
    if (!hits.length) return;
    const next = (at + by + hits.length) % hits.length;
    setAt(next);
    reveal(file, hits[next]);
  };
  const close = () => { closeFind(); canvasApi.getViewportElement()?.focus({ preventScroll: true }); };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.currentTarget.getAttribute("data-field") === "find") { event.preventDefault(); step(event.shiftKey ? -1 : 1); }
  };
  const runReplace = async () => {
    const done = await replaceAll(file, hits, query, replacement);
    if (done > 0) say("unchanged", `Replaced ${done} ${done === 1 ? "match" : "matches"}`);
    else if (done < 0) say("error", "Nothing was replaced");
  };
  return (
    <div className="studio-find" role="search" aria-label="Find and replace">
      <div className="studio-find__row">
        <input
          ref={inputRef}
          type="search"
          className={`studio-find__input ${typographyStyles["Body/Small/Regular"]}`}
          aria-label="Find"
          placeholder="Find"
          data-field="find"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <span className={`studio-find__count ${typographyStyles["Caption/Regular"]}`} aria-live="polite">{query.trim() ? `${hits.length ? at + 1 : 0} / ${total}` : ""}</span>
        <IconButton icon="icon-chevron-up-line" aria-label="Previous result" appearance="flat" level="primary" size="xs" disabled={!hits.length} onClick={() => step(-1)} />
        <IconButton icon="icon-chevron-down-line" aria-label="Next result" appearance="flat" level="primary" size="xs" disabled={!hits.length} onClick={() => step(1)} />
        <IconButton icon="icon-x-line" aria-label="Close find" appearance="flat" level="primary" size="xs" onClick={close} />
      </div>
      <div className="studio-find__row">
        <input
          type="text"
          className={`studio-find__input ${typographyStyles["Body/Small/Regular"]}`}
          aria-label="Replace with"
          placeholder="Replace"
          data-field="replace"
          value={replacement}
          disabled={!editable}
          onChange={(event) => setReplacement(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button level="tertiary" size="sm" disabled={!editable || !hits.length} onClick={() => { void runReplace(); }}>Replace all</Button>
      </div>
      {hits.length ? (
        <ul className="studio-find__results" aria-label="Results">
          {hits.map((hit, index) => (
            <li key={`${hit.loc}-${index}`}>
              <button type="button" className={`studio-find__result ${typographyStyles["Body/Small/Regular"]}`} aria-current={index === at || undefined} onClick={() => { setAt(index); reveal(file, hit); }}>
                <span className={`studio-find__name ${typographyStyles["Caption/Medium"]}`}>{hit.name}</span>
                <span className="studio-find__text">{hit.text}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim() ? <p className={`studio-find__empty ${typographyStyles["Body/Small/Regular"]}`}>No layer has these words</p> : null}
    </div>
  );
}

/** ⌘F (Ctrl+F) anywhere in the Studio opens Find, instead of the browser's find. */
export function useFindKey() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey || event.code !== "KeyF") return;
      if (!(event.metaKey || event.ctrlKey) || (event.metaKey && event.ctrlKey)) return;
      if (studioStore.getState().presenting) return;
      event.preventDefault();
      openFind();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
