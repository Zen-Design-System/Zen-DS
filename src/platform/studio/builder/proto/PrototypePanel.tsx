import { presentKeys } from "../../shell/modKey";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button, IconButton } from "../../../../components/Button";
import { Icon } from "../../../../components/Icon";
import { Menu } from "../../../../components/Menu";
import { Segmented } from "../../../../components/Segmented";
import { Text } from "../../../../components/Text";
import { Toggle } from "../../../../components/Toggle";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { parseSrc } from "../../api";
import { zoomToFrame } from "../../board/presentFrame";
import { InspectorFields, InspectorRow, InspectorSection } from "../../inspector/Section";
import { RowInputField, RowSelectField } from "../../inspector/rowFields";
import { canEdit, studioStore, useStudio } from "../../store";
import type { PageNode, PageTree, PageValue } from "../render/renderPage";
import { pageFile, usePage } from "../store/pageStore";
import { usePageTree } from "../usePageTree";
import { addFrame as addBoardFrame } from "./addFrame";
import { playStartOf, startPlay } from "./playStart";
import { defaultTarget, writeAction, writeItemTargets, writeProp, type ProtoLayer } from "./protoEdit";
import { selectedItem } from "./protoDom";
import {
  ACTIONS, actionsFor, ANIMATIONS, choiceItemsOf, columnsOf, DEFAULT_ANIMATION, DEFAULT_DELAY, DEFAULT_DIRECTION, DEFAULT_DURATION, DELAY_TRIGGER, filterOf, findNode, frameNodeOf, framesOf,
  HOVER_TRIGGER, isItemTrigger, layerNameOf, layersIn, literalOf, moves, openerOf, optionsOf, protoOf, stepOf, targetLayerOf, targetsByItem, triggerLabel,
  type ChoiceItem, type ProtoAction, type ProtoAnimation, type ProtoDirection, type ProtoDuration, type ProtoFilter, type ProtoFrame, type ProtoOptions, type ProtoStep,
} from "./protoModel";
import { anchorsItself, placesItself, protoSubject, takesText, type ProtoSubject } from "./protoTriggers";

/*
 * The Inspector's Prototype tab on a builder page (Studio builder GĐ2 M3, spec
 * docs/research/studio-builder-pages-spec-2026-10-06.md §3 2d; Figma's Prototype panel since 2026-10-15):
 * - Flow: the page's Screens and Overlays (a click selects the frame and brings it into view, ▷ plays from a Screen; the
 *   first Screen is where Play starts), Add screen, Add overlay, Present (from the selected Screen, or the selected
 *   Overlay over the Screen that opens it; else the start).
 * - Interactions of the selected layer: each trigger it takes (On click / On tap, On change, While hovering; a Screen's
 *   After delay) with an action (navigate to a Screen, open an Overlay, close, back, show a toast, open a link) and how
 *   it animates (Instant, Dissolve, Move in, Push, Slide in; direction, duration); the main trigger and every set one
 *   show, the others come from + (Add interaction). An action is written as the prop's `proto.*(…)` expression, so it is
 *   code like any other prop and ⌘Z undoes it. On the canvas the layer's ⊕ draws the same connection (ProtoLinks).
 * - Overlay: where an Overlay shows what it holds (Figma's overlay position; Manual: next to the layer that opens it),
 *   whether a press outside closes it and whether the screen dims behind it; a Dialog, Side Panel or Bottom Sheet places
 *   itself, a DatePicker or Popover opens next to the layer that opens it.
 * - Option C (user, 2026-10-23): Navigate to lists each Screen's states (Figma: every frame is a target); Filter table
 *   names the Table, its column and the value (none: what the trigger hands over); Change step goes Next or Previous on
 *   the Screen's Stepper.
 * - Scroll behavior of a selected frame (Stack, Grid, Box, Shape): Figma's Position when scrolling, written as `sticky`
 *   (spec docs/research/layout-sticky-spec-2026-10-23.md). The canvas draws it in place; Play and Present stick it.
 */

