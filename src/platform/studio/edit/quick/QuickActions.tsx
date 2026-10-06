import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Search } from "../../../../components/Search";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { canvasApi } from "../../canvas/viewport";
import { ChromePortalContext, ChromeScope } from "../../shell/ChromeScope";
import { studioStore } from "../../store";
import { commands, searchCommands, type Command } from "./commands";
import { isQuickActionsOpen, setQuickActionsOpen, subscribeQuickActions } from "./state";
import "./quick.css";

/*
 * Quick actions (⌘/ or Ctrl+/, Figma's): search every Studio action by name and run it. ↑ / ↓ move, Enter runs, Esc or a
 * click outside closes; an action that cannot run now says why and stays.
 */

function useQuickKey() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.isComposing || (event.key !== "/" && event.code !== "Slash")) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!isQuickActionsOpen() && target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [aria-modal='true']")) return;
      if (studioStore.getState().presenting) return;
      event.preventDefault();
      event.stopPropagation();
      setQuickActionsOpen(!isQuickActionsOpen());
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}

function Palette({ onClose }: { onClose: (run?: Command) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const all = useMemo(() => commands(), []);
  const found = useMemo(() => searchCommands(all, query), [all, query]);
  const listRef = useRef<HTMLUListElement>(null);
  const index = Math.min(active, Math.max(0, found.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (found.length) setActive((index + (event.key === "ArrowDown" ? 1 : -1) + found.length) % found.length);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const command = found[index];
      if (command && !command.disabled) onClose(command);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  const optionId = (at: number) => `studio-quick-option-${at}`;
  return (
    <div className="studio-quick" role="dialog" aria-modal="true" aria-label="Quick actions" onKeyDown={onKeyDown}>
      <div className="studio-quick__search">
        <Search
          size="sm"
          autoFocus
          placeholder="Search actions"
          aria-label="Search actions"
          aria-controls="studio-quick-list"
          aria-activedescendant={found.length ? optionId(index) : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onClear={() => { setQuery(""); setActive(0); }}
        />
      </div>
      <ul ref={listRef} id="studio-quick-list" className="studio-quick__list" role="listbox" aria-label="Actions">
        {found.map((command, at) => (
          <li
            key={command.id}
            id={optionId(at)}
            role="option"
            aria-selected={at === index}
            aria-disabled={command.disabled ? true : undefined}
            data-index={at}
            className="studio-quick__option"
            onPointerMove={() => { if (at !== index) setActive(at); }}
            onClick={() => { if (!command.disabled) onClose(command); }}
          >
            <span className="studio-quick__text">
              <span className={`studio-quick__label ${typographyStyles["Body/Small/Medium"]}`}>{command.label}</span>
              <span className={`studio-quick__caption ${typographyStyles["Caption/Regular"]}`}>{command.disabled ?? command.group}</span>
            </span>
            {command.shortcut ? <kbd className={`studio-kbd ${typographyStyles["Body/Code/Regular"]}`}>{command.shortcut}</kbd> : null}
          </li>
        ))}
        {!found.length ? <li className={`studio-quick__none ${typographyStyles["Body/Small/Regular"]}`} role="presentation">No action matches “{query}”</li> : null}
      </ul>
    </div>
  );
}

/** The Quick actions palette, over the canvas (chrome modes). */
export function QuickActions() {
  useQuickKey();
  const shown = useSyncExternalStore(subscribeQuickActions, isQuickActionsOpen, () => false);
  const portal = useContext(ChromePortalContext);
  if (!shown) return null;
  const close = (run?: Command) => {
    setQuickActionsOpen(false);
    canvasApi.getViewportElement()?.focus({ preventScroll: true });
    // After the palette is gone, so keys it sends reach the canvas.
    if (run) window.setTimeout(run.run, 0);
  };
  return createPortal(
    <ChromeScope className="studio-quick-layer" onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <Palette onClose={close} />
    </ChromeScope>,
    portal ?? document.body,
  );
}
