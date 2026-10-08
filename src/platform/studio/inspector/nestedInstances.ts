import { useCallback, useEffect, useRef, useState } from "react";
import { applyEdit, parseSrc, studioApi } from "../api";
import { remountFrameAfterUpdate } from "../board/remount";
import { canvasApi } from "../canvas/viewport";
import { elementFiber, findBySrc, hitOf, instanceOf, onSourceUpdate, rectOf, selectHit, srcOf, walkAnnotated, type Fiber, type FiberHit } from "../select/picker";
import { mapSrc, noteEditTarget, onStudioWrite, sameSelectedElement } from "../select/remap";
import type { EditOp, SourceAttr, SourceElement, StudioNodeRef } from "../types";
import type { FieldApi } from "./fieldApi";
import { componentGroupsOf } from "./componentGroups";
import { entryDefaultIcon, entryLabel, entryOptions, entryProp, type GroupCondition, type PropEntry } from "./propGroups";
import { dataEditable, nodeKind, propLabel, propSpecs, type Literal, type PropSpec, type PropValue } from "./propSchema";
import { rowOf } from "./detach";
import { inspectorStatus } from "./status";
import { displayValueOf, isTwinRow, planPropReset, planPropWrite, restorableBinding, restoreStep, savedWrite, toEditValue, type WritePlan } from "./writePlan";

/*
 * Figma's nested instance properties: the properties of the Zen components the selected element renders from its props
 * (the Avatar in a ListItem's leading, the IconButton in its trailing, the TableText a Table column's cell returns),
 * listed under the selection's own Properties and edited where they are written (their own file:line), so a nested
 * instance is usable without selecting it first. Since GĐ4 M3 every kind of property, as Figma exposes a nested
 * instance's: its Figma variants (Figma names and options), the booleans that show a layer, icon swaps and texts
 * (nestedRows); a component without Figma groups lists its choices, switches and icons. The group name selects the nested instance. Only
 * elements the canvas renders now are listed: a nested instance its owner hides (a boolean off) has nothing to show, as
 * in Figma.
 *
 * Ownership is read from the rendered tree, not from where the JSX is written (user, 2026-10-05: nested booleans "vẫn
 * không hoạt động"; 675 of them were missing): an element written in a const, a helper, a local component or another
 * file belongs to the owner prop whose value holds it (matched by its data-zen-src annotation), and elements the owner
 * renders from a function or data prop (Table columns) belong to that prop. Children are slot content (the Slots
 * section), never nested instances. A nested Zen component's own nested instances are not listed (select it, as in Figma).
 */

type NodeSelection = { kind: "node" } & StudioNodeRef;

export type Nested = {
  src: string;
  file: string;
  loc: string;
  name: string;
  /** The owner prop it is rendered from ("leading", "columns"). */
  prop: string;
  hit: FiberHit;
  /** Its rows (nestedRows), and the specs they edit. */
  rows: NestedRow[];
  specs: PropSpec[];
  /** How many elements this source line renders on the canvas (a .map row, a helper used by several owners). */
  count: number;
  /** Written outside the owner's own JSX (a const, a helper, a local component, another file): an edit changes it there. */
  elsewhere: boolean;
};

/** Booleans that change nothing a designer sees: an a11y flag (Figma has no such property). */
const HIDDEN_BOOLEANS = new Set(["decorative"]);

const REACT_ELEMENT = new Set([Symbol.for("react.element"), Symbol.for("react.transitional.element")]);
const isElement = (value: unknown): value is { props: Record<string, unknown> } =>
  typeof value === "object" && value !== null && REACT_ELEMENT.has((value as { $$typeof?: symbol }).$$typeof as symbol);

/**
 * data-zen-src of every element a prop value holds (elements, arrays, objects of data such as `trailing={[{ icon:
 * <Icon /> }]}`, and the elements inside those elements' own props), each mapped to the owner prop. Children map to
 * "children" so the slot content can be left out.
 */
