import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Heading, plural } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { canvasApi } from "../canvas/viewport";
import { currentFiber, nameOf, onSourceUpdate, shortSrc, type Fiber } from "../select/picker";
import { selectedPartStore, withoutPart, type PartHit } from "../select/parts";
import { canEdit, studioStore, useStudio } from "../store";
import type { SourceElement, StudioSelection } from "../types";
import { componentGroupsOf } from "./componentGroups";
import { forwardedProps } from "./partForwarding";
import { PART_PROPS } from "./partProps.generated";
import { entryLabel, entryOptions, entryProp, type PropEntry } from "./propGroups";
import { PropField } from "./PropField";
import { componentSlug, propLabel, propSpecs, type Literal, type PropSpec } from "./propSchema";
import { objectSchemaOf, useApiTypes } from "./objectSchema";
import { displayValueOf, planPropReset, planPropWrite } from "./writePlan";
import { coloursOf, drivingProps, layoutOf, listedProps, matchingTextStyles, sizeOf, summarise, textHost, textStylesOf, type SpacingValue } from "./partInfo";
import { InspectorRow, InspectorSection } from "./Section";
import { SlotHost, useSlotFilled } from "./SlotHost";
import { dataItemOfPart, dataItemRootOf, type DataSlot } from "../slots";
import { dataGroupOfPart } from "../slots/dataItems";
import { DataGroupSections, DataItemBanner, DataItemSections, DataItemsSections } from "./DataItemPanel";
import { selectedPlaces, useItemSelection } from "../slots/itemSelection";

/*
 * Design tab for a part (deep select): what a component renders inside itself, read-only. The part's props, text
 * style, auto layout, size and colours come from the canvas (fibers and computed styles), each value with the Zen token
 * it equals. Edits go through the owner: its props (Playground properties or the source).
 */

type PartSelection = Extract<StudioSelection, { kind: "node" }>;

const MAX_PROPS = 40;

/** Field kinds a part's passed-on prop is edited with here (objects, lists and handlers stay with the owner). */
const PART_FIELDS = new Set(["enum", "number-enum", "boolean", "string", "number", "node", "icon", "icon-toggle", "photo"]);

/** Component names from just under the owner down to the part (wrappers included), along the part's fiber parents. */
function chainOf(part: PartHit): string[] {
  const owner = part.owner.fiber;
  const names: string[] = [];
  for (let fiber: Fiber | null = currentFiber(part.fiber); fiber; fiber = fiber.return) {
    if (owner && (fiber === owner || fiber === owner.alternate)) return names.reverse();
    if (typeof fiber.type === "function" || (typeof fiber.type === "object" && fiber.type !== null)) names.push(nameOf(fiber));
  }
  return [];
}

/** Options as Figma names them when the part's component has no Figma map: "horizontal" → "Horizontal". */
const titledOptions = (spec: PropSpec): Record<string, string> | undefined => (spec.editor.kind === "enum"
  ? Object.fromEntries(spec.editor.options.map((option) => [option, `${option.charAt(0).toUpperCase()}${option.slice(1)}`]))
  : undefined);

/** The part's props its owner passes on unchanged, as the owner's props the Inspector can edit (Figma's exposed nested
 *  instance properties: ModalActions' Direction is ModalForm's actionsDirection). */
function partPasses(owner: string, part: PartHit): Array<{ prop: string; ownerProp: string; spec: PropSpec }> {
  if (!part.isComponent) return [];
  const specs = propSpecs(owner);
  return Object.entries(forwardedProps(owner, chainOf(part), PART_PROPS)).flatMap(([prop, ownerProp]) => {
    const spec = specs.find((candidate) => candidate.name === ownerProp);
    return spec && PART_FIELDS.has(spec.editor.kind) ? [{ prop, ownerProp, spec }] : [];
  });
}

/**
 * The fields of a data-slot item's own data (BreadcrumbItemData: id, label, href, icon); null until the owner's API types
 * load. A prop its owner passes on under one of these names (Segmented `disabled`) stays the item's own field.
 */
