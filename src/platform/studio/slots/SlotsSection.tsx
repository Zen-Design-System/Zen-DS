import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { plural } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import type { FieldApi } from "../inspector/fieldApi";
import { focusFrame, frameLabel } from "../inspector/frames";
import { InspectorSection } from "../inspector/Section";
import { inspectorStatus } from "../inspector/status";
import { useStudioDrafts } from "../sourceDrafts";
import { useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import {
  canStructurallyEdit, clearCaption, clearSlot, inPlayground, locateLayer, moveSlotLayer, removeSlotLayer, resetCaption, resetSlot, selectSlotLayer, slotActionsOf,
  useSlotFocusRequest, useSlotRunning, useSlotServer,
} from "./actions";
import { onlyFrame, shortCode, slotContentOf, type SlotLayer } from "./content";
import { DataSlotBlock } from "./DataSlotBlock";
import { dataSlotsOf } from "./dataSlots";
import { slotShowsPlaceholder } from "./dom";
import { InsertPicker } from "./InsertPicker";
import { contentSummaryOf, hostPropsOf, inactiveCondition, isLayoutPrimitive, isSlotActive, slotsOf, type ContentSlot, type HostProps, type SlotCondition } from "./registry";
import "./slots.css";

/*
 * The inspector's Slots section (spec "Client"): one block per content slot of the selected component (Figma's slot
 * properties), mounted by the Design panel after Properties. A block names the slot, says what it holds ("Empty",
 * "3 layers", "Stack · 3 layers") and offers "Add to {Slot}" (the insert picker); its layers are rows that select
 * them, each with "Remove {Name}" and, among its siblings, "Move {Name} up / down" (shown on hover or focus: the
 * inspector's reorder, spec "Keys"). A slot that differs from the saved file carries Figma's "Modified" tag, and "More
 * actions for {Slot}" offers Reset slot (back to the saved file) and Clear contents (Figma's "Delete contents"), each
 * disabled with its reason in a visible caption. Content the source computes (a `.map`, a condition, a variable) shows
 * read-only with why. In a playground the slots are the main component's: empty, with the way to the examples
 * (whatever docs code fills them). Layout primitives (Stack, Grid, Box) show the same block titled "Children". Overlay
 * content, which the canvas cannot pick, is reached, removed and reordered from these rows.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/* ───────────── Captions ───────────── */

const sentence = (values: readonly (string | number | boolean)[]) => {
  const names = values.map(String);
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
};

/** "Shows with layout 1-3, half-half or 3-4" / "Hidden while type is action". */
function conditionText(condition: SlotCondition): string {
  if (condition.is) return `Shows with ${condition.prop} ${sentence(condition.is)}`;
  if (condition.not) return `Hidden while ${condition.prop} is ${sentence(condition.not)}`;
  return `Shows when ${condition.prop} is set`;
}

/** How many layers the slot's only layout frame holds (GET /element of that frame), null until read. */
function useFrameLayers(file: string, loc: string | null, hash: string): number | null {
  const [read, setRead] = useState<{ key: string; count: number } | null>(null);
  const key = loc ? `${file}:${loc}:${hash}` : "";
  useEffect(() => {
    if (!loc) return undefined;
    let alive = true;
    void studioApi.element(file, loc).then((frame) => {
      if (alive && frame) setRead({ key, count: contentSummaryOf(frame.children).count });
    });
    return () => { alive = false; };
    // The key covers the file, the frame's location and the file's hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return read && read.key === key ? read.count : null;
}

/** Selects and zooms to the page's first example frame. */
function showExamples(page: Parameters<typeof frameLabel>[1]) {
  const frame = canvasApi.getWorldElement()?.querySelector<HTMLElement>('[data-studio-frame^="example:"]');
  const id = frame?.getAttribute("data-studio-frame");
  if (!frame || !id) {
    inspectorStatus.set("neutral", "This page has no examples on the canvas");
    return;
  }
  focusFrame({ id, label: frameLabel(id, page), kind: "Example", width: frame.offsetWidth, element: frame });
}

/* ───────────── Rows ───────────── */

type Move = "prev" | "next";

type LayerItemProps = {
  name: string;
  /** Its source (`file:line:col`): the row's key for focus after a move. */
  src: string;
  meta?: string;
  /** Why it is read-only (a `.map` row): a caption under the row. */
  reason?: string;
  onSelect: () => void;
  /** Move up / down among its siblings (offered for a sibling only), and which way it can go. */
  move?: { prev: boolean; next: boolean; onMove: (to: Move) => void };
  onRemove?: () => void;
  /** Another slot edit runs. */
  busy: boolean;
};

/** A layer row (InspectorItem's look; InspectorItem has no trailing actions yet): select it, move or remove it. */
function LayerItem({ name, src, meta, reason, onSelect, move, onRemove, busy }: LayerItemProps) {
  const component = /^[A-Z]/.test(name);
  const reasonId = useId();
  return (
    <li className="studio-inspector__item-wrap studio-slots__item-wrap" data-layer-src={src} data-reason={reason ? true : undefined}>
      <button type="button" className="studio-inspector__item" data-component={component || undefined} aria-describedby={reason ? reasonId : undefined} onClick={onSelect}>
        <span className="studio-inspector__item-icon" aria-hidden="true"><Icon name={component ? "icon-cube-line" : "icon-code-02-line"} size={16} /></span>
        <span className={`studio-inspector__item-name ${typographyStyles["Body/Small/Medium"]}`}>{name}</span>
        {meta ? <span className={`studio-inspector__item-meta ${typographyStyles["Body/Small/Regular"]}`}>{meta}</span> : null}
      </button>
      {move ? (
        <span className="studio-slots__moves">
          <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-up-line" aria-label={`Move ${name} up`} data-move="prev" disabled={busy || !move.prev} onClick={() => move.onMove("prev")} />
          <IconButton appearance="flat" level="primary" size="xs" icon="icon-arrow-down-line" aria-label={`Move ${name} down`} data-move="next" disabled={busy || !move.next} onClick={() => move.onMove("next")} />
        </span>
      ) : null}
      {onRemove ? <IconButton appearance="flat" level="primary" size="xs" icon="icon-trash-line" aria-label={`Remove ${name}`} disabled={busy} onClick={onRemove} /> : null}
      {reason ? <span id={reasonId} className={`studio-slots__item-reason ${typographyStyles["Body/Small/Regular"]}`}>{reason}</span> : null}
    </li>
  );
}

/** A layer the inspector shows but cannot select or remove (text, content the source computes). */
function StaticItem({ icon, value, reason }: { icon: "icon-type-01-line" | "icon-code-02-line" | "icon-cube-line"; value: string; reason?: string }) {
  return (
    <li className="studio-slots__static">
      <span className="studio-slots__static-icon" aria-hidden="true"><Icon name={icon} size={16} /></span>
      <span className={`studio-slots__static-value ${typographyStyles["Body/Small/Regular"]}`} title={value}>{value}</span>
      {reason ? <span className={`studio-slots__static-reason ${typographyStyles["Body/Small/Regular"]}`}>{reason}</span> : null}
    </li>
  );
}

const lineOf = (loc: string) => `Line ${loc.split(":")[0]}`;

type BlockProps = {
  selection: NodeSelection;
  element: SourceElement;
  slot: ContentSlot;
  hostProps: HostProps;
  /** Show the slot's own name (not for a layout primitive's single "Children" block: the section says it). */
  titled: boolean;
  /** Add and Remove offered (admin, writable, example or template content). */
  editable: boolean;
  playground: boolean;
  /** The running slot edit ("Removing…"), else null. */
  running: string | null;
  focused: boolean;
};

function SlotBlock({ selection, element, slot, hostProps, titled, editable, playground, running, focused }: BlockProps) {
  const busy = running !== null;
  const content = useMemo(() => slotContentOf(element, slot), [element, slot]);
  // Without a draft the server sends no Modified flags: the drafts list tells "matches the saved file" (read again when it changes).
  const drafts = useStudioDrafts();
  const actions = useMemo(
    () => slotActionsOf(element, slot, content),
    // The drafts list is read inside slotActionsOf; its revision changes with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element, slot, content, drafts.revision],
  );
  const active = isSlotActive(slot, hostProps);
  const frame = onlyFrame(content);
  const frameLayers = useFrameLayers(element.file, frame?.loc ?? null, element.hash);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const canAdd = editable && active && !content.insertBlock;

  // A prop slot's elements the server does not locate yet: found on the canvas below the attribute (display aid).
  const attrLine = element.attributes.find((attr) => attr.name === slot.prop)?.line ?? element.startLine;
  const located = useMemo(() => {
    const used = new Set<string>();
    return content.layers.map((layer) => {
      if (layer.kind !== "element") return null;
      if (layer.loc) return `${element.file}:${layer.loc}`;
      const src = locateLayer(selection, element, layer.name, attrLine, used);
      if (src) used.add(src);
      return src;
    });
    // The canvas is read again whenever the source (its hash) or the selected instance changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, element.hash, selection.src, selection.instance, attrLine]);

  // A Layers slot row asked for this slot: bring it into view and focus its add button.
  useEffect(() => {
    if (!focused) return undefined;
    const block = blockRef.current;
    if (!block) return undefined;
    block.scrollIntoView({ block: "nearest" });
    block.querySelector<HTMLButtonElement>(".studio-slots__add button:not(:disabled)")?.focus({ preventScroll: true });
    block.dataset.flash = "true";
    const timer = window.setTimeout(() => { delete block.dataset.flash; }, 1200);
    return () => window.clearTimeout(timer);
  }, [focused]);

  // After a move from a row: the moved row's button takes the focus back once the new source renders the rows.
  const refocus = useRef<{ src: string; to: Move; until: number } | null>(null);
  const restoreFocus = useCallback(() => {
    const wanted = refocus.current;
    const block = blockRef.current;
    if (!wanted || !block) return;
    if (performance.now() > wanted.until) { refocus.current = null; return; }
    const row = block.querySelector<HTMLElement>(`[data-layer-src="${CSS.escape(wanted.src)}"]`);
    if (!row) return;
    refocus.current = null;
    (row.querySelector<HTMLButtonElement>(`[data-move="${wanted.to}"]:not(:disabled)`) ?? row.querySelector<HTMLButtonElement>(".studio-inspector__item"))?.focus({ preventScroll: true });
  }, []);
  useEffect(restoreFocus, [content, restoreFocus]);
  const moveLayer = (layer: { name: string; src: string }, to: Move) => {
    void moveSlotLayer(selection, layer, to).then((src) => {
      if (!src) return;
      refocus.current = { src, to, until: performance.now() + 4000 };
      restoreFocus();
    });
  };

  // A playground's slot shows the docs' empty marker, whatever code fills it (a variable, a condition): it is empty in
  // the component, and that code is docs scaffolding, not layers.
  const placeholder = useMemo(
    () => playground && (content.placeholder || slotShowsPlaceholder(selection, slot)),
    // The canvas is read again whenever the source (its hash) or the selected instance changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playground, content, slot, element.hash, selection.src, selection.instance],
  );
  const empty = content.layers.length === 0;
  const condition = active ? null : inactiveCondition(slot, hostProps);
  const caption = playground
    ? (empty || placeholder ? "Empty in the component · add content in an example" : `${plural(content.layers.length, "layer")} · set by the playground`)
    : !active ? "Hidden"
      : empty ? "Empty"
        : frame ? (frameLayers === null ? frame.name : `${frame.name} · ${plural(frameLayers, "layer")}`)
          : plural(content.layers.length, "layer");

  // More actions (Figma's slot menu): an admin's, in example and template content. While another edit runs, the first
  // item says so. The menu gives focus back to its trigger; after the write it is focused again if the panel lost it.
  const more = editable && !playground;
  const refocusMore = () => requestAnimationFrame(() => {
    const current = document.activeElement;
    if (!current || current === document.body) blockRef.current?.querySelector<HTMLButtonElement>("[data-slot-more]")?.focus({ preventScroll: true });
  });
  const resetOff = running ?? actions.resetBlock;
  const clearOff = running ? null : actions.clearBlock;
  const moreItems: MenuEntry[] = [
    {
      id: "slot-reset",
      label: "Reset slot",
      icon: "icon-reverse-left-line",
      disabled: resetOff !== null,
      caption: resetOff ?? resetCaption,
      onSelect: () => { void resetSlot(selection, slot).then(refocusMore); },
    },
    { type: "separator", id: "slot-more-separator" },
    {
      id: "slot-clear",
      label: "Clear contents",
      icon: "icon-trash-line",
      danger: true,
      disabled: busy || clearOff !== null,
      // Counted as the block's caption counts: "Removes Stack and its 3 layers" for one layout frame.
      caption: clearOff ?? (busy ? undefined : clearCaption(content, frameLayers)),
      onSelect: () => { void clearSlot(selection, slot).then(refocusMore); },
    },
  ];

  const row = (layer: SlotLayer, index: number) => {
    if (layer.kind === "text") return <StaticItem key={`t${index}`} icon="icon-type-01-line" value={`“${shortCode(layer.value, 48)}”`} />;
    if (layer.kind === "expression") return <StaticItem key={`x${index}`} icon="icon-code-02-line" value={`{${shortCode(layer.code, 40)}}`} reason={layer.reason} />;
    const src = located[index];
    if (!src) return <StaticItem key={`e${index}`} icon="icon-cube-line" value={layer.name} reason="Not on the canvas right now" />;
    const meta = layer.via === "map" ? "Each row" : layer.via === "and" || layer.via === "ternary" ? "On a condition" : layer.loc ? lineOf(layer.loc) : undefined;
    const writable = editable && !playground;
    const target = { name: layer.name, src };
    return (
      <LayerItem
        key={src}
        name={layer.name}
        src={src}
        meta={meta}
        reason={layer.removable ? undefined : layer.reason}
        onSelect={() => selectSlotLayer(selection, src, layer.name)}
        move={writable && layer.sibling ? { prev: layer.sibling.index > 0, next: layer.sibling.index < layer.sibling.count - 1, onMove: (to) => moveLayer(target, to) } : undefined}
        onRemove={writable && layer.removable ? () => { void removeSlotLayer(selection, target); } : undefined}
        busy={busy}
      />
    );
  };

  return (
    <div ref={blockRef} className="studio-slots__slot" data-slot={slot.prop} data-empty={empty || undefined}>
      <div className="studio-slots__head">
        <span className="studio-slots__icon" aria-hidden="true"><Icon name="icon-grid-dots-blank-line" size={16} /></span>
        {titled ? <span className={`studio-slots__name ${typographyStyles["Body/Small/Medium"]}`}>{slot.name}</span> : null}
        {actions.tagged && !playground ? <Badge size="xs" theme="yellow" background="subtle" className="studio-slots__modified">Modified</Badge> : null}
        <span className={`studio-slots__caption ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span>
        {canAdd && !playground ? (
          <div ref={anchorRef} className="studio-slots__add">
            {/* zen-allow-filter-button: the slot's "Add instances" picker (it inserts a component), not a filter or sort control */}
            {/* zen-allow-accent: the add-to-slot button matches the canvas chip, accent so it stands out (user, 2026-10-04) */}
            <IconButton
              appearance="flat"
              level="accent"
              size="xs"
              icon="icon-plus-line"
              aria-label={`Add to ${slot.name}`}
              aria-haspopup="listbox"
              aria-expanded={open}
              disabled={busy}
              onClick={() => setOpen((current) => !current)}
            />
            <InsertPicker
              open={open}
              onOpenChange={setOpen}
              anchorRef={anchorRef}
              selection={selection}
              element={element}
              slot={slot}
              onPicked={() => anchorRef.current?.querySelector<HTMLButtonElement>("button")?.focus()}
            />
          </div>
        ) : null}
        {more ? (
          <Menu
            align="end"
            items={moreItems}
            trigger={<IconButton appearance="flat" level="primary" size="xs" icon="icon-dots-horizontal-line" aria-label={`More actions for ${slot.name}`} data-slot-more="" />}
          />
        ) : null}
      </div>
      {condition ? <p className={`studio-slots__note ${typographyStyles["Body/Small/Regular"]}`}>{conditionText(condition)}</p> : null}
      {editable && active && content.insertBlock ? <p className={`studio-slots__note ${typographyStyles["Body/Small/Regular"]}`}>{content.insertBlock}</p> : null}
      {content.layers.length && !placeholder ? (
        <ul aria-label={`${slot.name} layers`} className="studio-inspector__items">
          {content.layers.map(row)}
        </ul>
      ) : null}
    </div>
  );
}

/* ───────────── The section ───────────── */

export type SlotsSectionProps = { api: FieldApi; selection: NodeSelection; element: SourceElement };

/** The Slots section of the Design panel; nothing for a component without content slots. */
export function SlotsSection({ api, selection, element }: SlotsSectionProps) {
  const page = useStudio((state) => state.page);
  // Before canStructurallyEdit: it reads the server state this keeps.
  useSlotServer();
  const running = useSlotRunning();
  const request = useSlotFocusRequest();
  const hostProps = useMemo(() => hostPropsOf(element.attributes), [element.attributes]);
  const slots = slotsOf(element.name);
  // Data slots (TopNavigation's Top-Trailing): Figma slots whose items the code takes as objects (dataSlots.ts).
  const dataSlots = dataSlotsOf(element.name);
  if (!slots.length && !dataSlots.length) return null;
  const layout = isLayoutPrimitive(element.name);
  const playground = inPlayground(selection);
  const check = canStructurallyEdit(selection);
  const editable = !api.disabled && check.ok;
  // An admin outside example content (docs, code shared by several pages) learns why nothing can be added.
  const note = !api.disabled && !playground && !check.ok && check.kind === "scope" ? check.reason : undefined;
  const focusedProp = request && request.src === selection.src && Date.now() - request.at < 2000 ? request.prop : null;
  return (
    <InspectorSection title={layout ? "Children" : "Slots"} note={note}>
      <div className="studio-slots__slots">
        {slots.map((slot) => (
          <SlotBlock
            key={slot.prop}
            selection={selection}
            element={element}
            slot={slot}
            hostProps={hostProps}
            titled={!layout}
            editable={editable}
            playground={playground}
            running={running}
            focused={focusedProp === slot.prop}
          />
        ))}
        {dataSlots.map((slot) => (
          <DataSlotBlock key={slot.prop} selection={selection} element={element} slot={slot} editable={editable} playground={playground} running={running} />
        ))}
      </div>
      {playground && !layout ? (
        <Button appearance="flat" level="primary" size="sm" startIcon="icon-layout-alt-01-line" className="studio-slots__examples" onClick={() => showExamples(page)}>
          Show examples
        </Button>
      ) : null}
    </InspectorSection>
  );
}