/** What Add overlay puts in the new Overlay: a component that places itself, or a Card the Overlay places. */
const OVERLAY_KINDS = [
  { id: "dialog", label: "Dialog", icon: "icon-browser-line" },
  { id: "sheet", label: "Bottom sheet", icon: "icon-layout-bottom-line" },
  { id: "panel", label: "Side panel", icon: "icon-layout-right-line" },
  { id: "card", label: "Card · you place it", icon: "icon-square-line" },
] as const;

export function PrototypePanel() {
  const localPage = useStudio((state) => state.localPage);
  const selection = useStudio((state) => state.selection);
  const editable = useStudio((state) => canEdit(state));
  const page = usePage(localPage);
  const tree = usePageTree(page?.text);
  const frames = useMemo(() => framesOf(tree), [tree]);
  if (!localPage || !page) return null;
  const file = pageFile(localPage);
  const src = selection?.kind === "node" ? parseSrc(selection.src) : null;
  // A selected frame is its Screen (After delay) or its Overlay (its settings).
  const frameNode = selection?.kind === "frame" ? frameNodeOf(tree, selection.frameId) : null;
  const subject = src && src.file === file ? protoSubject(tree, src.loc) : frameNode ? protoSubject(tree, frameNode.loc) : null;
  const overlayNode = subject?.node.name === "Overlay" ? subject.node : null;
  const selectedNode = src && src.file === file ? findNode(tree, src.loc) : null;
  const scrolls = selectedNode && STICKY_LAYERS.has(selectedNode.name) ? selectedNode : null;
  // An item of a choice control (a SidebarMenuItem) shows its control's interactions, that item marked.
  const via = subject?.item ? choiceItemsOf(subject.node).find((item) => item.value === subject.item)?.label ?? subject.item : null;
  const selectedFrame = selection?.kind === "frame" ? selection.frameId : selection?.kind === "node" ? selection.frameId : null;
  // Present starts from the selected Screen, or opens the selected Overlay over the Screen that opens it (Figma's).
  const playFrom = playStartOf(selectedFrame);
  const home = frames.find((frame) => frame.frameId === selectedFrame);
  const firstScreen = frames.find((frame) => frame.kind === "screen");

  return (
    <div className="studio-prototype" data-e2e="prototype-panel">
      <InspectorSection
        title="Flow"
        actions={<Button appearance="main" level="primary" size="sm" startIcon={<Icon name="icon-play-line" decorative />} aria-keyshortcuts={presentKeys} onClick={() => startPlay(playFrom)}>Present</Button>}
      >
        <ul className="studio-inspector__items studio-prototype__frames" aria-label="Screens and overlays">
          {frames.map((frame) => (
            <FlowRow key={frame.frameId} frame={frame} start={frame === firstScreen} current={frame.frameId === selectedFrame} />
          ))}
        </ul>
        <div className="studio-prototype__add">
          <Button appearance="main" level="tertiary" size="sm" disabled={!editable || !tree?.board} startIcon={<Icon name="icon-plus-line" decorative />} onClick={() => void addBoardFrame(localPage, "screen")}>Add screen</Button>
          <Menu
            trigger={<Button appearance="main" level="tertiary" size="sm" disabled={!editable || !tree?.board} startIcon={<Icon name="icon-plus-line" decorative />} endIcon={<Icon name="icon-chevron-down-line" decorative />}>Add overlay</Button>}
            items={OVERLAY_KINDS.map((kind) => ({ id: kind.id, label: kind.label, icon: kind.icon }))}
            onSelect={(item) => void addBoardFrame(localPage, "overlay", { holds: item.id as (typeof OVERLAY_KINDS)[number]["id"] })}
          />
        </div>
      </InspectorSection>
      {overlayNode ? (
        <OverlaySettings key={overlayNode.loc} node={overlayNode} file={file} disabled={!editable} />
      ) : subject ? (
        <Interactions key={subject.node.loc} subject={subject} tree={tree} layer={{ file, loc: subject.node.loc, name: subject.node.name }} via={via} frames={frames} home={home ?? null} disabled={!editable} />
      ) : (
        <InspectorSection title="Interactions">
          <Text tone="base" textStyle="Body/Small/Regular">Select a layer, then drag its ⊕ onto a screen.</Text>
        </InspectorSection>
      )}
      {scrolls ? <ScrollBehavior key={`scroll:${scrolls.loc}`} node={scrolls} file={file} disabled={!editable} /> : null}
    </div>
  );
}