function useItemFields(owner: string, slot: DataSlot | null): ReadonlySet<string> | null {
  const types = useApiTypes(slot ? componentSlug(owner) : null);
  if (!slot) return null;
  const spec = propSpecs(owner).find((candidate) => candidate.name === slot.prop);
  const schema = spec ? objectSchemaOf(spec.type, types, slot.form === "object" ? "object" : "array") ?? objectSchemaOf(spec.type, types, "object") : null;
  return schema ? new Set(schema.fields.map((field) => field.name)) : null;
}

/**
 * Properties of a part its owner passes on: each row is the part's prop (its Figma name when its component has one) and
 * writes the owner's prop in the source, one undo step each, as the owner's own Properties would. `itemName` (a data-slot
 * item: a crumb, a tab, a segment): the rows join the item's Properties, and the note says every item follows.
 */
function PartProperties({ selection, part, passes, itemName }: { selection: PartSelection; part: PartHit; passes: ReturnType<typeof partPasses>; itemName?: string }) {
  const parsed = parseSrc(selection.src);
  const server = useStudioServer();
  const role = useStudio((state) => state.role);
  const undoCount = useStudio((state) => state.undo.length);
  const [element, setElement] = useState<SourceElement | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    if (!parsed) return undefined;
    let alive = true;
    void studioApi.element(parsed.file, parsed.loc).then((next) => { if (alive) setElement(next); });
    return () => { alive = false; };
  }, [parsed?.file, parsed?.loc, version, undoCount]);
  const owner = selection.name;
  const live = part.owner.fiber ? currentFiber(part.owner.fiber).memoizedProps ?? undefined : undefined;
  const editable = canEdit() && role === "admin" && server.writable && Boolean(element);
  // The part's own Figma names (Direction · Horizontal / Vertical) when its component has a Figma map.
  const groups = componentGroupsOf(part.name);
  const entries: PropEntry[] = groups ? [...groups.own, ...groups.after, ...groups.nested.flatMap((group) => group.props)] : [];
  const entryOf = (prop: string) => entries.find((entry) => entryProp(entry) === prop);
  const write = (ownerProp: string, plan: { ops: Parameters<typeof applyEdit>[0]["ops"] }, label: string) => {
    if (!element || !plan.ops.length) return;
    void applyEdit({ file: element.file, loc: element.loc, name: owner, ops: plan.ops, hash: element.hash }, label);
  };
  const note = `Written to ${owner}: ${passes.map((pass) => pass.ownerProp).join(", ")}${itemName ? ` (every ${itemName} follows)` : ""}.`;
  const rows = passes.map(({ prop, ownerProp, spec }) => {
    const entry = entryOf(prop);
    return (
      <PropField
        key={prop}
        spec={spec}
        label={entry ? entryLabel(entry) ?? propLabel(prop, part.name) : propLabel(prop, part.name)}
        optionLabels={(entry ? entryOptions(entry) : undefined) ?? titledOptions(spec)}
        value={element ? displayValueOf(owner, element.attributes, ownerProp, live) : { state: "unset" }}
        disabled={!editable}
        component={owner}
        onSet={(value: Literal) => element && write(ownerProp, planPropWrite(owner, element.attributes, ownerProp, value, live), `${owner} ${ownerProp} → ${String(value)} (${part.name} ${prop})`)}
        onReset={() => element && write(ownerProp, planPropReset(owner, element.attributes, ownerProp, live), `${owner} reset ${ownerProp} (${part.name} ${prop})`)}
      />
    );
  });
  if (itemName) return <>{rows}<p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{note}</p></>;
  return <InspectorSection title="Properties" note={note}>{rows}</InspectorSection>;
}

/** Re-reads the canvas after it changes (playground properties, HMR, preview modes), at most every 250ms. */
function useCanvasTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer = 0;
    const bump = () => {
      if (timer) return;
      timer = window.setTimeout(() => { timer = 0; setTick((value) => value + 1); }, 250);
    };
    const world = canvasApi.getWorldElement();
    const observer = new MutationObserver(bump);
    if (world) observer.observe(world, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "data-theme", "data-component-theme", "data-density", "data-typography", "data-radius", "data-emphasis", "data-contrast"] });
    const offUpdate = onSourceUpdate(bump);
    return () => { observer.disconnect(); offUpdate(); window.clearTimeout(timer); };
  }, []);
  return tick;
}