function propSources(props: Record<string, unknown>): { sources: Map<string, string>; functionProps: string[] } {
  const sources = new Map<string, string>();
  const functionProps: string[] = [];
  const seen = new WeakSet<object>();
  const visit = (value: unknown, prop: string, depth: number) => {
    if (depth > 6 || value === null || typeof value !== "object") return;
    if (seen.has(value as object)) return;
    seen.add(value as object);
    if (isElement(value)) {
      const src = value.props["data-zen-src"];
      if (typeof src === "string" && !sources.has(src)) sources.set(src, prop);
      for (const inner of Object.values(value.props)) visit(inner, prop, depth + 1);
      return;
    }
    if (Array.isArray(value)) { for (const item of value) visit(item, prop, depth + 1); return; }
    if (Object.getPrototypeOf(value) === Object.prototype) for (const inner of Object.values(value)) visit(inner, prop, depth + 1);
  };
  const holdsFunction = (value: unknown, depth: number): boolean => {
    if (typeof value === "function") return true;
    if (depth > 3 || value === null || typeof value !== "object" || isElement(value)) return false;
    return (Array.isArray(value) ? value : Object.values(value)).some((item) => holdsFunction(item, depth + 1));
  };
  for (const [prop, value] of Object.entries(props)) {
    if (prop === "data-zen-src" || /^on[A-Z]/.test(prop) || prop === "ref" || prop === "key") continue;
    visit(value, prop, 0);
    // Functions that compute a value rather than render (getRowId, formatValue, isDisabled) never draw elements.
    if (prop !== "children" && !/^(get|is|has|can|format|compare|sort|filter|parse|to)[A-Z]/.test(prop) && holdsFunction(value, 0)) functionProps.push(prop);
  }
  // Children given as a function render slot content: what the owner draws without a matching annotation is theirs.
  if (typeof props.children === "function") functionProps.unshift("children");
  return { sources, functionProps };
}

/**
 * A nested instance's row: a field of one of its props (with Figma's name, option names and default icon), or a Figma
 * boolean that shows a layer by writing a starting value (Button Leading-Icon → startIcon). `when`: shown only while
 * these hold for the nested instance's rendered props (Leading-Icon-Src while Leading-Icon is on).
 */
export type NestedRow =
  | { kind: "field"; spec: PropSpec; label: string; optionLabels?: Readonly<Record<string, string>>; defaultIcon?: string; when?: readonly GroupCondition[] }
  | { kind: "toggle"; spec: PropSpec; label: string; on: string; when?: readonly GroupCondition[] };

/** The editors a nested row offers: choices, switches, icons, numbers and plain text (objects, lists and handlers are
 *  edited on the nested layer itself). Without Figma groups: choices, switches and icons only. */
const NESTED_EDITORS = new Set(["enum", "number-enum", "boolean", "icon", "icon-toggle", "string", "node", "number"]);
const DESIGN_EDITORS = new Set(["enum", "number-enum", "boolean", "icon", "icon-toggle"]);

/** The rows of a nested `name`: its Figma groups (variants, the text booleans, then swaps and texts), else its design props. */
export function nestedRows(name: string): NestedRow[] {
  const specs = propSpecs(name).filter((spec) => !HIDDEN_BOOLEANS.has(spec.name) && !isTwinRow(name, spec.name));
  const specOf = new Map(specs.map((spec) => [spec.name, spec]));
  const groups = componentGroupsOf(name);
  if (!groups) return specs.filter((spec) => DESIGN_EDITORS.has(spec.editor.kind)).map((spec) => ({ kind: "field", spec, label: propLabel(spec.name, name) }));
  const rows: NestedRow[] = [];
  const field = (entry: PropEntry) => {
    const spec = specOf.get(entryProp(entry));
    if (!spec || !NESTED_EDITORS.has(spec.editor.kind) || rows.some((row) => row.kind === "field" && row.spec.name === spec.name)) return;
    rows.push({ kind: "field", spec, label: entryLabel(entry) ?? propLabel(spec.name, name), optionLabels: entryOptions(entry), defaultIcon: entryDefaultIcon(entry), when: typeof entry === "string" ? undefined : entry.when });
  };
  groups.own.forEach(field);
  for (const toggle of groups.toggles) {
    const spec = specOf.get(toggle.prop);
    if (spec && toggle.on.kind === "text") rows.push({ kind: "toggle", spec, label: toggle.label, on: toggle.on.value, when: toggle.when });
  }
  groups.after.forEach(field);
  return rows;
}

/**
 * The Zen components the rendered `owner` draws from its props, with their boolean props. Fibers are walked below the
 * owner; an annotated element takes the prop whose value holds its annotation, and passes it to what it renders (a local
 * component's body). Layout primitives, host elements and local components are looked through; a Zen component ends
 * the walk. Elements the owner makes from a function or data prop (a Table column's cell) take that prop, or "content"
 * when several props hold render functions.
 */