/** A frame of the flow: the row selects it and brings it into view; ▷ plays from a Screen. */
function FlowRow({ frame, start, current }: { frame: ProtoFrame; start: boolean; current: boolean }) {
  const show = () => {
    studioStore.setState({ selection: { kind: "frame", frameId: frame.frameId } });
    const element = document.querySelector<HTMLElement>(`[data-studio-frame="${CSS.escape(frame.frameId)}"]`);
    if (element) zoomToFrame(element);
  };
  const meta = start ? "Start" : frame.state ?? (frame.kind === "overlay" ? "Overlay" : null);
  return (
    <li className="studio-inspector__item-wrap studio-prototype__frame" data-frame={frame.frameId}>
      <button type="button" className="studio-inspector__item" aria-current={current || undefined} onClick={show}>
        <span className="studio-inspector__item-icon" aria-hidden="true"><Icon name={frame.kind === "overlay" ? "icon-layers-three-01-line" : frame.device === "desktop" ? "icon-monitor-01-line" : "icon-mobile-line"} size="sm" decorative /></span>
        <span className={`studio-inspector__item-name ${typographyStyles["Body/Small/Medium"]}`}>{frame.title}</span>
        {meta ? <span className={`studio-inspector__item-meta ${typographyStyles["Body/Small/Regular"]}`}>{meta}</span> : null}
      </button>
      {frame.kind === "screen" ? (
        <IconButton className="studio-prototype__play" appearance="flat" level="primary" size="xs" icon="icon-play-line" aria-label={`Play from ${frame.title}`} tooltip="Play from here" onClick={() => startPlay(frame.id)} />
      ) : null}
    </li>
  );
}

/** The selected layer's interactions: the main trigger and every set one, the rest under + (Add interaction). `via`: the
 *  selected layer is this item of the control (its label, for the note). */
function Interactions({ subject, tree, layer, via, frames, home, disabled }: { subject: ProtoSubject; tree: PageTree | null; layer: ProtoLayer; via: string | null; frames: ProtoFrame[]; home: ProtoFrame | null; disabled: boolean }) {
  const { node, triggers, trigger: main } = subject;
  const [added, setAdded] = useState<string[]>([]);
  const shown = triggers.filter((trigger) => trigger === main || node.props[trigger] !== undefined || added.includes(trigger));
  const more = triggers.filter((trigger) => !shown.includes(trigger));
  const touch = Boolean(home && home.kind === "screen" && home.device !== "desktop");
  // A trigger picked from + opens its action list at once.
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    if (!opening) return;
    document.querySelector<HTMLElement>(`#studio-right [data-prop="proto:${CSS.escape(opening)}"] button`)?.click();
    setOpening(null);
  }, [opening]);

  const addMenu = more.length && !disabled ? (
    <Menu
      align="end"
      trigger={<IconButton appearance="flat" level="primary" size="xs" icon="icon-plus-line" aria-label="Add interaction" tooltip="Add interaction" />}
      items={more.map((trigger) => ({ id: trigger, label: triggerLabel(trigger, touch) }))}
      onSelect={(item) => { setAdded((list) => [...list, item.id]); setOpening(item.id); }}
    />
  ) : null;

  return (
    <InspectorSection title="Interactions" actions={addMenu} note={via ? `${via} · in ${node.name}` : undefined}>
      {shown.length ? shown.map((trigger) => (
        <TriggerRow key={trigger} trigger={trigger} label={triggerLabel(trigger, touch)} value={node.props[trigger]} items={isItemTrigger(node, trigger) ? choiceItemsOf(node) : []} tree={tree} layer={layer} frames={frames} home={home} disabled={disabled} onRemoved={() => setAdded((list) => list.filter((item) => item !== trigger))} />
      )) : <Text tone="base" textStyle="Body/Small/Regular">{`${node.name} takes no clicks.`}</Text>}
    </InspectorSection>
  );
}

/** "None" in an item's target list (a Select option needs a value). */
const NO_TARGET = "__none";