/** A read-only value in a row: the value, then (when one matches) the token it equals. */
export function ValueCell({ value, tokens, swatch }: { value: string; tokens?: string[]; swatch?: string }) {
  return (
    <span className="studio-part__cell">
      <span className="studio-part__value">
        {swatch ? <span className="studio-part__swatch" style={{ ["--studio-swatch" as string]: swatch }} aria-hidden="true" /> : null}
        <span className={`studio-part__text ${typographyStyles["Body/Small/Medium"]}`}>{value}</span>
      </span>
      {tokens ? (
        <span className={`studio-part__token ${typographyStyles["Body/Small/Regular"]}`} data-none={tokens.length ? undefined : "true"} title={tokens.join("\n") || undefined}>
          {tokens.length ? `${tokens[0]}${tokens.length > 1 ? ` +${tokens.length - 1}` : ""}` : "No token"}
        </span>
      ) : null}
    </span>
  );
}

const spacingCell = (value: SpacingValue) => <ValueCell value={`${value.px}px`} tokens={value.px ? value.tokens : undefined} />;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <InspectorRow label={label}>{children}</InspectorRow>;
}

/** Padding as Figma shows it: one value, vertical · horizontal, or the four sides. */
function PaddingRows({ padding }: { padding: { top: SpacingValue; right: SpacingValue; bottom: SpacingValue; left: SpacingValue } }) {
  const { top, right, bottom, left } = padding;
  if (top.px === bottom.px && left.px === right.px && top.px === left.px) return <Row label="Padding">{spacingCell(top)}</Row>;
  if (top.px === bottom.px && left.px === right.px) {
    return (
      <>
        <Row label="Padding V">{spacingCell(top)}</Row>
        <Row label="Padding H">{spacingCell(left)}</Row>
      </>
    );
  }
  return (
    <>
      <Row label="Padding top">{spacingCell(top)}</Row>
      <Row label="Padding right">{spacingCell(right)}</Row>
      <Row label="Padding bottom">{spacingCell(bottom)}</Row>
      <Row label="Padding left">{spacingCell(left)}</Row>
    </>
  );
}

function describeNode(element: Element) {
  const hint = Array.from(element.classList).find((name) => !name.startsWith("zen-type-"));
  return `${element.localName}${hint ? `.${hint}` : ""}`;
}