function nestedOf(owner: FiberHit, ownerElement: SourceElement, world: Element | null): Nested[] {
  const fiber = owner.fiber;
  if (!fiber) return [];
  const { sources, functionProps } = propSources(owner.props);
  // What the owner draws from a function or data prop: that prop when there is one, else "content" (several), and
  // nothing when the owner takes no function at all (its own markup is not a nested instance).
  const fallbackProp = functionProps[0] === "children" ? "children" : functionProps.length === 1 ? functionProps[0] : functionProps.length ? "content" : null;
  const out: Nested[] = [];
  const listed = new Set<string>();
  const inOwner = (file: string, line: number) => file === ownerElement.file && line >= ownerElement.startLine && line <= ownerElement.endLine;
  const visit = (node: Fiber | null, prop: string | null, depth: number) => {
    for (let current = node; current; current = current.sibling) {
      // Portals render elsewhere (an open Dialog's body): their content is not drawn by this owner's box.
      if (current.tag === 4 || depth > 400) continue;
      const src = srcOf(current);
      if (!src || src === owner.src) { visit(current.child, prop, depth + 1); continue; }
      const via = sources.get(src) ?? prop ?? fallbackProp;
      if (via === "children" || via === null) continue;
      const hit = hitOf(current);
      if (!hit) { visit(current.child, via, depth + 1); continue; }
      if (nodeKind(hit.name) !== "zen") { visit(current.child, via, depth + 1); continue; }
      if (listed.has(hit.src)) continue;
      listed.add(hit.src);
      const at = parseSrc(hit.src);
      const rows = nestedRows(hit.name);
      if (!at || !rows.length) continue;
      out.push({ src: hit.src, file: at.file, loc: at.loc, name: hit.name, prop: via, hit, rows, specs: rows.map((row) => row.spec), count: 1, elsewhere: !inOwner(at.file, at.line) });
    }
  };
  try {
    visit(fiber.child, null, 0);
  } catch {
    // React internals changed mid-walk: list what was found.
  }
  // How many elements each source line renders on the whole canvas (one walk for all of them).
  if (out.length && world) {
    const counts = new Map(out.map((item) => [item.src, 0]));
    walkAnnotated(elementFiber(world)?.child ?? null, (_, src) => {
      if (counts.has(src)) counts.set(src, (counts.get(src) ?? 0) + 1);
      return true;
    });
    for (const item of out) item.count = Math.max(1, counts.get(item.src) ?? 1);
  }
  return out;
}

/** The rendered instance of the selection the panel shows. */
function ownerHit(selection: NodeSelection): FiberHit | null {
  const world = canvasApi.getWorldElement();
  if (!world) return null;
  const hits = findBySrc(world, selection.src);
  return hits[selection.instance] ?? hits[0] ?? null;
}

/** Selects a nested instance on the canvas (its group header). */
export function selectNested(nested: Nested) {
  const world = canvasApi.getWorldElement();
  const hit = (world ? findBySrc(world, nested.src).find((candidate) => candidate.fiber === nested.hit.fiber || candidate.hosts[0] === nested.hit.hosts[0]) : null) ?? nested.hit;
  if (!hit.hosts.some((host) => host.isConnected)) {
    inspectorStatus.set("neutral", `${nested.name} is not rendered right now`);
    return;
  }
  selectHit(hit, world);
  const rect = rectOf(hit.hosts);
  if (rect) canvasApi.ensureVisible(rect);
}

const display = (value: Literal) => (typeof value === "string" ? `"${value}"` : String(value));