/** One trigger of the selected layer: its action and target, how it animates (After delay: how long first). A choice
 *  control's item trigger (a tab bar's On change) leads each item to its own Screen or Overlay: one row per item. */
function TriggerRow({ trigger, label, value, items, tree, layer, frames, home, disabled, onRemoved }: { trigger: string; label: string; value: PageValue | undefined; items: ChoiceItem[]; tree: PageTree | null; layer: ProtoLayer; frames: ProtoFrame[]; home: ProtoFrame | null; disabled: boolean; onRemoved: () => void }) {
  const proto = protoOf(value);
  const action: ProtoAction = proto?.action ?? "none";
  const arg = proto?.args[0];
  const argText = typeof arg === "string" ? arg : arg && typeof arg === "object" && "title" in arg ? String((arg as { title?: unknown }).title ?? "") : "";
  const options = proto ? optionsOf(action, proto.args) : {};
  const custom = value !== undefined && !proto;
  const [draft, setDraft] = useState(argText);
  useEffect(() => setDraft(argText), [argText]);
  const delayText = String(options.delay ?? DEFAULT_DELAY);
  const [delayDraft, setDelayDraft] = useState(delayText);
  useEffect(() => setDelayDraft(delayText), [delayText]);
  const picked = useSyncExternalStore(selectedItem.subscribe, selectedItem.get, selectedItem.get);
  const pickedItem = picked && picked.loc === layer.loc ? picked.item : null;
  const byItem = items.length > 0 && (action === "navigate" || action === "open");
  // Filter table on a layer that takes typed text (a Search) compares by "contains".
  const typed = takesText(layer.name);
  const targets = byItem ? targetsByItem(arg, items) ?? {} : {};
  const homeScreen = home?.kind === "screen" ? home.id : null;

  const write = (next: ProtoAction, target?: string) => {
    if (next === "none") {
      void writeAction(layer, trigger, "none");
      onRemoved();
      return;
    }
    if (next === "filter") { void writeAction(layer, trigger, "filter", { match: typed ? "contains" : undefined }); return; }
    // A new action keeps the animation (and the delay) it had.
    const kept: ProtoOptions = next === action ? options : { delay: options.delay, ...(next === "navigate" || next === "open" ? { animation: options.animation, direction: options.direction, duration: options.duration } : {}) };
    if (items.length && (next === "navigate" || next === "open") && target === undefined) {
      // Per item: the item selected on the canvas starts with a target, the others go nowhere until one is picked.
      const start = pickedItem ? { [pickedItem]: defaultTarget(next, frames, homeScreen) } : {};
      void writeItemTargets(layer, trigger, next, start, ACTIONS.find((entry) => entry.value === next)?.label ?? next, kept);
      return;
    }
    void writeAction(layer, trigger, next, target ?? defaultTarget(next, frames, homeScreen), kept);
  };
  const writeItem = (item: ChoiceItem, target: string) => {
    if (action !== "navigate" && action !== "open") return;
    const next = { ...targets, [item.value]: target === NO_TARGET ? undefined : target };
    void writeItemTargets(layer, trigger, action, next, `${item.label} → ${target === NO_TARGET ? "none" : frames.find((frame) => frame.id === target)?.title ?? target}`, options);
  };
  /** The same action with other options (animation, direction, duration, delay). */
  const writeOptions = (change: ProtoOptions, label: string) => {
    if (!proto || action === "none") return;
    const next = { ...options, ...change };
    if (byItem && (action === "navigate" || action === "open")) void writeItemTargets(layer, trigger, action, targets, label, next);
    else void writeAction(layer, trigger, action, typeof arg === "string" ? arg : argText, next, label);
  };

  // Every Screen and each of its states (a state's own frame, as Figma's), by the target Navigate to writes.
  const screens = frames.filter((frame) => frame.kind === "screen").map((frame) => ({ ...frame, id: frame.state ? `${frame.id}:${frame.state}` : frame.id, title: frame.state && !frame.title.includes(frame.state) ? `${frame.title} · ${frame.state}` : frame.title }));
  const overlays = frames.filter((frame) => frame.kind === "overlay");
  // An overlay that places itself (a Dialog…) animates itself too.
  const target = action === "open" && typeof arg === "string" ? frameNodeOf(tree, `overlay:${arg}`) : null;
  const targetChild = target?.children.find((child): child is PageNode => child.kind === "element") ?? null;
  const selfPlaced = Boolean(targetChild && placesItself(targetChild.name));
  const animates = trigger !== HOVER_TRIGGER && (action === "navigate" || (action === "open" && !selfPlaced));
  const set = value !== undefined;
  const remove = set && !disabled
    ? <IconButton appearance="flat" level="primary" size="xs" icon="icon-minus-line" aria-label={`Remove ${label}`} tooltip="Remove interaction" onClick={() => write("none")} />
    : null;
  return (
    <div className="studio-prototype__trigger" data-trigger={trigger}>
      <InspectorRow label={label} labelTitle={trigger} name={`proto:${trigger}`} action={remove}>
        <RowSelectField aria-label={`${label} action`} size="sm" disabled={disabled} value={custom ? "" : action} placeholder="Set in code" onValueChange={(next) => write(next as ProtoAction)} options={[...actionsFor(trigger)]} />
      </InspectorRow>
      {trigger === DELAY_TRIGGER && action !== "none" ? (
        <InspectorRow label="Delay (ms)" name={`proto:${trigger}:delay`}>
          <RowInputField
            aria-label="Delay in milliseconds"
            size="sm"
            inputMode="numeric"
            disabled={disabled}
            value={delayDraft}
            onChange={(event) => setDelayDraft(event.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => { if (delayDraft && delayDraft !== delayText) writeOptions({ delay: Number(delayDraft) }, `After delay ${delayDraft} ms`); }}
            onKeyDown={(event) => { if (event.key === "Enter" && delayDraft && delayDraft !== delayText) { event.preventDefault(); writeOptions({ delay: Number(delayDraft) }, `After delay ${delayDraft} ms`); } }}
          />
        </InspectorRow>
      ) : null}
      {byItem ? items.map((item) => (
        <div key={item.value} className="studio-prototype__item" data-current={item.value === pickedItem || undefined}>
          <InspectorRow label={item.label} name={`proto:${trigger}:item:${item.value}`}>
            <RowSelectField
              aria-label={`${item.label} ${action === "open" ? "overlay" : "screen"}`}
              size="sm"
              disabled={disabled}
              value={targets[item.value] ?? NO_TARGET}
              onValueChange={(next) => writeItem(item, next)}
              options={[{ value: NO_TARGET, label: "None" }, ...(action === "open" ? overlays : screens).map((frame) => ({ value: frame.id, label: frame.title }))]}
            />
          </InspectorRow>
        </div>
      )) : null}
      {action === "navigate" && !byItem ? (
        <InspectorRow label="Screen" name={`proto:${trigger}:target`}>
          <RowSelectField aria-label={`${label} screen`} size="sm" disabled={disabled} value={argText} placeholder="—" onValueChange={(next) => write("navigate", next)} options={screens.map((frame) => ({ value: frame.id, label: frame.title }))} />
        </InspectorRow>
      ) : null}
      {action === "open" && !byItem ? (
        <InspectorRow label="Overlay" name={`proto:${trigger}:target`}>
          <RowSelectField aria-label={`${label} overlay`} size="sm" disabled={disabled || !overlays.length} value={argText} placeholder={overlays.length ? "—" : "Add an overlay first"} onValueChange={(next) => write("open", next)} options={overlays.map((frame) => ({ value: frame.id, label: frame.title }))} />
        </InspectorRow>
      ) : null}
      {action === "toast" || action === "link" ? (
        <InspectorRow label={action === "toast" ? "Title" : "URL"} name={`proto:${trigger}:target`}>
          <RowInputField
            aria-label={`${label} ${action === "toast" ? "toast title" : "link"}`}
            size="sm"
            disabled={disabled}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => { if (draft !== argText) write(action, draft); }}
            onKeyDown={(event) => { if (event.key === "Enter" && draft !== argText) { event.preventDefault(); write(action, draft); } }}
          />
        </InspectorRow>
      ) : null}
      {action === "filter" && proto ? <FilterRows trigger={trigger} filter={filterOf(proto.args)} screen={screenFor(tree, home)} hands={items.length > 0 || typed || trigger === "onPopoverSelect"} typed={typed} layer={layer} disabled={disabled} /> : null}
      {action === "step" && proto ? <StepRows trigger={trigger} step={stepOf(proto.args)} screen={screenFor(tree, home)} layer={layer} disabled={disabled} /> : null}
      {animates ? <AnimationRows trigger={trigger} options={options} disabled={disabled} onChange={writeOptions} /> : null}
      {target && !selfPlaced ? <OverlayFields node={target} file={layer.file} disabled={disabled} /> : null}
      {custom ? <Text as="p" tone="base" textStyle="Caption/Regular" className="studio-prototype__note">Picking an action replaces the code.</Text> : null}
    </div>
  );
}