/** The part's sections, read from the canvas now. */
function PartDetails({ part }: { part: PartHit }) {
  const live = currentFiber(part.fiber);
  const element = part.element;
  const props = listedProps(live.memoizedProps ?? {});
  const frame = element.closest("[data-studio-frame]");
  const textNode = textHost(element);
  const textStyles = textNode ? textStylesOf(textNode, frame) : { names: [], from: null };
  const matched = textNode && !textStyles.names.length ? matchingTextStyles(textNode) : [];
  const style = textNode ? getComputedStyle(textNode) : null;
  const textNote = textNode ? [
    textNode !== element ? `Text in ${describeNode(textNode)}` : "",
    textStyles.from ? `style inherited from ${describeNode(textStyles.from)}` : "",
    textStyles.names.length ? "" : matched.length ? "no text style class: the component's CSS sets these values" : "no Zen text style",
  ].filter(Boolean).join(", ") : "";
  const layout = layoutOf(element);
  const flex = layout.direction !== undefined;
  const size = sizeOf(element);
  const colours = coloursOf(element);
  const gapsEqual = layout.rowGap && layout.columnGap && layout.rowGap.px === layout.columnGap.px;
  return (
    <>
      <InspectorSection title={part.isComponent ? "Props" : "Attributes"} note={props.length ? undefined : "None set"}>
        {props.slice(0, MAX_PROPS).map(([name, value]) => {
          const shown = summarise(value);
          return (
            <Row key={name} label={name}>
              <span className={`studio-inspector__chip studio-part__chip ${typographyStyles["Body/Small/Regular"]}`} title={shown}>{shown}</span>
            </Row>
          );
        })}
        {props.length > MAX_PROPS ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{props.length - MAX_PROPS} more not shown</p> : null}
      </InspectorSection>

      {textNode && style ? (
        <InspectorSection title="Text style" note={textNote ? `${textNote.charAt(0).toUpperCase()}${textNote.slice(1)}` : undefined}>
          {textStyles.names.map((name, index) => <Row key={name} label={textStyles.names.length > 1 ? `Style ${index + 1}` : "Style"}><ValueCell value={name} /></Row>)}
          {!textStyles.names.length && matched.length ? <Row label="Matches"><ValueCell value={matched.join(", ")} /></Row> : null}
          <Row label="Font"><ValueCell value={`${parseFloat(style.fontSize)} / ${style.lineHeight === "normal" ? "normal" : parseFloat(style.lineHeight)} · ${style.fontWeight}`} /></Row>
        </InspectorSection>
      ) : null}

      <InspectorSection title="Layout">
        <Row label="Display"><ValueCell value={layout.display} /></Row>
        {flex ? <Row label="Direction"><ValueCell value={`${layout.direction}${layout.wrap && layout.wrap !== "nowrap" ? ` · ${layout.wrap}` : ""}`} /></Row> : null}
        {layout.columns ? <Row label="Columns"><ValueCell value={layout.columns} /></Row> : null}
        {layout.align ? <Row label="Align"><ValueCell value={layout.align} /></Row> : null}
        {layout.justify ? <Row label="Justify"><ValueCell value={layout.justify} /></Row> : null}
        {layout.rowGap && layout.columnGap ? (
          gapsEqual ? <Row label="Gap">{spacingCell(layout.rowGap)}</Row> : (
            <>
              <Row label="Row gap">{spacingCell(layout.rowGap)}</Row>
              <Row label="Column gap">{spacingCell(layout.columnGap)}</Row>
            </>
          )
        ) : null}
        <PaddingRows padding={layout.padding} />
      </InspectorSection>

      <InspectorSection title="Size">
        <Row label="W × H"><ValueCell value={`${size.width} × ${size.height}`} /></Row>
      </InspectorSection>

      <InspectorSection title="Colours" note={colours.length ? undefined : "Nothing painted on this node"}>
        {colours.map(({ name, colour }) => <Row key={name} label={name}><ValueCell value={colour.label} tokens={colour.tokens} swatch={colour.value} /></Row>)}
      </InspectorSection>
    </>
  );
}

