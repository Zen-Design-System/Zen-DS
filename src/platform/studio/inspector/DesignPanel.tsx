import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Link } from "../../../components/Link";
import { Heading, plural } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { pageLabels } from "../../PlatformApp";
import type { PlatformPage } from "../../PlatformExamples";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { canvasApi } from "../canvas/viewport";
import { studioDrafts } from "../sourceDrafts";
import { canEdit, studioStore, useStudio } from "../store";
import type { EditOp, EditValue, SourceAttr, SourceElement, StudioNodeRef } from "../types";
import { childHits, findBySrc, isTransparentName, onSourceUpdate, rectOf, selectHit, selectionInstances, type FiberHit } from "../select/picker";
import { noteEditTarget } from "../select/remap";
import { navigate } from "../shell/navigation";
import { RemoveAction, SlotsSection } from "../slots";
import { slotOf } from "../slots/registry";
import { detachShown, rowOf, useDetachPlan } from "./detach";
import { DetachAction } from "./DetachAction";
import type { FieldApi } from "./fieldApi";
import { copyText } from "./frames";
import { GroupedProperties } from "./GroupedProperties";
import { HostTextAlignment } from "./HostTextAlignment";
import { LayoutSection } from "./LayoutSection";
import { InspectorFileContext, InspectorHostContext } from "./controls/hostContext";
import { componentGroupsOf } from "./componentGroups";
import { AppearanceSection, appearancePropNames, CardEffectsSection, EffectsSection } from "../appearance/AppearanceSection";
import { NestedProperties } from "./NestedProperties";
import { useNestedInstances } from "./nestedInstances";
import { ObjectProperties, type ShapedProp } from "./ObjectProperties";
import { PositionSection, positionProps } from "../position";
import { ValueCell } from "./PartPanel";
import { BoundValue, PropField, TextControl, TypographyControl } from "./PropField";
import {
  attributeSpec, componentSlug, dataEditable, isLayoutProp, isSkippedProp, kindLabel, layoutComponents, literalOf, nodeKind, propLabel, propSpecs, requiredProps, textComponents, textProps, valueOf,
  type Literal, type PropSpec, type PropValue,
} from "./propSchema";
import { InspectorItem, InspectorRow, InspectorSection } from "./Section";
import { autoGroups, labelInGroup } from "./autoGroups";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { hasSizing, SizingSection, sizingPropNames } from "./SizingSection";
import { InstanceSizeGroup, useInstanceSizing } from "./InstanceSizeGroup";
import { SlotHost, useSlotFilled } from "./SlotHost";
import { openQuickInsert } from "../builder/library/quickInsertState";
import { resetAllProps } from "./resetAll";
import { fileName, inspectorStatus, saveShortcut, undoShortcut } from "./status";
import { alignmentHint, hostTextTags, useRenderedText, type RenderedText } from "./textInfo";
import { displayValueOf, isTwinRow, planPropReset, planPropWrite, restorableBinding, restoreStep, savedWrite, type WritePlan } from "./writePlan";
import { remountFrameAfterUpdate } from "../board/remount";

/*
 * Design tab for a selected JSX element (spec §6): playground properties (the playground's own controls, portalled
 * in), the component's API props, a Figma-like auto-layout block, text styles and text content. Values come from the
 * source (GET /element); every change is one POST /edit that the dev server writes and HMR shows at once.
 */

type NodeSelection = { kind: "node" } & StudioNodeRef;

const toEditValue = (value: Literal): EditValue =>
  typeof value === "boolean" ? { kind: "boolean", value } : typeof value === "number" ? { kind: "number", value } : { kind: "string", value };

const display = (value: Literal) => (typeof value === "string" ? `"${value.length > 24 ? `${value.slice(0, 24)}…` : value}"` : String(value));

/* Double-click on canvas text asks the Content field for focus (the panel may mount a moment later). */
let focusRequestedAt = 0;
const focusListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  const onFocusRequest = () => {
    focusRequestedAt = Date.now();
    focusListeners.forEach((listener) => listener());
  };
  window.addEventListener("zen-studio:focus-content", onFocusRequest);
  import.meta.hot?.dispose(() => window.removeEventListener("zen-studio:focus-content", onFocusRequest));
}

function useFocusContentToken() {
  const [token, setToken] = useState(() => (Date.now() - focusRequestedAt < 2000 ? Date.now() : 0));
  useEffect(() => {
    const listener = () => setToken(Date.now());
    focusListeners.add(listener);
    return () => { focusListeners.delete(listener); };
  }, []);
  useEffect(() => {
    if (!token) return undefined;
    focusRequestedAt = 0;
    const timer = window.setTimeout(() => setToken(0), 1500);
    return () => window.clearTimeout(timer);
  }, [token]);
  return token;
}

/** The rendered hit of the selection (for child lookups). */
function selectedHit(selection: NodeSelection): FiberHit | null {
  const world = canvasApi.getWorldElement();
  if (!world) return null;
  const hits = findBySrc(world, selection.src);
  return hits[selection.instance] ?? hits[0] ?? null;
}

/** The selection's rendered element that carries its data-zen-src (else its first host element), for measured px. */
function sourceHost(selection: NodeSelection): HTMLElement | null {
  const hosts = (selectedHit(selection)?.hosts ?? []).filter((node): node is HTMLElement => node instanceof HTMLElement);
  return hosts.find((node) => node.getAttribute("data-zen-src") === selection.src) ?? hosts[0] ?? null;
}

/** Selects a child element of the selection by its source location (searches a few annotated levels down). */
function selectChild(selection: NodeSelection, childSrc: string) {
  const world = canvasApi.getWorldElement();
  if (!world) return;
  let level = selectedHit(selection) ? [selectedHit(selection)!] : [];
  let found: FiberHit | null = null;
  for (let depth = 0; depth < 6 && level.length && !found; depth++) {
    const next = level.flatMap((hit) => childHits(hit));
    found = next.find((hit) => hit.src === childSrc) ?? null;
    level = next;
  }
  found ??= findBySrc(world, childSrc)[0] ?? null;
  if (!found) {
    inspectorStatus.set("neutral", "That element is not rendered right now");
    return;
  }
  selectHit(found, world);
  const rect = rectOf(found.hosts);
  if (rect) canvasApi.ensureVisible(rect);
}