/** The Screen whose Table or Stepper a layer's Filter table or Change step drives: its own, or (in an Overlay) the one
 *  that opens the Overlay. */
function screenFor(tree: PageTree | null, home: ProtoFrame | null): PageNode | null {
  if (!home) return null;
  if (home.kind === "screen") return frameNodeOf(tree, home.frameId);
  const opener = openerOf(tree, home.id);
  return opener ? frameNodeOf(tree, `screen:${opener}`) : null;
}

/** The layers of `component` an action can name on `screen`: the first (by no name) and every other one with a name. */
function namedTargets(screen: PageNode | null, component: string): Array<{ value: string; label: string }> {
  const layers = screen ? layersIn(screen, component) : [];
  return layers.flatMap((node, index) => {
    const name = layerNameOf(node);
    if (index === 0) return [{ value: NO_TARGET, label: name ?? component }];
    return name ? [{ value: name, label: name }] : [];
  });
}

/** Filter table: which Table (when the Screen has more than one with a name), the column it reads and the value (none:
 *  what the trigger hands over: the chosen item, what is typed). */
function FilterRows({ trigger, filter, screen, hands, typed, layer, disabled }: { trigger: string; filter: ProtoFilter; screen: PageNode | null; hands: boolean; typed: boolean; layer: ProtoLayer; disabled: boolean }) {
  const tables = namedTargets(screen, "Table");
  const table = targetLayerOf(screen, "Table", filter.table);
  const columns = table ? columnsOf(table) : [];
  const valueText = filter.value ?? "";
  const [draft, setDraft] = useState(valueText);
  useEffect(() => setDraft(valueText), [valueText]);
  const write = (change: ProtoFilter, label: string) => void writeAction(layer, trigger, "filter", { ...filter, ...change }, undefined, label);
  if (!table) return <Text as="p" tone="base" textStyle="Caption/Regular" className="studio-prototype__note">Add a Table to this screen.</Text>;
  const commit = () => { if (draft !== valueText) write({ value: draft || undefined }, draft ? `Filter by ${draft}` : "Filter by the trigger"); };
  return (
    <>
      {tables.length > 1 ? (
        <InspectorRow label="Table" name={`proto:${trigger}:table`}>
          <RowSelectField aria-label="Table" size="sm" disabled={disabled} value={filter.table ?? NO_TARGET} onValueChange={(next) => write({ table: next === NO_TARGET ? undefined : next, column: undefined }, `Filter ${next === NO_TARGET ? tables[0].label : next}`)} options={tables} />
        </InspectorRow>
      ) : null}
      <InspectorRow label="Column" name={`proto:${trigger}:column`}>
        <RowSelectField aria-label="Column" size="sm" disabled={disabled} value={filter.column ?? NO_TARGET} onValueChange={(next) => write({ column: next === NO_TARGET ? undefined : next }, `Filter ${next === NO_TARGET ? "any column" : columns.find((entry) => entry.value === next)?.label ?? next}`)} options={[{ value: NO_TARGET, label: "Any column" }, ...columns]} />
      </InspectorRow>
      <InspectorRow label="Value" name={`proto:${trigger}:value`}>
        <RowInputField
          aria-label="Filter value"
          size="sm"
          disabled={disabled}
          placeholder={hands ? (typed ? "What's typed" : "The chosen item") : "Value"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }}
        />
      </InspectorRow>
    </>
  );
}