/** Design tab for a part of the selected element (read-only). */
export function PartPanel({ selection, controlsSlot }: { selection: PartSelection; controlsSlot: HTMLElement }) {
  const part = useSyncExternalStore(selectedPartStore.subscribe, selectedPartStore.get, selectedPartStore.get);
  useCanvasTick();
  const controlsFilled = useSlotFilled(controlsSlot);
  const name = part?.name ?? selection.part?.name ?? "Part";
  const owner = selection.name;
  const at = shortSrc(selection.src);
  const resolved = part && part.owner.src === selection.src && part.element.isConnected ? part : null;
  const ownerProps = resolved?.owner.fiber ? currentFiber(resolved.owner.fiber).memoizedProps ?? {} : {};
  const text = resolved?.element.textContent?.trim() ?? "";
  const driving = resolved ? drivingProps(ownerProps, currentFiber(resolved.fiber).memoizedProps ?? {}, text.length <= 80 ? text : null) : [];
  const isComponent = resolved ? resolved.isComponent : /^[A-Z]/.test(name);
  const selectOwner = () => studioStore.setState({ selection: withoutPart(selection) });
  // A data-slot item (TopNavigation's trailing action) is edited like Figma's nested instance in a slot; a part inside
  // one (its icon) says which item it is in.
  const item = dataItemRootOf(resolved);
  const inside = item ? null : dataItemOfPart(resolved);
  // A nested slot's group as drawn (a Sidebar section, its title or its rows): removed, renamed and added to.
  const group = item || inside ? null : dataGroupOfPart(resolved);
  // Other items of the same slot selected with it (Shift/⌘+click): the panel speaks for them all.
  const itemSet = useItemSelection();
  const places = item && itemSet && itemSet.src === selection.src && itemSet.instance === selection.instance ? selectedPlaces(item.index, itemSet, item.slot.prop) : [];
  // Props the owner passes on to it: edited here, written to the owner (the rest stays read-only). A data-slot item has
  // them too (a crumb's Emphasis is Breadcrumbs' emphasis, a tab's Variant is Tabs' variant), after its own fields; a
  // pass named like one of its fields (a segment's `disabled`) stays that field.
  // On an item, a pass whose value is an object the owner's prop does not hold is the item itself (TopNavigation hands
  // `leading` to a TopNavigationActionButton as `action`, and each trailing action its own item there).
  const itemFields = useItemFields(owner, item?.slot ?? null);
  const partProps = resolved ? currentFiber(resolved.fiber).memoizedProps ?? {} : {};
  const holdsItem = (pass: { prop: string; ownerProp: string }) => Boolean(partProps[pass.prop]) && typeof partProps[pass.prop] === "object" && partProps[pass.prop] !== ownerProps[pass.ownerProp];
  const passes = resolved && (!item || itemFields)
    ? partPasses(owner, resolved).filter((pass) => !item || (!itemFields?.has(pass.prop) && !holdsItem(pass)))
    : [];

  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name={isComponent ? "icon-cube-line" : "icon-code-02-line"} size={16} /></span>
          <Heading level={2} textStyle="Body/Small/Bold" className="studio-part__title">
            {item && places.length > 1 ? plural(places.length, item.slot.itemName) : item ? item.slot.itemName : group ? (group.role === "title" ? "Section-Title" : group.role === "list" ? "Section rows" : "Section") : name}
            <span className={`studio-part__owner ${typographyStyles["Body/Small/Regular"]}`}>{item ? ` · in ${item.slot.name} of ${owner}` : group ? ` · in ${group.slot.name} of ${owner}` : ` · part of ${owner}`}</span>
          </Heading>
        </div>
        {item || group ? null : <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{passes.length ? `Set by ${owner} at ${at}; its Properties write ${owner}'s props` : `Read-only — set by ${owner} at ${at}`}</p>}
        <div className="studio-part__links">
          {/* zen-allow-compact-button: quiet links under the part name in a dense tool panel, like the element's file link */}
          <Button appearance="flat" level="primary" size="xs" startIcon="icon-corner-left-up-line" className="studio-inspector__src" onClick={selectOwner}>
            Select {owner}
          </Button>
          {/* zen-allow-compact-button: the owner's file:line reference, as on an element's Design tab */}
          <Button appearance="flat" level="primary" size="xs" startIcon="icon-code-02-line" className="studio-part__code" aria-label={`Show ${at} in the Code tab`} onClick={() => studioStore.setState({ inspectorTab: "code" })}>
            {at}
          </Button>
        </div>
        {inside ? <DataItemBanner item={inside} /> : null}
        {driving.length && !item && !inside && !group ? (
          <p className={`studio-inspector__note studio-part__edit ${typographyStyles["Body/Small/Regular"]}`}>
            Edit via the owner&apos;s {driving.map((prop, index) => (
              <span key={prop}>{index ? (index === driving.length - 1 ? " or " : ", ") : null}<span className={typographyStyles["Caption/Bold"]}>{prop}</span></span>
            ))} (Playground properties or source)
          </p>
        ) : null}
      </header>

      {group ? <DataGroupSections selection={selection} hit={group} /> : null}
      {item && places.length > 1 ? <DataItemsSections selection={selection} item={item} places={places} /> : item ? (
        <DataItemSections selection={selection} item={item}>
          {resolved && passes.length ? <PartProperties selection={selection} part={resolved} passes={passes} itemName={item.slot.itemName} /> : null}
        </DataItemSections>
      ) : null}
      {resolved && passes.length && !item ? <PartProperties selection={selection} part={resolved} passes={passes} /> : null}
      {resolved && places.length > 1 ? null : resolved ? <PartDetails part={resolved} /> : <p className={`studio-inspector__empty ${typographyStyles["Body/Small/Regular"]}`}>Finding {name} on the canvas…</p>}

      {/* The owner's playground controls, after the part: where its props are edited. */}
      {selection.panelId ? (
        <div hidden={!controlsFilled}>
          <InspectorSection title="Playground properties">
            <SlotHost node={controlsSlot} className="studio-inspector__slot" />
          </InspectorSection>
        </div>
      ) : null}
    </div>
  );
}
