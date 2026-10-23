import { tip } from "../shell/ShortcutTip";
import { BadgeCounter } from "../../../components/Badge";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { ColorPicker } from "../../../components/ColorPicker";
import { Icon } from "../../../components/Icon";
import { Dialog, ModalForm } from "../../../components/Dialog";
import { FormFieldset } from "../../../components/Form";
import { InputField } from "../../../components/Input";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { Search } from "../../../components/Search";
import { Segmented } from "../../../components/Segmented";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { MODE_COLLECTIONS, collectionFileOf, type CollectionLayer, type VariableInput, type VariableOp } from "../../../../tools/studio/variables.mjs";
import { applyVariableEdit, readVariables, redoEdit, subscribeStudioWrites, undoEdit, variablesForFigma, variablesHandedOver, type VariableCollection, type VariablesFigma } from "../api";
import { requestSave, saveDrafts } from "../sourceDrafts";
import { canEdit, useStudio } from "../store";
import { aliasOf, aliasOptions, colorParts, colorWith, groupOf, groupsOf, indexOf, newName, resolved, rowsOf, shortName, TYPE_LABEL, type Entry, type Row, type Variable, type VariableType } from "./variablesModel";
import { closeVariables, subscribeVariables, variablesOpen } from "./variablesState";
import { EditVariable } from "./EditVariable";
import "./variables.css";
import { useActiveProject } from "../project/activeProject";
import { openProjectSetup } from "../project/ProjectSetup";
import { PROJECT_COLLECTION, withProjectMode } from "../project/projectVariables";

/*
 * Figma's Local variables window on the Zen tokens (research docs/research/studio-figma-native-parity-2026-10-17.md §10;
 * the user approved Studio as a second source of token values, 2026-10-17). A floating window over the canvas: the
 * collection, its groups, a table with a column per mode, search and type; a value cell edits the value (colour picker
 * and opacity, number, text) or aliases another variable; a row renames, duplicates or deletes; Create variable. Each
 * change is one draft edit of the collection's JSON (tools/studio/variables-host.mjs): ⌘Z undoes it, the canvas shows it
 * at once (tokens.css built from the drafts), ⌘S saves and builds the tokens; Copy for Figma hands the saved changes to
 * the Zen plugin.
 */

const ROW_HEIGHT = 32;
const OVERSCAN = 8;
// A colour variable reads as a palette (user, 2026-10-17), a number as #, a string as T, a boolean as a toggle.
const TYPE_ICON: Readonly<Record<VariableType, IconName>> = { COLOR: "icon-palette-line", FLOAT: "icon-hash-01-line", STRING: "icon-type-01-line", BOOLEAN: "icon-toggle-right-line" };
/** Global Colors' high-contrast mode is written from the Zen values (the high-contrast algorithm), never by hand. */
const DERIVED_MODE = "Zen-High-Contrast";
/** Inside a project, Base Colors (Project) is its theme: Project settings changes it. */
const PROJECT_LOCKED = "This project's colors change in Project settings";

type Editing = { name: string; mode: string; rect: DOMRect; tab: "custom" | "variables" };
type Focus = { row: number; col: number };

const valueText = (value: unknown) => (typeof value === "number" ? String(Math.round(value * 1000) / 1000) : typeof value === "boolean" ? String(value) : String(value ?? ""));
/** An alias chip's text: the variable's last two name parts ("Neutral/12", "Accent/Base"), its full name on hover. */
const chipName = (name: string) => name.split("/").slice(-2).join("/");
const labelOf = (name: string, mode: string, value: VariableInput) => `${name} (${mode}) → ${typeof value === "object" ? value.alias : valueText(value)}`;

function Swatch({ color }: { color: unknown }) {
  const parts = colorParts(color);
  return <span className="studio-vars__swatch" aria-hidden="true" data-alpha={parts && parts.alpha < 100 ? "" : undefined} style={{ ["--studio-vars-swatch" as string]: typeof color === "string" ? color : "transparent" }} />;
}

/** One value as a cell shows it: a colour's swatch, hex and opacity, a number, text; an alias as a chip. */
function ValueView({ index, variable, mode }: { index: Map<string, Entry>; variable: Variable; mode: string }) {
  const raw = variable.valuesByMode[mode];
  const target = aliasOf(raw);
  if (target) {
    const shown = resolved(index, target, mode);
    return (
      <span className="studio-vars__alias" title={target}>
        {variable.type === "COLOR" ? <Swatch color={shown} /> : null}
        <span className="studio-vars__alias-name">{chipName(target)}</span>
      </span>
    );
  }
  if (variable.type === "COLOR") {
    const parts = colorParts(raw);
    return (
      <span className="studio-vars__value">
        <Swatch color={raw} />
        <span className="studio-vars__hex">{parts ? parts.hex.slice(1) : valueText(raw)}</span>
        {parts && parts.alpha < 100 ? <span className="studio-vars__alpha">{`${parts.alpha}%`}</span> : null}
      </span>
    );
  }
  return <span className="studio-vars__value studio-vars__text">{valueText(raw)}</span>;
}