const STEPS: ReadonlyArray<{ id: ProtoStep; label: string }> = [{ id: "previous", label: "Previous" }, { id: "next", label: "Next" }];

/** Change step: Next or Previous, and which Stepper (when the Screen has more than one with a name). */
function StepRows({ trigger, step, screen, layer, disabled }: { trigger: string; step: { to: ProtoStep; stepper?: string }; screen: PageNode | null; layer: ProtoLayer; disabled: boolean }) {
  const steppers = namedTargets(screen, "Stepper");
  const write = (to: ProtoStep, stepper: string | undefined, label: string) => void writeAction(layer, trigger, "step", { to, stepper }, undefined, label);
  if (!steppers.length) return <Text as="p" tone="base" textStyle="Caption/Regular" className="studio-prototype__note">Add a Stepper to this screen.</Text>;
  return (
    <>
      <InspectorRow label="Step" name={`proto:${trigger}:step`}>
        <Segmented aria-label="Step" size="sm" fullWidth disabled={disabled} value={step.to} onValueChange={(next) => write(next as ProtoStep, step.stepper, `${next === "previous" ? "Previous" : "Next"} step`)} options={STEPS.map((entry) => ({ id: entry.id, label: entry.label }))} />
      </InspectorRow>
      {steppers.length > 1 ? (
        <InspectorRow label="Stepper" name={`proto:${trigger}:stepper`}>
          <RowSelectField aria-label="Stepper" size="sm" disabled={disabled} value={step.stepper ?? NO_TARGET} onValueChange={(next) => write(step.to, next === NO_TARGET ? undefined : next, `Change ${next === NO_TARGET ? steppers[0].label : next}`)} options={steppers} />
        </InspectorRow>
      ) : null}
    </>
  );
}