/** The nested instances of the selection: read from the canvas and their sources, with a writer for their booleans. */
export function useNestedInstances(selection: NodeSelection, element: SourceElement | null | undefined, api: FieldApi) {
  const [nested, setNested] = useState<Nested[]>([]);
  const [sources, setSources] = useState<Record<string, SourceElement | null>>({});
  const [overrides, setOverrides] = useState<Record<string, Record<string, PropValue>>>({});
  const [version, setVersion] = useState(0);
  const inFlight = useRef(0);
  const elementRef = useRef(element);
  elementRef.current = element;

  // The canvas re-renders after a source update: read the nested instances again once it has.
  useEffect(() => onSourceUpdate(() => window.setTimeout(() => setVersion((value) => value + 1), 60)), []);

  // A write moves the lines below it: listed instances follow at once (the canvas keeps the old annotations until it
  // re-renders), so a click right after another edit still reaches its element.
  useEffect(() => onStudioWrite((write) => {
    const move = (item: Nested): Nested => {
      const src = mapSrc(item.src, write);
      if (!src || src === item.src) return item;
      const at = parseSrc(src);
      return at ? { ...item, src, loc: at.loc } : item;
    };
    setNested((current) => {
      const next = current.map(move);
      return next.some((item, index) => item !== current[index]) ? next : current;
    });
    setSources((current) => {
      let changed = false;
      const next: Record<string, SourceElement | null> = {};
      for (const [src, source] of Object.entries(current)) {
        const moved = mapSrc(src, write);
        next[moved ?? src] = source;
        if (moved && moved !== src) changed = true;
      }
      return changed ? next : current;
    });
  }), []);

  // Another selection: the previous one's groups never show under it while the new ones load. The same element moved
  // by a write (a nested edit above it added a line) keeps its groups.
  const shownFor = useRef<NodeSelection | null>(null);
  useEffect(() => {
    const previous = shownFor.current;
    const fresh = !previous || (previous !== selection && !sameSelectedElement(previous, selection) && (previous.src !== selection.src || previous.instance !== selection.instance));
    shownFor.current = selection;
    if (fresh) setNested([]);
    let alive = true;
    void (async () => {
      if (!elementRef.current) { setNested([]); return; }
      const owner = ownerHit(selection);
      // Mid hot-update the owner may be missing for a moment: keep the groups shown until the canvas has it again.
      if (!owner) return;
      const next = nestedOf(owner, elementRef.current, canvasApi.getWorldElement());
      const entries = await Promise.all(next.map((item) => studioApi.element(item.file, item.loc).then((source) => [item.src, source && source.name === item.name ? source : null] as const, () => [item.src, null] as const)));
      if (!alive) return;
      setNested(next);
      setSources(Object.fromEntries(entries));
      if (inFlight.current === 0) setOverrides({});
    })();
    return () => { alive = false; };
  }, [selection.src, selection.instance, element?.hash, version]);

  /** What a nested row shows: an edit on its way, else the source (state props show their initial state). */
  const valueFor = (item: Nested, name: string): PropValue => overrides[item.src]?.[name] ?? displayValueOf(item.name, sources[item.src]?.attributes ?? [], name, item.hit.props);

  /*
   * Nested edits run one after another: each reads its element (and the file's hash) once the edit before it has
   * landed, so a quick second click is planned from what the first one wrote, never dropped as "nothing to change".
   * `moved` follows each queued element through the writes made meanwhile (an added line moves the ones below).
   */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const moved = useRef(new Map<string, string>());
  useEffect(() => onStudioWrite((write) => {
    for (const [from, at] of moved.current) moved.current.set(from, mapSrc(at, write) ?? at);
  }), []);

  /** Sends one nested edit (the element read again first, at its current location) and shows its result. */
  const send = useCallback((item: Nested, spec: PropSpec, optimistic: PropValue, plan: (source: SourceElement) => WritePlan, label: string) => {
    if (api.disabled) return Promise.resolve();
    setOverrides((current) => ({ ...current, [item.src]: { ...current[item.src], [spec.name]: optimistic } }));
    inFlight.current += 1;
    if (!moved.current.has(item.src)) moved.current.set(item.src, item.src);
    const task = async () => {
      const src = moved.current.get(item.src) ?? item.src;
      const at = parseSrc(src) ?? { file: item.file, loc: item.loc };
      // The nested element is the edit target. The owner keeps its location when the nested element sits inside it
      // (below its opening tag); one written elsewhere (a const or a component above it) may move it, so it is remapped.
      const doneNested = noteEditTarget(src);
      const doneOwner = item.elsewhere ? () => undefined : noteEditTarget(selection.src);
      try {
        const fresh = await studioApi.element(at.file, at.loc).catch(() => null);
        if (!fresh || fresh.name !== item.name) {
          // The canvas has not caught up with an edit that moved it: read the list again instead of guessing.
          inspectorStatus.set("neutral", `${item.name} is updating; try again in a moment`);
          setOverrides({});
          return;
        }
        const { ops, note } = plan(fresh);
        // Nothing to write (the source already holds it): the next read shows it.
        if (!ops.length) return;
        let response = await applyEdit({ file: at.file, loc: at.loc, name: item.name, ops: ops as EditOp[], hash: fresh.hash }, label);
        if (!response.ok && response.code === "stale") {
          // Another write (a structural one api.ts does not rebase across, such as an item added to the owner) landed
          // between the read and the send: read the element again where it is now and send once more.
          const now = parseSrc(moved.current.get(item.src) ?? src) ?? at;
          const again = await studioApi.element(now.file, now.loc).catch(() => null);
          const retry = again && again.name === item.name ? plan(again) : null;
          if (again && retry?.ops.length) response = await applyEdit({ file: now.file, loc: now.loc, name: item.name, ops: retry.ops as EditOp[], hash: again.hash }, label);
        }
        if (!response.ok) setOverrides({});
        else if (note && selection.frameId) remountFrameAfterUpdate(selection.frameId, at.file);
      } finally {
        doneNested();
        doneOwner();
        inFlight.current -= 1;
        if (inFlight.current === 0) moved.current.clear();
        setVersion((current) => current + 1);
      }
    };
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => undefined);
    return run;
  }, [api.disabled, selection.src, selection.frameId]);

  /**
   * Sets a nested boolean (null: back to its default, the way the row's reset does), the way the selection's own
   * Properties do: a value the data holds is edited there (op setDataField, the row this instance renders; the binding
   * stays), a value back to what the saved file writes comes back as saved (resetSlot), else writePlan (fixed values,
   * state initializers, defaultX twins).
   */
  const write = useCallback((item: Nested, spec: PropSpec, value: Literal | null) => {
    const live = item.hit.props;
    if (value === null) {
      return send(item, spec, { state: "unset" }, (source) => planPropReset(item.name, source.attributes, spec.name, live), `${item.name} reset ${spec.name}`);
    }
    const playground = Boolean(selection.panelId);
    const label = `${item.name} ${spec.name} → ${display(value)}`;
    const current = valueFor(item, spec.name);
    if (dataEditable(current, api.boundHint)) {
      const world = canvasApi.getWorldElement();
      const row = current.dataSource.kind === "row" && world ? rowOf({ ...selection, src: item.src, name: item.name, instance: instanceOf(world, item.hit) }) : null;
      const rowIndex = row && "row" in row ? row.row : null;
      if (current.dataSource.kind !== "row" || rowIndex !== null) {
        return send(item, spec, { ...current, live: value }, () => ({ ops: [{ op: "setDataField", prop: spec.name, ...(rowIndex !== null ? { row: rowIndex } : {}), value: toEditValue(value) }] }), `${label} (data)`);
      }
    }
    return send(item, spec, { state: "literal", value, raw: "" }, (source) => savedWrite(item.name, source, spec.name, value, playground) ?? planPropWrite(item.name, source.attributes, spec.name, value, live), label);
  }, [send, selection, api.boundHint, valueFor]);

  /**
   * Puts back the binding the saved file has (`status={one.online}`) after a fixed value replaced it, where and as it
   * was: two queued requests, each planned from the file as it is then (a twin to drop, then the saved attribute).
   */
  const restore = useCallback((item: Nested, spec: PropSpec, saved: SourceAttr) => {
    const playground = Boolean(selection.panelId);
    const optimistic: PropValue = { state: "bound", expression: saved.value ?? "", raw: saved.raw, ...(saved.origin ? { origin: saved.origin } : {}) };
    const label = `${item.name} ${spec.name} → {${saved.value}}`;
    const step = (source: SourceElement): WritePlan => ({ ops: restoreStep(item.name, source, spec.name, saved, playground) });
    void send(item, spec, optimistic, step, label);
    return send(item, spec, optimistic, step, label);
  }, [send, selection.panelId]);

  const items = nested.filter((item) => sources[item.src]);
  /** The row's restore action, when the draft replaced a saved binding of this prop. */
  const restoreFor = (item: Nested, spec: PropSpec) => {
    const source = sources[item.src];
    const saved = source ? restorableBinding(source, spec.name) : null;
    return saved ? { expression: saved.value ?? "", onRestore: () => { void restore(item, spec, saved); } } : null;
  };
  /** The nested instance's source as last read (Reset all overrides plans its removals from it). */
  const sourceOf = (item: Nested) => sources[item.src] ?? null;
  return { items, valueFor, write, restoreFor, sourceOf };
}

export type NestedInstances = ReturnType<typeof useNestedInstances>;