/** The list of variables a value can alias (Figma's Libraries tab of the colour picker), searchable. */
function AliasList({ index, type, self, mode, onPick }: { index: Map<string, Entry>; type: VariableType; self: string; mode: string; onPick: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => aliasOptions(index, type, self), [index, type, self]);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = options.filter((entry) => words.every((word) => entry.variable.name.toLowerCase().includes(word)));
  const LIMIT = 150;
  return (
    <div className="studio-vars__aliases">
      <Search size="sm" placeholder="Search variables" aria-label="Search variables" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} autoFocus />
      <ul className="studio-vars__alias-list" aria-label="Variables">
        {shown.slice(0, LIMIT).map((entry) => (
          <li key={entry.variable.name}>
            <button type="button" className={`studio-vars__alias-option ${typographyStyles["Body/Small/Regular"]}`} onClick={() => onPick(entry.variable.name)}>
              {type === "COLOR" ? <Swatch color={resolved(index, entry.variable.name, mode)} /> : <Icon name={TYPE_ICON[type]} size={16} decorative />}
              <span className="studio-vars__alias-option-name">{entry.variable.name}</span>
              <span className="studio-vars__alias-option-meta">{entry.collection.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={`studio-vars__hint ${typographyStyles["Body/Small/Regular"]}`}>{shown.length > LIMIT ? `${LIMIT} of ${shown.length}: type to narrow` : shown.length ? `${shown.length} ${shown.length === 1 ? "variable" : "variables"}` : "No variable of this type matches"}</p>
    </div>
  );
}

/** The value editor under a cell (Figma's colour picker / value field with its Variables tab). */
function ValueEditor({ editing, index, variable, onCommit, onClose }: { editing: Editing; index: Map<string, Entry>; variable: Variable; onCommit: (value: VariableInput) => void; onClose: () => void }) {
  const raw = variable.valuesByMode[editing.mode];
  const alias = aliasOf(raw);
  const shown = alias ? resolved(index, alias, editing.mode) : raw;
  const [tab, setTab] = useState<"custom" | "variables">(editing.tab);
  const parts = colorParts(shown) ?? { hex: "#000000", alpha: 100 };
  const [hex, setHex] = useState(parts.hex);
  const [alpha, setAlpha] = useState(String(parts.alpha));
  const [text, setText] = useState(valueText(shown));
  const panel = useRef<HTMLDivElement>(null);
  // Closing writes what the custom tab holds when it changed (Figma applies a picked colour without a confirm step).
  const pending = useRef<() => void>(() => undefined);
  pending.current = () => {
    if (tab !== "custom") return;
    if (variable.type === "COLOR") {
      const next = colorWith(hex, Number(alpha) || 0);
      if (alias || next !== String(raw).toUpperCase()) onCommit(next);
    } else if (variable.type === "FLOAT") {
      const number = Number(text.trim());
      if (text.trim() !== "" && Number.isFinite(number) && (alias || number !== raw)) onCommit(number);
    } else if (variable.type === "STRING") {
      if (alias || text !== raw) onCommit(text);
    }
  };
  // Closes after the frame: a field that commits on Enter or blur (the picker's Hex, Opacity) has updated the value by then.
  const close = useCallback(() => { window.requestAnimationFrame(() => { pending.current(); onClose(); }); }, [onClose]);
  useEffect(() => {
    const onDown = (event: PointerEvent) => { if (panel.current && !panel.current.contains(event.target as Node)) close(); };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [close]);
  const top = Math.min(editing.rect.bottom + 4, window.innerHeight - 420);
  const left = Math.min(Math.max(8, editing.rect.left), window.innerWidth - 300);
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); close(); }
  };
  return (
    <div ref={panel} className="studio-vars__editor" role="dialog" aria-label={`${variable.name}, ${editing.mode}`} style={{ top, left }} onKeyDown={onKeyDown}>
      <div className="studio-vars__editor-head">
        <Segmented
          size="sm"
          aria-label="Value from"
          value={tab}
          onValueChange={(next) => setTab(next === "variables" ? "variables" : "custom")}
          options={[{ id: "custom", label: variable.type === "COLOR" ? "Custom" : "Value" }, { id: "variables", label: "Variables" }]}
        />
        {alias ? <IconButton icon="icon-link-broken-02-line" appearance="flat" size="xs" aria-label="Detach alias" tooltip={`Detach from ${chipName(alias)}: the value it shows now`} onClick={() => { if (shown !== null) onCommit(shown); onClose(); }} /> : null}
      </div>
      {tab === "variables" ? (
        <AliasList index={index} type={variable.type} self={variable.name} mode={editing.mode} onPick={(name) => { onCommit({ alias: name }); onClose(); }} />
      ) : variable.type === "COLOR" ? (
        <div className="studio-vars__custom">
          <ColorPicker aria-label={`${variable.name} color`} value={hex} onValueChange={setHex} />
          <InputField size="sm" aria-label="Opacity" inputMode="numeric" value={alpha} onValueChange={setAlpha} trailing={<span className={`studio-vars__unit ${typographyStyles["Body/Small/Medium"]}`}>%</span>} leading={<span className={`studio-vars__unit ${typographyStyles["Body/Small/Medium"]}`}>Opacity</span>} />
        </div>
      ) : variable.type === "BOOLEAN" ? (
        <div className="studio-vars__custom">
          <Segmented size="sm" aria-label="Value" value={String(shown === true)} onValueChange={(next) => { onCommit(next === "true"); onClose(); }} options={[{ id: "true", label: "True" }, { id: "false", label: "False" }]} />
        </div>
      ) : (
        <div className="studio-vars__custom">
          <InputField size="sm" aria-label="Value" inputMode={variable.type === "FLOAT" ? "decimal" : undefined} value={text} onValueChange={setText} autoFocus />
        </div>
      )}
    </div>
  );
}

export function VariablesWindow() {
  const open = useSyncExternalStore(subscribeVariables, variablesOpen, variablesOpen);
  if (!open) return null;
  return <VariablesPanel />;
}

function VariablesPanel() {
  const editable = useStudio((state) => canEdit(state));
  const [collections, setCollections] = useState<VariableCollection[] | null>(null);
  const [figma, setFigma] = useState<VariablesFigma>({ changes: 0, since: null });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [group, setGroup] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<VariableType | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [renaming, setRenaming] = useState<{ name: string; text: string } | null>(null);
  const [details, setDetails] = useState<{ name: string; rect: DOMRect } | null>(null);
  const [renamingMode, setRenamingMode] = useState<{ mode: string; text: string } | null>(null);
  // Create collection (user 2026-10-23): its name and the docs' group it belongs to, asked in one form.
  const [creating, setCreating] = useState<{ name: string; layer: CollectionLayer; purpose: string } | null>(null);
  // Rename collection (Figma names it in place): the name being typed where the collection button was. Enter commits,
  // and the field's blur as it goes would commit again: one commit per naming.
  const [naming, setNaming] = useState<string | null>(null);
  const namingOpen = useRef(false);
  // Delete collection with variables in use: what reads them, until the person says yes.
  const [deleting, setDeleting] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>({ row: 0, col: 1 });
  const [scroll, setScroll] = useState({ top: 0, height: 480 });
  const [copied, setCopied] = useState(false);
  const windowRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  const load = useCallback(async () => {
    const reply = await readVariables();
    if (!reply.ok) { setError(reply.error); return; }
    setError(null);
    setCollections(reply.collections);
    setFigma(reply.figma);
  }, []);

  useEffect(() => {
    opener.current = document.activeElement;
    void load();
    windowRef.current?.focus();
    // Undo / redo of a variable edit, and a Save's token build (tokens.css and the catalog come back over HMR): read again.
    let timer = 0;
    const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { void load(); }, 120); };
    const stopWrites = subscribeStudioWrites((write) => { if (write.file.startsWith("tokens/source/")) soon(); });
    const onUpdate = (payload: { updates?: Array<{ path?: string }> }) => { if (payload.updates?.some((update) => /tokens\.css|catalog\.generated/.test(update.path ?? ""))) soon(); };
    import.meta.hot?.on("vite:afterUpdate", onUpdate);
    return () => {
      stopWrites();
      import.meta.hot?.off?.("vite:afterUpdate", onUpdate);
      window.clearTimeout(timer);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [load]);

  // A Studio project open: Base Colors (Project) shows only its mode (project/projectVariables.ts), read from its theme;
  // its rows stay fixed there (a rename or a new variable would change the Zen source the project never edits).
  const project = useActiveProject();
  const shownCollections = useMemo(() => withProjectMode(collections, project) as VariableCollection[] | null, [collections, project]);
  const index = useMemo(() => indexOf(shownCollections ?? []), [shownCollections]);
  const collection = shownCollections?.find((each) => each.file === file) ?? shownCollections?.find((each) => each.name === "Mode Colors (Semantic)") ?? shownCollections?.[0] ?? null;
  const projectMode = project && collection?.name === PROJECT_COLLECTION ? collection.modes[0] : null;
  const editableRows = editable && !projectMode;
  const groups = useMemo(() => (collection ? groupsOf(collection) : []), [collection]);
  const rows: Row[] = useMemo(() => (collection ? rowsOf(collection, { group, query, type }) : []), [collection, group, query, type]);
  const modes = collection?.modes ?? [];
  const columns = modes.length + 1;
  const drafted = (collections ?? []).filter((each) => each.draft);

  const say = (message: string) => { setNotice(message); window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 6000); };

  const run = useCallback(async (ops: VariableOp[], label: string) => {
    if (!collection) return false;
    if (projectMode) { say(PROJECT_LOCKED); return false; }
    if (!editable) { say("View only"); return false; }
    const response = await applyVariableEdit({ file: collection.file, ops }, label);
    if (!response.ok) { say(response.error); return false; }
    // The answer holds the collection's new text: show it now (the read after it confirms).
    try {
      const json = JSON.parse(response.after) as Record<string, { modes: string[]; tokens: Variable[] }>;
      const body = json[collection.name];
      if (body) setCollections((current) => current?.map((each) => (each.file === collection.file ? { ...each, modes: body.modes, tokens: body.tokens, draft: true } : each)) ?? current);
    } catch { /* the read below brings it */ }
    void load();
    return true;
  }, [collection, editable, load, projectMode]);

  // Rows on screen (virtual list): those in the scrolled window and a few around it.
  const first = Math.max(0, Math.floor(scroll.top / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scroll.top + scroll.height) / ROW_HEIGHT) + OVERSCAN);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => setScroll({ top: grid.scrollTop, height: grid.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [collection?.file]);

  // Arrow keys move between cells (APG grid); the focused cell is the one Tab stop.
  const focusCell = useCallback((next: Focus) => {
    const row = Math.max(0, Math.min(rows.length - 1, next.row));
    const col = Math.max(0, Math.min(columns - 1, next.col));
    setFocus({ row, col });
    const grid = gridRef.current;
    if (grid) {
      const top = row * ROW_HEIGHT;
      if (top < grid.scrollTop + ROW_HEIGHT) grid.scrollTop = Math.max(0, top - ROW_HEIGHT);
      else if (top + ROW_HEIGHT > grid.scrollTop + grid.clientHeight) grid.scrollTop = top + 2 * ROW_HEIGHT - grid.clientHeight;
    }
    window.requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-cell="${row}:${row < rows.length && rows[row].kind === "group" ? 0 : col}"]`)?.focus());
  }, [rows, columns]);

  const startEdit = (row: number, col: number, tab: "custom" | "variables" = "custom") => {
    const entry = rows[row];
    if (!entry || entry.kind !== "variable" || col < 1) return;
    const mode = modes[col - 1];
    if (collection?.name === "Global Colors" && mode === DERIVED_MODE) { say(`${DERIVED_MODE} follows the Zen values (the high-contrast algorithm): change the Zen value`); return; }
    // The project's column is its theme's output: Project settings changes it (Primary, Neutral, status colours).
    if (project && mode === projectMode) { openProjectSetup({ kind: "edit", id: project.id }); return; }
    if (!editable) { say("View only"); return; }
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${row}:${col}"]`);
    if (!cell) return;
    setEditing({ name: entry.variable.name, mode, rect: cell.getBoundingClientRect(), tab: aliasOf(entry.variable.valuesByMode[mode]) ? "variables" : tab });
  };

  const commitRename = async () => {
    if (!renaming) return;
    const leaf = renaming.text.trim().replace(/^\/+|\/+$/g, "");
    const from = renaming.name;
    setRenaming(null);
    if (!leaf || leaf === shortName(from)) return;
    const to = `${groupOf(from) ? `${groupOf(from)}/` : ""}${leaf}`;
    await run([{ op: "rename", name: from, to }], `Rename ${from} → ${to}`);
  };

  const create = async (kind: VariableType) => {
    if (!collection) return;
    const focused = rows[focus.row];
    const where = group || (focused?.kind === "variable" ? groupOf(focused.variable.name) : focused?.kind === "group" ? focused.path : "");
    const name = newName(where, kind, new Set(index.keys()));
    const after = focused?.kind === "variable" && groupOf(focused.variable.name) === where ? focused.variable.name : undefined;
    if (await run([{ op: "create", name, type: kind, ...(after ? { after } : {}) }], `Create variable ${name}`)) setRenaming({ name, text: shortName(name) });
  };

  // Figma's Create collection, one mode (user 2026-10-23: "chỉ một mode (:root)"): a draft of its new file, ⌘Z removes it.
  const createCollection = async () => {
    if (!creating) return;
    const name = creating.name.trim().replace(/\s+/g, " ");
    if (!name) { say("A collection needs a name"); return; }
    if (!editable) { say("View only"); return; }
    const target = collectionFileOf(name);
    const response = await applyVariableEdit({ file: target, ops: [{ op: "createCollection", name, layer: creating.layer, purpose: creating.purpose }] }, `Create collection ${name}`);
    if (!response.ok) { say(response.error); return; }
    setCreating(null);
    setFile(target);
    setGroup("");
    setFocus({ row: 0, col: 1 });
    void load();
  };
  // Rename and Delete collection (Figma's collection menu): a collection made here; the 11 Figma exports keep theirs.
  const renameCollection = async () => {
    if (!namingOpen.current || naming === null) return;
    namingOpen.current = false;
    const to = naming.trim().replace(/\s+/g, " ");
    setNaming(null);
    if (!collection || !to || to === collection.name) return;
    await run([{ op: "renameCollection", to }], `Rename collection ${collection.name} → ${to}`);
  };
  const deleteCollection = async (force = false) => {
    if (!collection) return;
    if (!editable) { say("View only"); return; }
    const response = await applyVariableEdit({ file: collection.file, ops: [{ op: "deleteCollection", ...(force ? { force: true } : {}) }] }, `Delete collection ${collection.name}`);
    if (!response.ok && response.code === "confirm") { setDeleting(response.error); return; }
    setDeleting(null);
    if (!response.ok) { say(response.error); return; }
    setFile(null);
    setGroup("");
    void load();
  };
  const collectionMenu: MenuEntry[] = [
    { id: "rename-collection", label: "Rename collection", disabled: !editable || !collection?.created, onSelect: () => { namingOpen.current = true; setNaming(collection?.name ?? ""); } },
    { type: "separator", id: "collection-separator" },
    { id: "delete-collection", label: "Delete collection", danger: true, disabled: !editable || !collection?.created, onSelect: () => { void deleteCollection(); } },
  ];

  const copyForFigma = async () => {
    const reply = await variablesForFigma();
    if (!reply.ok) { say(reply.error); return; }
    if (!reply.pkg.changes.length) { say("Figma has every saved value already"); return; }
    const text = JSON.stringify(reply.pkg);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      say(`Copied ${reply.pkg.changes.length} ${reply.pkg.changes.length === 1 ? "change" : "changes"}: ⌘V in the Zen plugin's Import from Studio`);
    } catch {
      // No clipboard (permission): the file instead.
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      link.download = "zen-variables.figma.json";
      link.click();
      URL.revokeObjectURL(link.href);
      setCopied(true);
      say("Downloaded zen-variables.figma.json: open it in the Zen plugin's Import from Studio");
    }
  };

  const markInFigma = async () => {
    const next = await variablesHandedOver();
    if (next) { setFigma(next); setCopied(false); say("Figma has the saved values"); }
  };

  // The header drags the window (Figma's floating window).
  const onHeadDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("button, input, [role=combobox], [role=menu]")) return;
    const start = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    const head = event.currentTarget;
    head.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => setOffset({ x: moveEvent.clientX - start.x, y: moveEvent.clientY - start.y });
    const up = () => { head.removeEventListener("pointermove", move); head.removeEventListener("pointerup", up); };
    head.addEventListener("pointermove", move);
    head.addEventListener("pointerup", up);
  };

  const onWindowKey = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && !editing && !renaming && naming === null && !creating && deleting === null) { event.preventDefault(); event.stopPropagation(); closeVariables(); return; }
    // The Studio leaves keys inside a dialog to it: this window takes ⌘Z, ⇧⌘Z and ⌘S itself, as Figma's does (a text field
    // keeps its own undo).
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (!mod || event.altKey || (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]"))) return;
    if (key === "z") { event.preventDefault(); if (editable) void (event.shiftKey ? redoEdit() : undoEdit()); }
    else if (key === "s" && !event.shiftKey) { event.preventDefault(); if (editable) void requestSave(); }
  };

  const onGridKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (editing || renaming || event.target instanceof HTMLInputElement) return;
    const row = rows[focus.row];
    const moves: Record<string, Focus> = {
      ArrowDown: { row: focus.row + 1, col: focus.col }, ArrowUp: { row: focus.row - 1, col: focus.col },
      ArrowRight: { row: focus.row, col: focus.col + 1 }, ArrowLeft: { row: focus.row, col: focus.col - 1 },
      Home: { row: focus.row, col: 0 }, End: { row: focus.row, col: columns - 1 },
      PageDown: { row: focus.row + 10, col: focus.col }, PageUp: { row: focus.row - 10, col: focus.col },
    };
    const move = moves[event.key];
    if (move) { event.preventDefault(); focusCell(move); return; }
    if (row?.kind !== "variable") return;
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      if (focus.col === 0) { if (projectMode) say(PROJECT_LOCKED); else setRenaming({ name: row.variable.name, text: shortName(row.variable.name) }); }
      else startEdit(focus.row, focus.col);
    } else if ((event.key === "Delete" || event.key === "Backspace") && focus.col === 0) {
      event.preventDefault();
      void run([{ op: "delete", name: row.variable.name }], `Delete variable ${row.variable.name}`);
    }
  };

  const editedVariable = editing ? index.get(editing.name)?.variable ?? null : null;
  const total = collection?.tokens.length ?? 0;
  const openDetails = (variable: Variable) => {
    const row = gridRef.current?.querySelector<HTMLElement>(`[data-variable="${CSS.escape(variable.name)}"]`);
    if (row) setDetails({ name: variable.name, rect: row.getBoundingClientRect() });
  };
  const detailed = details ? index.get(details.name)?.variable ?? null : null;
  // Modes (v2, user 2026-10-23): a ZenProvider axis's collection adds, renames, duplicates and deletes its modes; Global
  // Colors' high contrast, a project's theme column and the single-mode collections keep theirs.
  const modesEditable = Boolean(collection && editableRows && MODE_COLLECTIONS.has(collection.name));
  // Figma names a new column in place: once the collection shows it, its header opens for typing.
  const modesBeforeAdd = useRef<Set<string> | null>(null);
  useEffect(() => {
    const before = modesBeforeAdd.current;
    const added = before ? modes.find((mode) => !before.has(mode)) : undefined;
    if (!added) return;
    modesBeforeAdd.current = null;
    setRenamingMode({ mode: added, text: added });
  }, [modes]);
  const addMode = async (from?: string) => {
    modesBeforeAdd.current = new Set(modes);
    const done = await run([{ op: "addMode", ...(from ? { from } : {}) }], from ? `Duplicate mode ${from}` : "Add mode");
    if (!done) modesBeforeAdd.current = null;
  };
  const commitModeRename = async () => {
    if (!renamingMode) return;
    const { mode, text } = renamingMode;
    setRenamingMode(null);
    const to = text.trim();
    if (!to || to === mode) return;
    await run([{ op: "renameMode", mode, to }], `Rename mode ${mode} → ${to}`);
  };
  const modeMenu = (mode: string): MenuEntry[] => [
    { id: "rename-mode", label: "Rename mode", onSelect: () => setRenamingMode({ mode, text: mode }) },
    { id: "duplicate-mode", label: "Duplicate mode", onSelect: () => { void addMode(mode); } },
    { type: "separator", id: "mode-separator" },
    { id: "delete-mode", label: "Delete mode", danger: true, disabled: modes.length < 2, onSelect: () => { void run([{ op: "deleteMode", mode }], `Delete mode ${mode}`); } },
  ];
  const rowMenu = (variable: Variable): MenuEntry[] => [
    { id: "edit", label: "Edit variable", onSelect: () => openDetails(variable) },
    { id: "rename", label: "Rename", shortcut: "Enter", disabled: !editableRows, onSelect: () => setRenaming({ name: variable.name, text: shortName(variable.name) }) },
    { id: "duplicate", label: "Duplicate", disabled: !editableRows, onSelect: () => { void run([{ op: "duplicate", name: variable.name }], `Duplicate ${variable.name}`); } },
    { type: "separator", id: "row-separator" },
    { id: "delete", label: "Delete variable", danger: true, disabled: !editableRows, onSelect: () => { void run([{ op: "delete", name: variable.name }], `Delete variable ${variable.name}`); } },
  ];

  let body: ReactNode;
  if (error && !collections) body = <p className={`studio-vars__empty ${typographyStyles["Body/Small/Regular"]}`}>{error}</p>;
  else if (!collection) body = <p className={`studio-vars__empty ${typographyStyles["Body/Small/Regular"]}`}>Reading the variables…</p>;
  else {
    body = (
      <div className="studio-vars__body">
        <nav className="studio-vars__groups" aria-label="Groups">
          <button type="button" className={`studio-vars__group ${typographyStyles["Body/Small/Medium"]}`} aria-current={group === "" ? "true" : undefined} onClick={() => { setGroup(""); focusCell({ row: 0, col: 1 }); }}>
            <span>All variables</span><BadgeCounter className="studio-vars__count" value={total} size="xs" theme="neutral" background="subtle" />
          </button>
          {groups.map((node) => (
            <button
              key={node.path}
              type="button"
              className={`studio-vars__group ${typographyStyles["Body/Small/Regular"]}`}
              style={{ ["--studio-vars-depth" as string]: node.depth }}
              aria-current={group === node.path ? "true" : undefined}
              title={node.path}
              onClick={() => { setGroup(node.path); if (gridRef.current) gridRef.current.scrollTop = 0; setFocus({ row: 0, col: 1 }); }}
            >
              <span className="studio-vars__group-label">{node.label}</span><BadgeCounter className="studio-vars__count" value={node.count} size="xs" theme="neutral" background="subtle" />
            </button>
          ))}
        </nav>
        <div
          ref={gridRef}
          className="studio-vars__grid"
          role="grid"
          aria-label={`${collection.name} variables`}
          aria-rowcount={rows.length + 1}
          aria-colcount={columns + (modesEditable ? 1 : 0)}
          style={{ ["--studio-vars-modes" as string]: modes.length }}
          onScroll={(event) => setScroll({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
          onKeyDown={onGridKey}
        >
          <div className="studio-vars__row studio-vars__row--head" role="row" aria-rowindex={1}>
            <div className={`studio-vars__cell studio-vars__cell--name ${typographyStyles["Body/Small/Medium"]}`} role="columnheader">Name</div>
            {modes.map((mode) => (
              <div key={mode} className={`studio-vars__cell studio-vars__mode ${typographyStyles["Body/Small/Medium"]}`} role="columnheader" title={collection.name === "Global Colors" && mode === DERIVED_MODE ? "Follows the Zen values (the high-contrast algorithm)" : mode === projectMode ? "This project's theme — change it in Project settings" : undefined}
                onDoubleClick={() => { if (modesEditable) setRenamingMode({ mode, text: mode }); }}>
                {renamingMode?.mode === mode ? (
                  <InputField
                    size="sm"
                    aria-label={`Rename mode ${mode}`}
                    value={renamingMode.text}
                    autoFocus
                    onFocus={(event) => event.currentTarget.select()}
                    onValueChange={(text) => setRenamingMode({ mode, text })}
                    onBlur={() => { void commitModeRename(); }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); void commitModeRename(); }
                      else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setRenamingMode(null); }
                    }}
                  />
                ) : <span className="studio-vars__mode-name">{mode}</span>}
                {modesEditable && renamingMode?.mode !== mode ? (
                  <Menu aria-label={`${mode} mode actions`} align="end" items={modeMenu(mode)} trigger={<IconButton icon="icon-dots-horizontal-line" appearance="flat" size="xs" aria-label={`${mode} mode actions`} tooltip="Mode actions" className="studio-vars__mode-menu" />} />
                ) : null}
              </div>
            ))}
            {modesEditable ? (
              // Not a column of its own: the + after the last mode (Figma's), a cell of the header row.
              <div className="studio-vars__cell studio-vars__add-mode" role="gridcell">
                <IconButton icon="icon-plus-line" appearance="flat" size="xs" aria-label="Add mode" tooltip="Add mode" onClick={() => { void addMode(); }} />
              </div>
            ) : null}
          </div>
          <div className="studio-vars__rows" style={{ height: rows.length * ROW_HEIGHT }}>
            {rows.slice(first, last).map((row, offsetIndex) => {
              const at = first + offsetIndex;
              const style = { transform: `translateY(${at * ROW_HEIGHT}px)` };
              if (row.kind === "group") {
                const label = (group && row.path.startsWith(group) ? row.path.slice(group.length).replace(/^\//, "") : row.path) || shortName(group) || collection.name;
                return (
                  <div key={`g:${row.path}:${at}`} className="studio-vars__row studio-vars__row--group" role="row" aria-rowindex={at + 2} style={style}>
                    <div className={`studio-vars__cell studio-vars__cell--group ${typographyStyles["Body/Small/Bold"]}`} role="gridcell" aria-colspan={columns} tabIndex={focus.row === at ? 0 : -1} data-cell={`${at}:0`} onFocus={() => setFocus({ row: at, col: 0 })}>
                      {label.split("/").join(" / ")}
                    </div>
                  </div>
                );
              }
              const variable = row.variable;
              const isRenaming = renaming?.name === variable.name;
              return (
                <div key={variable.name} className="studio-vars__row" role="row" aria-rowindex={at + 2} style={style} data-variable={variable.name}>
                  <div
                    className={`studio-vars__cell studio-vars__cell--name ${typographyStyles["Body/Small/Regular"]}`}
                    role="rowheader"
                    tabIndex={focus.row === at && focus.col === 0 ? 0 : -1}
                    data-cell={`${at}:0`}
                    onFocus={() => setFocus({ row: at, col: 0 })}
                    onDoubleClick={() => editableRows && setRenaming({ name: variable.name, text: shortName(variable.name) })}
                    title={variable.name}
                  >
                    <Icon name={TYPE_ICON[variable.type]} size={16} decorative />
                    {isRenaming ? (
                      <InputField
                        size="sm"
                        aria-label={`Rename ${variable.name}`}
                        value={renaming.text}
                        autoFocus
                        onFocus={(event) => event.currentTarget.select()}
                        onValueChange={(text) => setRenaming({ name: variable.name, text })}
                        onBlur={() => { void commitRename(); }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") { event.preventDefault(); void commitRename().then(() => focusCell({ row: at, col: 0 })); }
                          else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setRenaming(null); focusCell({ row: at, col: 0 }); }
                        }}
                      />
                    ) : <span className="studio-vars__name">{shortName(variable.name)}</span>}
                    {!isRenaming ? (
                      <span className="studio-vars__row-menu">
                        <Menu aria-label={`${shortName(variable.name)} actions`} align="end" items={rowMenu(variable)} trigger={<IconButton icon="icon-dots-horizontal-line" appearance="flat" size="xs" aria-label={`${shortName(variable.name)} actions`} tabIndex={-1} />} />
                      </span>
                    ) : null}
                  </div>
                  {modes.map((mode, modeIndex) => {
                    const col = modeIndex + 1;
                    const derived = (collection.name === "Global Colors" && mode === DERIVED_MODE) || mode === projectMode;
                    return (
                      <div
                        key={mode}
                        className={`studio-vars__cell studio-vars__cell--value ${typographyStyles["Body/Small/Regular"]}`}
                        role="gridcell"
                        aria-readonly={derived || !editable || undefined}
                        aria-label={`${variable.name}, ${mode}`}
                        tabIndex={focus.row === at && focus.col === col ? 0 : -1}
                        data-cell={`${at}:${col}`}
                        data-derived={derived || undefined}
                        onFocus={() => setFocus({ row: at, col })}
                        onClick={() => startEdit(at, col)}
                      >
                        <ValueView index={index} variable={variable} mode={mode} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {!rows.length ? <p className={`studio-vars__empty ${typographyStyles["Body/Small/Regular"]}`}>{query || type ? "No variable matches" : "This group is empty"}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <>
    <section
      ref={windowRef}
      className="studio-vars"
      role="dialog"
      aria-label="Local variables"
      aria-modal="false"
      tabIndex={-1}
      data-e2e="variables"
      style={{ translate: `${offset.x}px ${offset.y}px` }}
      onKeyDown={onWindowKey}
    >
      <header className="studio-vars__head" onPointerDown={onHeadDown}>
        {naming !== null ? (
          <InputField
            size="sm"
            aria-label="Rename collection"
            value={naming}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onValueChange={setNaming}
            onBlur={() => { void renameCollection(); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); void renameCollection(); }
              else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); namingOpen.current = false; setNaming(null); }
            }}
          />
        ) : (
          <Menu
            aria-label="Collections"
            items={[...(shownCollections ?? []).map((each) => ({ id: each.file, label: each.name, caption: `${each.tokens.length} · ${each.modes.length} ${each.modes.length === 1 ? "mode" : "modes"}`, onSelect: () => { setFile(each.file); setGroup(""); setFocus({ row: 0, col: 1 }); if (gridRef.current) gridRef.current.scrollTop = 0; } })), { type: "separator" as const, id: "collections-separator" }, { id: "create-collection", label: "Create collection", icon: "icon-plus-line" as IconName, disabled: !editable, onSelect: () => setCreating({ name: "", layer: "semantic", purpose: "" }) }]}
            trigger={<Button level="primary" appearance="flat" size="sm" endIcon="icon-chevron-down-line">{collection?.name ?? "Variables"}</Button>}
          />
        )}
        {naming === null ? (
          <Menu aria-label="Collection actions" items={collectionMenu} trigger={<IconButton icon="icon-dots-horizontal-line" appearance="flat" size="sm" aria-label="Collection actions" tooltip={collection?.created ? "Collection actions" : "Rename and delete: collections made in Zen Studio"} />} />
        ) : null}
        <span className="studio-vars__head-fill" />
        <Search size="sm" placeholder="Search" aria-label="Search variables" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
        {/* A filter is a Chip (harness button/filter-is-chip): the type it keeps, Selected while it filters. */}
        <Chip
          variant="advanced"
          size="sm"
          dropdown
          selected={type !== null}
          popoverLabel="Type"
          popoverItems={(["COLOR", "FLOAT", "STRING", "BOOLEAN"] as const).map((each) => ({ id: each, label: TYPE_LABEL[each], leading: TYPE_ICON[each], selected: type === each }))}
          onPopoverSelect={(item) => setType(type === item.id ? null : (item.id as VariableType))}
          onClearSelection={() => setType(null)}
        >
          {type ? TYPE_LABEL[type] : "Type"}
        </Chip>
        <IconButton icon="icon-x-line" appearance="flat" size="sm" aria-label="Close variables" tooltip={tip("Close", "Esc")} onClick={closeVariables} />
      </header>
      {body}
      <footer className={`studio-vars__foot ${typographyStyles["Body/Small/Regular"]}`}>
        <Menu
          aria-label="Create variable"
          items={(["COLOR", "FLOAT", "STRING", "BOOLEAN"] as const).map((each) => ({ id: each, label: TYPE_LABEL[each], icon: TYPE_ICON[each], onSelect: () => { void create(each); } }))}
          trigger={<Button level="primary" appearance="flat" size="sm" startIcon="icon-plus-line" disabled={!editableRows || !collection}>Create variable</Button>}
        />
        <span className="studio-vars__status" role="status">{notice ?? (drafted.length ? `${drafted.map((each) => each.name).join(", ")}: not saved` : figma.changes ? `${figma.changes} saved ${figma.changes === 1 ? "change" : "changes"} not in Figma yet` : "")}</span>
        {drafted.length ? <Button level="primary" size="sm" disabled={!editable} onClick={() => { void saveDrafts(drafted.map((each) => each.file)).then(() => load()); }}>Save · build tokens</Button> : null}
        {!drafted.length && figma.changes ? (
          copied
            ? <Button level="tertiary" size="sm" startIcon="icon-check-line" onClick={() => { void markInFigma(); }}>It is in Figma</Button>
            : <Button level="primary" size="sm" startIcon="icon-copy-line" onClick={() => { void copyForFigma(); }}>Copy for Figma</Button>
        ) : null}
      </footer>
    </section>
      {/* Beside the window, not in it: its transform and backdrop filter would hold a fixed editor and clip it. */}
      {details && detailed ? (
        <EditVariable
          key={details.name}
          variable={detailed}
          rect={details.rect}
          disabled={!editableRows}
          onRename={(to) => { void run([{ op: "rename", name: details.name, to }], `Rename ${details.name} → ${to}`).then((done) => { if (done) setDetails((now) => (now ? { ...now, name: to } : now)); }); }}
          onMeta={(meta) => { void run([{ op: "meta", name: details.name, ...meta }], `Edit variable ${details.name}`); }}
          onClose={() => setDetails(null)}
        />
      ) : null}
      <ModalForm
        open={creating !== null}
        onOpenChange={(open) => { if (!open) setCreating(null); }}
        title="Create collection"
        description="One mode, on :root. The Design Tokens page lists it under its group."
        onSubmit={() => createCollection()}
        primaryAction={{ label: "Create" }}
        secondaryAction={{ label: "Cancel", onClick: () => setCreating(null) }}
      >
        <InputField label="Name" placeholder="Collection" autoComplete="off" data-autofocus="" required value={creating?.name ?? ""} onValueChange={(name) => setCreating((now) => (now ? { ...now, name } : now))} />
        <FormFieldset legend="Group">
          <Segmented
            aria-label="Group"
            options={[{ id: "primitive", label: "Primitive" }, { id: "semantic", label: "Semantic" }, { id: "component", label: "Component" }, { id: "layout", label: "Layout" }]}
            value={creating?.layer ?? "semantic"}
            onValueChange={(layer) => setCreating((now) => (now ? { ...now, layer: layer as CollectionLayer } : now))}
            fullWidth
          />
        </FormFieldset>
        <InputField label="Purpose" helpText="Optional: one line for the Design Tokens page" autoComplete="off" value={creating?.purpose ?? ""} onValueChange={(purpose) => setCreating((now) => (now ? { ...now, purpose } : now))} />
      </ModalForm>
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title={`Delete ${collection?.name ?? "collection"}?`}
        description={`${deleting ?? ""}. Code that reads them falls back to its own values.`}
        primaryAction={{ label: "Delete", level: "danger", onClick: () => { void deleteCollection(true); } }}
        secondaryAction={{ label: "Cancel", onClick: () => setDeleting(null) }}
      />
      {editing && editedVariable ? (
        <ValueEditor
          key={`${editing.name}:${editing.mode}`}
          editing={editing}
          index={index}
          variable={editedVariable}
          onCommit={(value) => { void run([{ op: "setValue", name: editing.name, mode: editing.mode, value }], labelOf(editing.name, editing.mode, value)); }}
          onClose={() => { const cell = editing; setEditing(null); window.requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-variable="${CSS.escape(cell.name)}"] [aria-label="${CSS.escape(`${cell.name}, ${cell.mode}`)}"]`)?.focus()); }}
        />
      ) : null}
    </>
  );
}