const DIRECTION_ICONS = { left: "icon-arrow-left-line", right: "icon-arrow-right-line", up: "icon-arrow-up-line", down: "icon-arrow-down-line" } as const;
const DURATION_LABELS: Readonly<Record<ProtoDuration, string>> = { fast: "Fast", base: "Base", slow: "Slow" };

/** Figma's Animation for a connection: the kind, which way it moves (an animation that moves), how long (Motion tokens). */
function AnimationRows({ trigger, options, disabled, onChange }: { trigger: string; options: ProtoOptions; disabled: boolean; onChange: (change: ProtoOptions, label: string) => void }) {
  const animation = options.animation ?? DEFAULT_ANIMATION;
  const direction = options.direction ?? DEFAULT_DIRECTION;
  const duration = options.duration ?? DEFAULT_DURATION;
  return (
    <>
      <InspectorRow label="Animation" name={`proto:${trigger}:animation`}>
        <RowSelectField aria-label="Animation" size="sm" disabled={disabled} value={animation} onValueChange={(next) => onChange({ animation: next as ProtoAnimation }, `Animation ${ANIMATIONS.find((entry) => entry.value === next)?.label ?? next}`)} options={[...ANIMATIONS]} />
      </InspectorRow>
      {moves(animation) ? (
        <InspectorRow label="Direction" name={`proto:${trigger}:direction`}>
          <Segmented
            aria-label="Direction"
            size="sm"
            fullWidth
            disabled={disabled}
            value={direction}
            onValueChange={(next) => onChange({ direction: next as ProtoDirection }, `Moves ${next}`)}
            options={(Object.keys(DIRECTION_ICONS) as ProtoDirection[]).map((id) => ({ id, label: "", leading: DIRECTION_ICONS[id], "aria-label": `Moves ${id}` }))}
          />
        </InspectorRow>
      ) : null}
      {animation !== "instant" ? (
        <InspectorRow label="Duration" name={`proto:${trigger}:duration`}>
          <RowSelectField aria-label="Duration" size="sm" disabled={disabled} value={duration} onValueChange={(next) => onChange({ duration: next as ProtoDuration }, `Duration ${DURATION_LABELS[next as ProtoDuration] ?? next}`)} options={(Object.keys(DURATION_LABELS) as ProtoDuration[]).map((id) => ({ value: id, label: DURATION_LABELS[id] }))} />
        </InspectorRow>
      ) : null}
    </>
  );
}