/** The address of a docs page in this Studio (?page=<slug>), so ⌘/Ctrl-click opens it in a new tab. */
function pageHref(page: PlatformPage) {
  const url = new URL(window.location.href);
  url.searchParams.set("page", page);
  url.searchParams.delete("collection");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

/** One prop row; `component` scopes its label ("sticky" is "Pin to bottom" on FormActions, "Pin to top" on TopNavigation). */
function Field({ spec, api, label, component, hint }: { spec: PropSpec; api: FieldApi; label?: string; component?: string; hint?: string }) {
  return (
    <PropField
      spec={spec}
      hint={hint}
      label={label ?? propLabel(spec.name, component)}
      value={api.valueFor(spec.name)}
      disabled={api.disabled}
      boundHint={api.boundHint}
      onSet={(value) => api.setProp(spec.name, value)}
      onReset={() => api.removeProp(spec.name)}
      restore={api.restoreFor?.(spec.name)}
      repeats={api.repeats}
    />
  );
}

/*
 * Text section (spec §6.5), for every element whose rendered output holds text:
 *   text   Text / Heading: textStyle (its default named from the canvas when the API has none), tone, align…;
 *   class  host text elements (and any element whose className uses typographyStyles): a Text style picker writing
 *          setTypography (swap) or setTextStyle (add / remove; the file gains or loses the typographyStyles import);
 *          a host element also gets Figma's Alignment rows, written as its inline style (HostTextAlignment);
 *   prop   a component whose own props render the text (Button, Chip, Tabs…): read-only, the prop that sets it focusable.
 */
type TextKind = "text" | "class" | "prop";

/** Props that choose a component's text style (Button size → Button-Label/M), in order of preference. */
const textStyleProps = ["size", "density", "headingLevel"];

/** Figma's Typography order in the Text section: the style, then its Alignment; the other props keep their API order. */
const textLeadProps = ["textStyle", "align", "verticalAlign"];
const textRank = (prop: string) => (textLeadProps.includes(prop) ? textLeadProps.indexOf(prop) : textLeadProps.length);

/** Labels in the Text section (Figma's Typography names); other props keep propLabel's. */
const textLabels: Record<string, string> = { textStyle: "Style", align: "Alignment", verticalAlign: "Vertical" };

/** A Text / Heading prop as the Text section edits it: textStyle defaults to the style it renders with when the API has
 * none (Heading's level picks one); align becomes Figma's icon Alignment, unset showing what the canvas renders;
 * truncate becomes Truncate text + Max lines. */
function textSpec(spec: PropSpec, rendered: RenderedText, element: SourceElement): PropSpec {
  const named = rendered.styles[0];
  if (spec.name === "textStyle" && spec.defaultValue === null && named) return { ...spec, defaultValue: named };
  if (spec.name === "align" && spec.editor.kind === "enum") return { ...spec, editor: { kind: "text-align", options: spec.editor.options }, defaultValue: rendered.align };
  if (spec.name === "verticalAlign" && spec.editor.kind === "enum") return { ...spec, editor: { kind: "text-align", options: spec.editor.options }, defaultValue: rendered.valign };
  // truncate is boolean | number: Figma's Truncate text switch plus Max lines (a boolean useState keeps one line).
  if (spec.name === "truncate" && spec.editor.kind === "boolean") {
    const state = element.attributes.find((attr) => attr.kind !== "spread" && attr.name === spec.name)?.state;
    return { ...spec, editor: { kind: "truncate", ...(state && typeof state.value === "boolean" ? { state: state.name } : {}) } };
  }
  return spec;
}

/** The named style a text renders with (the best match), or its size / line height · weight. */
const renderedStyle = (rendered: RenderedText) => rendered.styles[0] ?? rendered.metrics;

function TextSection({ kind, name, element, specs, api, rendered, send, relevant, onFocusProp }: {
  kind: TextKind;
  name: string;
  element: SourceElement;
  specs: PropSpec[];
  api: FieldApi;
  rendered: RenderedText;
  send: (ops: EditOp[], label: string) => void;
  /** kind "prop": the prop that sets the text style, the value it renders with and where that comes from. */
  relevant: { name: string; value: string; note?: string } | null;
  onFocusProp: (prop: string) => void;
}) {
  const keys = element.typography;
  const remove = () => send([{ op: "setTextStyle", value: null }], `${name} text style removed`);
  const classRows = keys.length ? keys.map((key, index) => (
    <InspectorRow
      key={`${key}-${index}`}
      name={index === 0 ? "textStyle" : undefined}
      label={keys.length > 1 ? `Style ${index + 1}` : "Style"}
      action={index === 0 && !api.disabled ? <IconButton icon="icon-reverse-left-line" aria-label="Remove the text style (inherit it)" appearance="flat" level="primary" size="xs" onClick={remove} /> : null}
    >
      <TypographyControl
        label={keys.length > 1 ? `Text style ${index + 1}` : "Text style"}
        value={key}
        fallback={undefined}
        disabled={api.disabled}
        onSet={(next) => send([{ op: "setTypography", from: key, to: next }], `${name} text style → ${next}`)}
        onClear={remove}
      />
    </InspectorRow>
  )) : null;

  if (kind === "text") {
    return (
      <InspectorSection title="Text">
        {[...specs].sort((a, b) => textRank(a.name) - textRank(b.name)).map((spec) => (
          <Field
            key={spec.name}
            spec={textSpec(spec, rendered, element)}
            api={api}
            label={textLabels[spec.name]}
            hint={alignmentHint(spec.name, rendered)}
            component={name}
          />
        ))}
        {classRows}
      </InspectorSection>
    );
  }

  if (kind === "class") {
    return (
      <InspectorSection title="Text">
        {classRows ?? (
          <InspectorRow name="textStyle" label="Style" isDefault hint={renderedStyle(rendered) ? `Inherited: ${renderedStyle(rendered)}` : undefined}>
            <TypographyControl
              label={`Text style: none${renderedStyle(rendered) ? ` (inherited: ${renderedStyle(rendered)})` : ""}`}
              value={undefined}
              fallback={undefined}
              emptyLabel="None"
              disabled={api.disabled}
              onSet={(next) => send([{ op: "setTextStyle", value: next }], `${name} text style → ${next}`)}
            />
          </InspectorRow>
        )}
        {/^[a-z]/.test(name) ? <HostTextAlignment name={name} element={element} rendered={rendered} disabled={api.disabled} send={send} /> : null}
      </InspectorSection>
    );
  }

  // No prop, and the text renders with the font around the component: inherited.
  const from = relevant ? `Text style comes from ${name} · ${relevant.name} ${relevant.value}${relevant.note ? ` (${relevant.note})` : ""}`
    : rendered.inherits ? `${name} sets no text style: its text inherits the one around it` : `Text style comes from ${name}`;
  return (
    <InspectorSection title="Text">
      <InspectorRow label={rendered.styles.length > 1 ? "Styles" : "Style"}><ValueCell value={(rendered.styles.length ? rendered.styles.join(", ") : rendered.metrics) || "—"} /></InspectorRow>
      <div className="studio-text-source">
        <p className={`studio-text-source__text ${typographyStyles["Body/Small/Regular"]}`}>{from}</p>
        {relevant ? (
          // zen-allow-compact-button: a quiet jump to the prop control in a dense tool panel, like the element's file link
          <Button appearance="flat" level="primary" size="xs" className="studio-text-source__action" onClick={() => onFocusProp(relevant.name)}>
            Edit {relevant.name}
          </Button>
        ) : null}
      </div>
    </InspectorSection>
  );
}

/** "Size" / "size" / "Heading level" → "size" / "headinglevel" (playground labels against prop names). */
const propKey = (value: string | null | undefined) => (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The playground's own control row for a prop (its label names the prop), inside the controls slot. */
function playgroundRow(slot: HTMLElement, prop: string): HTMLElement | null {
  return Array.from(slot.querySelectorAll<HTMLElement>(".platform-property-row")).find((row) => propKey(row.querySelector(".platform-property-row__label")?.textContent) === propKey(prop)) ?? null;
}

/** Scrolls to a control row, focuses its control (the checked segment, the field, the trigger) and marks the row briefly. */
function focusRow(row: HTMLElement) {
  row.scrollIntoView({ block: "center" });
  const control = row.querySelector<HTMLElement>("[role='radio'][aria-checked='true']:not(:disabled), [role='tab'][aria-selected='true']")
    ?? row.querySelector<HTMLElement>("input:not(:disabled), textarea:not(:disabled), button:not(:disabled):not([tabindex='-1']), [tabindex='0']");
  control?.focus({ preventScroll: true });
  row.dataset.flash = "true";
  window.setTimeout(() => { delete row.dataset.flash; }, 1200);
}

/** Whether the element at `loc` already holds what `ops` would write (a repeated or raced edit, not a conflict). */
async function alreadyApplied(file: string, loc: string, name: string, ops: EditOp[]): Promise<boolean> {
  const current = await studioApi.element(file, loc);
  if (!current || current.name !== name) return false;
  return ops.every((op) => {
    // Removed: no attribute of that name is written any more (a spread on the element may still feed it).
    if (op.op === "removeProp") return ["unset", "spread"].includes(valueOf(current.attributes, op.name).state);
    if (op.op === "setTypography") return current.typography.includes(op.to);
    if (op.op === "setTextStyle") return op.value === null ? current.typography.length === 0 : current.typography.length > 0 && current.typography.every((key) => key === op.value);
    if (op.op === "setText") {
      const child = current.children.find((candidate) => candidate.kind === "text" && candidate.index === op.index);
      return child?.kind === "text" && child.value.trim() === op.value.trim();
    }
    if (op.op === "setStateInit") {
      const state = current.attributes.find((attr) => attr.kind !== "spread" && attr.name === op.name)?.state;
      return op.value.kind !== "expression" && state?.value === op.value.value;
    }
    // A detach, a wrap or a slot op (insert/remove/duplicate/move) changes the structure: never already applied.
    if (op.op !== "setProp") return false;
    const value = valueOf(current.attributes, op.name);
    const wanted = op.value.kind === "expression" ? literalOf(op.value.code) : op.value.value;
    return value.state === "literal" && value.value === wanted;
  });
}

const sameProps = (left: Record<string, unknown> | undefined, right: Record<string, unknown> | undefined) => {
  if (left === right) return true;
  if (!left || !right) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => Object.is(left[key], right[key]));
};

/** The props the selected element renders with now (for props a spread feeds in), refreshed as the canvas re-renders. */
function useLiveProps(selection: NodeSelection, enabled: boolean) {
  const [live, setLive] = useState<Record<string, unknown> | undefined>(undefined);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  useEffect(() => {
    if (!enabled) { setLive(undefined); return undefined; }
    const read = () => {
      const props = selectedHit(selectionRef.current)?.props;
      setLive((current) => (sameProps(current, props) ? current : props));
    };
    read();
    let timer = 0;
    const world = canvasApi.getWorldElement();
    const observer = new MutationObserver(() => {
      if (timer) return;
      timer = window.setTimeout(() => { timer = 0; read(); }, 250);
    });
    if (world) observer.observe(world, { subtree: true, childList: true, characterData: true, attributes: true });
    const offUpdate = onSourceUpdate(read);
    return () => { observer.disconnect(); window.clearTimeout(timer); offUpdate(); };
  }, [enabled, selection.src, selection.instance]);
  return live;
}

/** Design tab for a JSX element. */
export function DesignPanel({ selection, controlsSlot }: { selection: NodeSelection; controlsSlot: HTMLElement }) {
  const parsed = parseSrc(selection.src);
  const server = useStudioServer();
  const role = useStudio((state) => state.role);
  const currentPage = useStudio((state) => state.page);
  const editable = canEdit() && role === "admin" && server.writable;
  const [element, setElement] = useState<SourceElement | null | undefined>(undefined);
  const [overrides, setOverrides] = useState<Record<string, PropValue>>({});
  const [version, setVersion] = useState(0);
  const refetch = useCallback(() => setVersion((value) => value + 1), []);
  const info = useSyncExternalStore(selectionInstances.subscribe, selectionInstances.get, selectionInstances.get);
  const instances = info.src === selection.src ? info.count : 0;
  const detach = useDetachPlan(element, selection, detachShown(element, selection) && editable);
  // A row of a .map: Detach replaces only this row (index === K), every other edit changes all instances. While the
  // plan loads, the rendered fibers say whether it is a .map row, so the header does not change height when it arrives.
  const mapRow = useMemo(() => {
    const row = instances > 1 ? rowOf(selection) : null;
    return Boolean(row && !("reason" in row));
    // rowOf reads the canvas for this selection; it changes with the selection and its instance count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.src, selection.instance, instances]);
  // The row of its .map list this instance renders (0 when it renders once; null when the canvas cannot say): a value
  // edited at its data (WP-C, op setDataField) is written to that row.
  const dataRow = useMemo(() => {
    if (instances <= 1) return 0;
    const row = rowOf(selection);
    return row && !("reason" in row) ? row.row : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.src, selection.instance, instances]);
  // Row-ness comes from the canvas whenever the server gives no plan (loading or refused), so the label and the Repeats
  // line keep their wording and height when a refusal arrives.
  const rowDetach = detach.state === "ready" ? detach.plan.repeated : mapRow;
  const controlsFilled = useSlotFilled(controlsSlot);
  const focusToken = useFocusContentToken();
  const hasSpread = Boolean(element?.attributes.some((attr) => attr.kind === "spread"));
  // A boolean bound to data shows what it renders (its switch, PropField), so those read the rendered props too.
  const hasDataBinding = Boolean(element?.attributes.some((attr) => attr.origin?.kind === "bound-value" || attr.origin?.kind === "loop-bound"));
  const live = useLiveProps(selection, hasSpread || hasDataBinding);
  // Figma groups (propGroups.ts) show and hide by what the element renders with now.
  // Figma's instance-panel order and names: hand-written groups, else generated from the Figma read (WP-E).
  const groups = componentGroupsOf(element?.name ?? selection.name);
  const renderedProps = useLiveProps(selection, Boolean(groups));
  const rendered = useRenderedText(() => selectedHit(selection), selection.src, selection.instance);
  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * Edits go out one at a time, each with the file hash the previous one returned, so a quick second change is not
   * refused as stale. The location is read when the request leaves (a write may have moved the element); the element
   * name is the one the panel showed when the person acted.
   */
  const elementRef = useRef(element);
  elementRef.current = element;
  const locRef = useRef(parsed);
  locRef.current = parsed;
  const hashRef = useRef<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const editCount = useRef(0);
  const inFlight = useRef(0);
  // The edit count when the element shown was read: a write that landed after it leaves the attributes stale until the
  // next read, so a click planned from them is planned again from a fresh read (Show then Remove, quickly).
  const readEdits = useRef(0);
  const stale = () => inFlight.current > 0 || readEdits.current !== editCount.current;

  useEffect(() => {
    if (!parsed) { setElement(null); return undefined; }
    let alive = true;
    const startedAt = editCount.current;
    void studioApi.element(parsed.file, parsed.loc).then((next) => {
      if (!alive) return;
      setElement(next);
      readEdits.current = startedAt;
      // A read that started before the last edit may predate it: keep the optimistic values and the newer hash.
      if (startedAt === editCount.current && inFlight.current === 0) {
        hashRef.current = next?.hash ?? null;
        setOverrides({});
      }
    });
    return () => { alive = false; };
  }, [parsed?.file, parsed?.loc, version]);
  useEffect(() => onSourceUpdate(refetch), [refetch]);
  // Undo/redo rewrites the file: read the element again.
  const undoCount = useStudio((state) => state.undo.length);
  const redoCount = useStudio((state) => state.redo.length);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    refetch();
  }, [undoCount, redoCount, refetch]);

  /** Queues one write; resolves true when the file holds it (written, or already there). */
  const send = useCallback((ops: EditOp[], label: string, optimistic: Record<string, PropValue>, replan?: (attributes: SourceAttr[]) => EditOp[]): Promise<boolean> => {
    const shown = elementRef.current;
    if (!shown || !editable) return Promise.resolve(false);
    // Queued behind another write, or planned from attributes a landed write made stale: read again before sending.
    const behind = stale();
    setOverrides((current) => ({ ...current, ...optimistic }));
    editCount.current += 1;
    inFlight.current += 1;
    let written = false;
    const run = async () => {
      const at = locRef.current ?? { file: shown.file, loc: shown.loc };
      const done = noteEditTarget(`${at.file}:${at.loc}`);
      try {
        let sendOps = ops;
        // A quick second click is planned again from the element as the file holds it now (the first click has landed),
        // so it is neither dropped as "nothing to change" nor written from stale attributes.
        if (replan && behind) {
          const fresh = await studioApi.element(at.file, at.loc).catch(() => null);
          if (fresh && fresh.name === shown.name) {
            sendOps = replan(fresh.attributes);
            hashRef.current = fresh.hash;
          }
        }
        if (!sendOps.length) { written = true; return; }
        const response = await applyEdit({ file: at.file, loc: at.loc, name: shown.name, ops: sendOps, hash: hashRef.current ?? shown.hash }, label);
        if (response.ok) {
          // A data edit (op setDataField) may write another file (examples/data.ts): its hash is not this element's file's.
          if (!response.file || response.file === at.file) hashRef.current = response.hash;
          written = true;
        } else if (response.code === "stale" && await alreadyApplied(at.file, at.loc, shown.name, sendOps)) {
          written = true;
          // Already in the file's draft (a drafts server) or on disk.
          const where = `${fileName(at.file)}:${at.loc.split(":")[0]}`;
          if (studioDrafts.get().available) inspectorStatus.set("neutral", `Draft · ${where} · ${saveShortcut} to save`);
          else inspectorStatus.set("positive", `Saved · ${where}`);
        } else {
          setOverrides({});
          if (response.code === "stale") inspectorStatus.set("negative", "The file changed before this edit was saved; nothing was written");
          // A dev server started before setTextStyle existed answers 400 "Unknown op": say what to do instead.
          else if (/Unknown op "setTextStyle"/.test(response.error)) inspectorStatus.set("negative", "Restart the dev server to edit text styles");
        }
      } finally {
        done();
        inFlight.current -= 1;
        // Also after a replanned write that had nothing left to change: the optimistic value gives way to the source.
        refetch();
      }
    };
    const queued = queue.current.then(run, run);
    queue.current = queued;
    return queued.then(() => written, () => false);
  }, [editable, refetch]);

  // A write that changes an initial state (a defaultX twin, a useState initializer) remounts the frame once the hot
  // update lands: Fast Refresh keeps the old state otherwise, and the canvas would not show it (writePlan.ts).
  const runPlan = useCallback((plan: WritePlan, label: string, optimistic: Record<string, PropValue>, replan?: (attributes: SourceAttr[]) => EditOp[]) => {
    // Nothing to write, unless a write still on its way may change that (a quick second click: planned again in the queue).
    if (!plan.ops.length && !(replan && stale())) return Promise.resolve(false);
    const written = send(plan.ops, plan.note ? `${label} (${plan.note})` : label, optimistic, replan);
    const file = element?.file;
    const frameId = selection.frameId;
    if (plan.note && file && frameId) void written.then((ok) => { if (ok) remountFrameAfterUpdate(frameId, file); });
    return written;
  }, [send, element?.file, selection.frameId]);

  const api: FieldApi = useMemo(() => ({
    // State props show their initial state (useState literal, defaultX) and edit it, so the component keeps toggling.
    valueFor: (name) => {
      const value = overrides[name] ?? (element ? displayValueOf(element.name, element.attributes, name, live) : { state: "unset" });
      // A .map row's data is edited in this instance's row (the note names it).
      return value.state === "bound" && value.dataSource?.kind === "row" && dataRow !== null ? { ...value, dataSource: { ...value.dataSource, row: dataRow } } : value;
    },
    setProp: (name, value) => {
      if (!element) return;
      const current = overrides[name] ?? displayValueOf(element.name, element.attributes, name, live);
      if (dataEditable(current, selection.panelId ? "playground" : undefined)) {
        // Written where the data is (WP-C): the binding stays, so the optimistic value is the same binding rendering `value`.
        if (current.dataSource.kind === "row" && dataRow === null) {
          inspectorStatus.set("negative", "This list renders in several places on the canvas, so the row to edit is unclear; edit the data in code");
          return;
        }
        const row = current.dataSource.kind === "row" ? { row: dataRow ?? 0 } : {};
        void send([{ op: "setDataField", prop: name, ...row, value: toEditValue(value) }], `${element.name} ${name} → ${display(value)} (data)`, { [name]: { ...current, live: value } });
        return;
      }
      const plan = planPropWrite(element.name, element.attributes, name, value, live);
      const removes = !plan.note && plan.ops.length > 0 && plan.ops.every((op) => op.op === "removeProp");
      const label = `${element.name} ${name} → ${display(value)}`;
      const optimistic: Record<string, PropValue> = { [name]: removes ? { state: "unset" } : { state: "literal", value, raw: "" } };
      const replan = (attributes: SourceAttr[]) => planPropWrite(element.name, attributes, name, value, live).ops;
      // Back to what the saved file writes: the saved attribute returns where and as it was, so the draft goes away
      // (a playground's file refuses slot ops; a refusal falls back to the plain write).
      const back = selection.panelId ? null : savedWrite(element.name, element, name, value);
      if (back) void runPlan(back, label, optimistic).then((written) => { if (!written) void runPlan(plan, label, optimistic, replan); });
      else void runPlan(plan, label, optimistic, replan);
    },
    setProps: (values) => send(
      Object.entries(values).map(([name, value]) => ({ op: "setProp", name, value: toEditValue(value) })),
      `${element?.name ?? selection.name} ${Object.entries(values).map(([name, value]) => `${name} → ${display(value)}`).join(", ")}`,
      Object.fromEntries(Object.entries(values).map(([name, value]) => [name, { state: "literal", value, raw: "" } as PropValue])),
    ),
    removeProp: (name) => {
      if (!element) return;
      const plan = planPropReset(element.name, element.attributes, name, live);
      void runPlan(plan, `${element.name} reset ${name}`, plan.ops.some((op) => op.op === "setStateInit") ? {} : { [name]: { state: "unset" } }, (attributes) => planPropReset(element.name, attributes, name, live).ops);
    },
    apply: (ops, label, optimistic) => send(ops, label, optimistic ?? {}),
    disabled: !editable || !element,
    boundHint: selection.panelId ? "Use Playground properties" : undefined,
    repeats: instances,
    restoreFor: (name) => {
      const saved = element ? restorableBinding(element, name) : null;
      if (!element || !saved) return null;
      return {
        expression: saved.value ?? "",
        onRestore: () => {
          // Where and as it was: a twin the draft added goes first, then the saved attribute (each request re-planned
          // from the file once the one before it has landed).
          const playground = Boolean(selection.panelId);
          const label = `${element.name} ${name} → {${saved.value}}`;
          const optimistic: Record<string, PropValue> = { [name]: { state: "bound", expression: saved.value ?? "", raw: saved.raw, ...(saved.origin ? { origin: saved.origin } : {}) } };
          const step = (attributes: SourceAttr[]) => restoreStep(element.name, { ...element, attributes }, name, saved, playground);
          void send(step(element.attributes), label, optimistic, step);
          void send(step(element.attributes), label, optimistic, step);
        },
      };
    },
  }), [overrides, element, live, send, runPlan, editable, selection.name, selection.panelId, instances, dataRow]);

  // Figma's nested instances of the selection (its props' Zen components), read once here: Properties and the Nested
  // instances section list them, and Reset all overrides resets theirs too.
  const nested = useNestedInstances(selection, element, api);
  // W / H of a library component as the canvas resizes it (GĐ4 M4): Hug, Fill or Fixed through a Stack it fills.
  const instanceSize = useInstanceSizing(selection.src);

  const name = element?.name ?? selection.name;
  const specs = useMemo(() => {
    const own = propSpecs(name);
    // A defaultX twin is edited from its state prop's row (writePlan.ts): no second row for it.
    return (own.length ? own : propSpecs(selection.name)).filter((spec) => !isTwinRow(own.length ? name : selection.name, spec.name));
  }, [name, selection.name]);
  const isLayout = layoutComponents.has(name) || layoutComponents.has(selection.name);
  const isText = textComponents.has(name) || textComponents.has(selection.name);
  // Width, height, min/max, alignSelf and fillChildren go to the Size group of the Layout section (Stack, Grid, Box,
  // Text, Heading), not to Properties.
  const sizing = hasSizing(name);
  const sizingSpecs = sizing ? specs.filter((spec) => sizingPropNames.has(spec.name)) : [];
  // position, constraintX/Y and inset* of Stack, Grid and Box go to the Position section (ActionBar keeps its own position).
  const positioned = ["Stack", "Grid", "Box"].includes(name);
  const positionSpecs = positioned ? specs.filter((spec) => (positionProps as readonly string[]).includes(spec.name)) : [];
  const layoutSpecs = isLayout ? specs.filter((spec) => isLayoutProp(name, spec.name) && !sizingSpecs.includes(spec) && !positionSpecs.includes(spec)) : [];
  const textSpecs = isText ? specs.filter((spec) => textProps.has(spec.name)) : [];
  // Box fill, border, corners, clip and effect; Image corners: the Appearance and Effects sections (Figma UI3), not Properties.
  const appearanceSpecs = specs.filter((spec) => (appearancePropNames[name] ?? []).includes(spec.name));
  const propertySpecs = specs.filter((spec) => !layoutSpecs.includes(spec) && !textSpecs.includes(spec) && !sizingSpecs.includes(spec) && !positionSpecs.includes(spec) && !appearanceSpecs.includes(spec));
  // Object and array literals written in place (leading={{ … }}, trailing={[{ … }]}): edited field by field below the rows.
  const shapedProps: ShapedProp[] = propertySpecs.flatMap((spec) => {
    const attr = element?.attributes.filter((attribute) => attribute.kind === "expression" && attribute.name === spec.name).at(-1);
    return attr?.shape && !(spec.name in overrides) ? [{ spec, shape: attr.shape }] : [];
  });
  const shapedNames = new Set(shapedProps.map((entry) => entry.spec.name));
  // A component whose JSX children are a content slot lists them in the Slots section, not again under Content.
  const childrenInSlots = Boolean(slotOf(name, "children"));
  const documented = new Set(specs.map((spec) => spec.name));
  const otherAttributes = (element?.attributes ?? []).filter((attr): attr is SourceAttr => attr.kind !== "spread" && !documented.has(attr.name) && !isSkippedProp(attr.name));
  const spreads = (element?.attributes ?? []).filter((attr) => attr.kind === "spread");
  const texts = (element?.children ?? []).flatMap((child) => (child.kind === "text" && child.value.trim() ? [child] : []));
  const expressions = (element?.children ?? []).flatMap((child) => (child.kind === "expression" ? [child] : []));
  // Docs scaffolding (ComponentPreview, PlaygroundControls…) is not a layer: not offered as a child to select.
  const childElements = childrenInSlots ? [] : (element?.children ?? []).flatMap((child) => (child.kind === "element" && !isTransparentName(child.name) ? [child] : []));
  const isComponent = /^[A-Z]/.test(name) || name.includes(".");
  const line = parsed?.line ?? 0;
  const file = parsed?.file ?? "";
  const firstText = texts[0]?.index;
  // Text: Text/Heading props; a host element's (or a className's) text style; or the component prop that sets it.
  const sourceText = texts.length > 0;
  const hostText = !isComponent && (hostTextTags.has(name) ? rendered.holdsText || sourceText : rendered.directText || sourceText);
  const textKind: TextKind | null = !element ? null
    : isText ? "text"
      : element.typography.length || hostText ? "class"
        : isComponent && rendered.ownText ? "prop" : null;
  const relevantProp = textKind === "prop" ? textStyleProps.find((prop) => specs.some((spec) => spec.name === prop)) : undefined;
  const relevant = (() => {
    if (!relevantProp) return null;
    const value = api.valueFor(relevantProp);
    const written = value.state === "literal" ? String(value.value) : null;
    const fallback = specs.find((spec) => spec.name === relevantProp)?.defaultValue;
    // What it renders with (a parent such as FormActions may set it: then that value, noted).
    const rendering = selectedHit(selection)?.props?.[relevantProp];
    const live = typeof rendering === "string" || typeof rendering === "number" ? String(rendering) : null;
    if (written !== null) return { name: relevantProp, value: live ?? written, note: live !== null && live !== written ? "set by a parent" : undefined };
    if (live !== null) return { name: relevantProp, value: live, note: value.state === "bound" || value.state === "spread" ? undefined : fallback !== null && String(fallback) === live ? "default" : "set by a parent" };
    return fallback === null || fallback === undefined ? { name: relevantProp, value: "not set" } : { name: relevantProp, value: String(fallback), note: "default" };
  })();
  const focusProp = (prop: string) => {
    const state = api.valueFor(prop).state;
    // A playground feeds a bound value: its own control is the one that changes it.
    const row = (selection.panelId && state !== "literal" && state !== "unset" ? playgroundRow(controlsSlot, prop) : null)
      ?? panelRef.current?.querySelector<HTMLElement>(`.studio-inspector__row[data-prop~="${CSS.escape(prop)}"]`)
      ?? (selection.panelId ? playgroundRow(controlsSlot, prop) : null);
    if (row) focusRow(row);
    else inspectorStatus.set("neutral", `${name} ${prop} is set in the code`);
  };
  const textSection = element && textKind ? (
    <TextSection
      kind={textKind}
      name={name}
      element={element}
      specs={textSpecs}
      api={api}
      rendered={rendered}
      send={(ops, label) => send(ops, label, {})}
      relevant={relevant}
      onFocusProp={focusProp}
    />
  ) : null;
  // A host text element (often inline in a Text) shows its Text section first, above a playground's controls.
  const textFirst = textKind === "class" && !isComponent;
  const spreadNote = spreads.length ? `Set through ${spreads.map((spread) => spread.raw).join(", ")}: the props it sets are read-only here.` : undefined;
  // Layout components show Layout above Properties (Figma UI3 order): the bound and spread notes go on the first of the two.
  const instanceSized = Boolean(instanceSize && !sizing && !isLayout && !isText && nodeKind(name) === "zen");
  const layoutShown = Boolean(element && (layoutSpecs.length || sizing || instanceSized));
  // Bound values carry a ƒ in their own row (its tooltip names the expression), so no section repeats it.
  const sectionNote = spreadNote;
  const propertiesNote = layoutShown ? undefined : sectionNote;
  // Layout (LayoutSection.tsx): Flow, Size, Alignment + Gap, Columns, Padding; each gesture one apply (layoutModel.ts).
  const layoutSection = layoutShown ? (
    <LayoutSection
      key={`${selection.src}#${selection.instance}`}
      specs={layoutSpecs}
      api={api}
      note={sectionNote}
      component={name}
      attributes={element?.attributes ?? []}
      host={sourceHost(selection)}
      sizing={sizing ? <SizingSection api={api} specs={sizingSpecs} component={name} host={sourceHost(selection)} />
        : instanceSized && instanceSize ? <InstanceSizeGroup sizing={instanceSize} disabled={!editable} /> : null}
    />
  ) : null;

  // Header (option B): title row, then labelled rows (Type, Docs, Used in, Repeats) and, for a detachable type, Detach.
  const kind = nodeKind(name);
  const slug = kind === "zen" || kind === "primitive" ? componentSlug(name) : null;
  const docsPage = slug && slug in pageLabels && slug !== currentPage ? (slug as PlatformPage) : null;
  const where = `${fileName(file)}:${line}`;
  const showInCode = () => {
    studioStore.setState({ inspectorTab: "code" });
    // The Design panel unmounts: move focus to the Code tab instead of letting it fall to <body>.
    requestAnimationFrame(() => document.getElementById("studio-inspector-tab-code")?.focus());
  };
  const openDocs = (event: MouseEvent<HTMLAnchorElement>) => {
    // ⌘/Ctrl/Shift-click and middle-click keep the browser's own behaviour (a new tab or window).
    if (!docsPage || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(docsPage);
  };
  // Detach: only for a type the dev server can detach, as an admin, while the server is writable or still connecting.
  const detachOffered = detachShown(element, selection) && role === "admin" && canEdit() && (server.writable || !server.ready);
  const repeats = instances > 1 ? `${editable ? `${instances}× — edits apply to all ${instances}` : `${instances}×`}${detachOffered && rowDetach ? " · Detach changes only this row" : ""}` : null;
  // Reset all overrides (GĐ4 M1): a Zen instance's design props written as fixed values go back to their defaults in one
  // request, so one ⌘Z brings them all back; the content stays (resetAll.ts).
  const resetSpecs = specs.map((spec) => ({ name: spec.name, editor: spec.editor.kind }));
  const resetNames = element && kind === "zen" && editable ? resetAllProps(element.attributes, resetSpecs, requiredProps(name)) : [];
  // Its nested instances' design props too (GĐ4 M3), for those written inside it in this file; one written elsewhere (a
  // const, a helper, another file) is shared code and stays.
  const nestedResets = element && kind === "zen" && editable ? nested.items.flatMap((item) => {
    const source = nested.sourceOf(item);
    if (item.elsewhere || item.file !== element.file || !source) return [];
    const names = resetAllProps(source.attributes, item.specs.map((spec) => ({ name: spec.name, editor: spec.editor.kind })), requiredProps(item.name));
    return names.length ? [{ item, source, names }] : [];
  }) : [];
  const nestedCount = nestedResets.reduce((count, entry) => count + entry.names.length, 0);
  const resetAll = () => {
    if (!element || !(resetNames.length || nestedResets.length)) return;
    if (nestedResets.length) {
      // One request for the instance and its nested instances (op many, each its own removals): one ⌘Z for all.
      const removals = (component: string, attributes: SourceAttr[], names: string[], props?: Record<string, unknown>) => {
        const ops = names.flatMap((prop) => planPropReset(component, attributes, prop, props).ops).filter((op) => op.op === "removeProp");
        return ops.filter((op, index, all) => all.findIndex((other) => JSON.stringify(other) === JSON.stringify(op)) === index);
      };
      const opsByLoc: Record<string, EditOp[]> = {};
      const own = removals(element.name, element.attributes, resetNames, live);
      if (own.length) opsByLoc[element.loc] = own;
      for (const entry of nestedResets) {
        const ops = removals(entry.item.name, entry.source.attributes, entry.names, entry.item.hit.props);
        if (ops.length) opsByLoc[entry.source.loc] = ops;
      }
      const optimistic = Object.fromEntries(resetNames.map((prop): [string, PropValue] => [prop, { state: "unset" }]));
      void api.apply([{ op: "many", action: "setProps", locs: Object.keys(opsByLoc), opsByLoc }], `${element.name} reset all overrides (with ${plural(nestedResets.length, "nested instance")})`, optimistic);
      return;
    }
    const planFor = (attributes: SourceAttr[]): WritePlan => {
      const plans = resetAllProps(attributes, resetSpecs, requiredProps(element.name)).map((prop) => planPropReset(element.name, attributes, prop, live));
      const ops = plans.flatMap((plan) => plan.ops).filter((op, index, all) => all.findIndex((other) => JSON.stringify(other) === JSON.stringify(op)) === index);
      return { ops, note: plans.find((plan) => plan.note)?.note };
    };
    const optimistic = Object.fromEntries(resetNames.map((prop): [string, PropValue] => [prop, { state: "unset" }]));
    void runPlan(planFor(element.attributes), `${element.name} reset all overrides`, optimistic, (attributes) => planFor(attributes).ops);
  };

  return (
    // Scale fields measure their tokens on the selected element (density, breakpoint and mode applied).
    <InspectorHostContext value={sourceHost(selection)}>
    <InspectorFileContext value={element?.file ?? parsed?.file ?? null}>
    <div ref={panelRef} className="studio-inspector__panel">
      {/* Header (Design panel UI3, user 2026-10-06): the name with its count and the Detach / Remove icons on one row, then
          the kind with its Docs link, then where it is written. Every line in Body/Small. */}
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" data-component={isComponent || undefined} aria-hidden="true"><Icon name={isComponent ? "icon-cube-line" : "icon-code-02-line"} size={16} /></span>
          {/* Cut to one line: its full name on hover. */}
          <Heading level={2} textStyle="Body/Small/Bold" truncate title={name}>{name}</Heading>
          {repeats ? (
            <span className={`studio-inspector__count ${typographyStyles["Body/Small/Medium"]}`} title={repeats}>
              <span aria-hidden="true">{`×${instances}`}</span>
              <VisuallyHidden>{`, ${repeats}`}</VisuallyHidden>
            </span>
          ) : null}
          <span className="studio-inspector__head-actions">
            {resetNames.length || nestedCount ? (
              <IconButton
                icon="icon-reverse-left-line"
                appearance="flat"
                level="primary"
                size="xs"
                aria-label="Reset all overrides"
                tooltip={`Reset all overrides · ${plural(resetNames.length + nestedCount, "property", "properties")} back to default${nestedCount ? ` (${nestedCount} in nested instances)` : ""} · ${undoShortcut} to undo`}
                className="studio-inspector__head-action"
                onClick={resetAll}
              />
            ) : null}
            {kind === "zen" && editable && element ? (
              <IconButton
                icon="icon-switch-horizontal-01-line"
                appearance="flat"
                level="primary"
                size="xs"
                aria-label="Swap instance"
                tooltip="Swap instance · another component in this layer's place"
                className="studio-inspector__head-action"
                onClick={() => openQuickInsert("swap")}
              />
            ) : null}
            {detachOffered ? <DetachAction compact selection={selection} availability={detach} connecting={!server.ready} row={rowDetach} /> : null}
            <RemoveAction compact selection={selection} element={element} editable={editable} />
          </span>
        </div>
        <p className={`studio-inspector__meta-row ${typographyStyles["Body/Small/Regular"]}`}>
          <span>{kindLabel(kind)}</span>
          {docsPage ? (
            <>
              <span aria-hidden="true">·</span>
              <Link href={pageHref(docsPage)} className="studio-inspector__head-link" onClick={openDocs}>{`${pageLabels[docsPage]} docs`}</Link>
            </>
          ) : null}
        </p>
        {parsed ? (
          <div className="studio-inspector__src-row">
            {/* zen-allow-compact-button: a file:line reference in the header of a dense tool panel; sm outweighs the node name */}
            <Button
              appearance="flat"
              level="primary"
              size="xs"
              startIcon="icon-file-code-line"
              className="studio-inspector__src"
              aria-label={`Show ${where} in the Code tab`}
              onClick={showInCode}
            >
              {/* A long file name truncates; ":<line>" always stays visible. */}
              <span className="studio-inspector__src-file">{fileName(file)}</span>
              <span className="studio-inspector__src-line">{`:${line}`}</span>
            </Button>
            <IconButton icon="icon-copy-line" aria-label="Copy source location" appearance="flat" level="primary" size="xs" onClick={() => copyText(`${file}:${line}`, "the source location")} />
          </div>
        ) : null}
      </header>

      {textFirst ? textSection : null}

      {selection.panelId ? (
        <div hidden={!controlsFilled}>
          <InspectorSection title="Playground properties">
            <SlotHost node={controlsSlot} className="studio-inspector__slot" />
          </InspectorSection>
        </div>
      ) : null}

      {element === undefined ? <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>Reading the source…</p> : null}
      {element === null ? (
        <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>
          {server.ready && !server.writable ? "The source is available on the Studio dev server only." : `${fileName(file)}:${line} has no element there any more — select it again.`}
        </p>
      ) : null}

      {/* Figma UI3 order: Position (Ignore auto layout, constraints), then Layout, then Properties. */}
      {element ? <PositionSection selection={selection} element={element} api={api} component={name} /> : null}

      {/* Layout components: Layout directly under the header (after Playground properties), before Properties. */}
      {layoutSection}

      {element && appearanceSpecs.length ? <AppearanceSection api={api} specs={appearanceSpecs} component={name} host={sourceHost(selection)} /> : null}
      {element && name === "Box" ? <EffectsSection api={api} src={selection.src} /> : null}
      {element && (name === "Card" || name === "MetricCard" || name === "ChartCard") ? <CardEffectsSection api={api} component={name} /> : null}

      {element && propertySpecs.length && groups ? (
        <GroupedProperties groups={groups} selection={selection} element={element} api={api} specs={propertySpecs} shaped={shapedProps} note={propertiesNote} rendered={renderedProps} nested={nested} />
      ) : element && propertySpecs.length ? (
        // Properties in titled groups with a divider between them (autoGroups.ts), then one section per object or array
        // prop (Trend, items), titled with its name; an object's fields need no header of their own there.
        <>
          {autoGroups(propertySpecs.filter((spec) => !shapedNames.has(spec.name))).map((group, index) => (
            <InspectorSection key={group.id} title={group.title} note={index === 0 ? propertiesNote : undefined}>
              {group.specs.map((spec) => <Field key={spec.name} spec={spec} api={api} component={name} label={labelInGroup(propLabel(spec.name, name), group)} />)}
            </InspectorSection>
          ))}
          {shapedProps.map((entry) => (
            <InspectorSection key={entry.spec.name} title={propLabel(entry.spec.name, name)}>
              <ObjectProperties component={name} props={[entry]} api={api} selection={selection} only={entry.shape.type === "object" ? { prop: entry.spec.name } : undefined} />
            </InspectorSection>
          ))}
        </>
      ) : null}

      {/* Figma nested instances: the booleans of the Zen components written in this element's props. */}
      {element && !groups ? <NestedProperties element={element} api={api} nested={nested} /> : null}

      {/* Content slots (Children for Stack/Grid/Box): nothing for a component without slots. */}
      {element ? <SlotsSection api={api} selection={selection} element={element} /> : null}

      {textFirst ? null : textSection}

      {element && (texts.length || expressions.length || childElements.length) ? (
        <InspectorSection title="Content">
          {texts.map((child, position) => (
            <InspectorRow key={child.index} label={texts.length > 1 ? `Text ${position + 1}` : "Text"}>
              <TextControl
                label={texts.length > 1 ? `Text ${position + 1}` : "Text"}
                value={child.value.trim()}
                fallback={undefined}
                disabled={api.disabled}
                multiline={child.value.trim().length > 48 || child.value.trim().includes("\n")}
                autoFocusToken={child.index === firstText ? focusToken : 0}
                onSet={(next) => send([{ op: "setText", index: child.index, value: String(next) }], `${name} text → ${display(String(next))}`, {})}
              />
            </InspectorRow>
          ))}
          {expressions.map((child, index) => <InspectorRow key={`expression-${index}`} label="Value"><BoundValue expression={child.raw.replace(/^\{|\}$/g, "")} /></InspectorRow>)}
          {childElements.length ? (
            <ul aria-label="Child elements" className="studio-inspector__items">
              {childElements.map((child) => (
                <InspectorItem
                  key={child.loc}
                  icon={<Icon name={/^[A-Z]/.test(child.name) ? "icon-cube-line" : "icon-code-02-line"} size={16} />}
                  component={/^[A-Z]/.test(child.name)}
                  name={child.name}
                  meta={`Line ${child.loc.split(":")[0]}`}
                  onClick={() => selectChild(selection, `${element.file}:${child.loc}`)}
                />
              ))}
            </ul>
          ) : null}
        </InspectorSection>
      ) : null}

      {element && otherAttributes.length ? (
        <InspectorSection title={documented.size ? "Other attributes" : "Attributes"}>
          {/* HTML and undocumented attributes keep their written names (href, aria-label). */}
          {otherAttributes.map((attr) => <Field key={attr.name} spec={attributeSpec(attr)} api={api} label={attr.name} />)}
        </InspectorSection>
      ) : null}
    </div>
    </InspectorFileContext>
    </InspectorHostContext>
  );
}