/** Figma's overlay positions; Center is the default (not written). Manual: next to the layer that opens it (Figma's, by
 *  its trigger; Play places it as a Zen Popover: below, at its start edge, above when there is no room). */
const POSITIONS = [
  { value: "center", label: "Center" },
  { value: "manual", label: "Manual" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

/** A selected Overlay frame's settings (a Dialog, Side Panel or Bottom Sheet places itself: one line says so). */
function OverlaySettings({ node, file, disabled }: { node: PageNode; file: string; disabled: boolean }) {
  const child = node.children.find((entry): entry is PageNode => entry.kind === "element");
  const selfPlaced = Boolean(child && placesItself(child.name));
  return (
    <InspectorSection title="Overlay" note={selfPlaced && child ? `${child.name} ${anchorsItself(child.name) ? "opens by its trigger" : "places itself"}` : undefined}>
      {selfPlaced ? null : <OverlayFields node={node} file={file} disabled={disabled} />}
    </InspectorSection>
  );
}

/** Where an Overlay shows its layer, whether a press outside closes it, whether the screen dims behind it (Overlay props,
 *  read by Play). */
function OverlayFields({ node, file, disabled }: { node: PageNode; file: string; disabled: boolean }) {
  const layer: ProtoLayer = { file, loc: node.loc, name: "Overlay" };
  const position = String(literalOf(node, "position") ?? "center");
  const closes = literalOf(node, "closeOnOutside") !== false;
  const background = literalOf(node, "background") === true;
  return (
    <div className="studio-prototype__overlay" data-overlay={String(literalOf(node, "id") ?? "")}>
      <InspectorRow label="Position" name="overlay:position">
        <RowSelectField aria-label="Overlay position" size="sm" disabled={disabled} value={position} onValueChange={(next) => void writeProp(layer, "position", next === "center" ? null : { kind: "string", value: next }, `Overlay at ${POSITIONS.find((entry) => entry.value === next)?.label ?? next}`)} options={POSITIONS} />
      </InspectorRow>
      <InspectorFields name="overlay:closeOnOutside" fields={[<Toggle key="close" label="Close on outside press" checked={closes} disabled={disabled} onCheckedChange={(next) => void writeProp(layer, "closeOnOutside", next ? null : { kind: "boolean", value: false }, next ? "Close on outside press" : "Stay open on outside press")} />]} />
      <InspectorFields name="overlay:background" fields={[<Toggle key="background" label="Dim the screen behind" checked={background} disabled={disabled} onCheckedChange={(next) => void writeProp(layer, "background", next ? { kind: "boolean", value: true } : null, next ? "Dim behind the overlay" : "No dim behind the overlay")} />]} />
    </div>
  );
}

/** The frames that take `sticky` (position.ts): Figma lets any frame or shape fix its position when scrolling. */
const STICKY_LAYERS = new Set(["Stack", "Grid", "Box", "Shape"]);
const STICKY_OPTIONS = [
  { value: "none", label: "Scroll with parent" },
  { value: "top", label: "Stick to top" },
  { value: "bottom", label: "Stick to bottom" },
];

/** Figma's Scroll behavior › Position: the layer scrolls with its parent, or sticks to the top or bottom of the page
 *  while it scrolls (`sticky`). */
function ScrollBehavior({ node, file, disabled }: { node: PageNode; file: string; disabled: boolean }) {
  const layer: ProtoLayer = { file, loc: node.loc, name: node.name };
  const written = literalOf(node, "sticky");
  const value = written === "top" || written === "bottom" ? written : "none";
  return (
    <InspectorSection title="Scroll behavior">
      <InspectorRow label="Position" name="scroll:sticky">
        <RowSelectField aria-label="Position when scrolling" size="sm" disabled={disabled} value={value} options={STICKY_OPTIONS}
          onValueChange={(next) => void writeProp(layer, "sticky", next === "none" ? null : { kind: "string", value: next }, STICKY_OPTIONS.find((entry) => entry.value === next)?.label ?? next)} />
      </InspectorRow>
    </InspectorSection>
  );
}
