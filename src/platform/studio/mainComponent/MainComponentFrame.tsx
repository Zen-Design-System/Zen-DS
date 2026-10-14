import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Heading, Text } from "../../../components/Text";
import api from "../../api.generated.json";
import { platformMedia } from "../../PlatformMedia";
import type { PlatformPage } from "../../PlatformExamples";
import { StudioFrame } from "../board/StudioFrame";
import { renderInert, useItemNode } from "../builder/library/ItemPreview";
import type { PageNode, PageValue } from "../builder/render/renderPage";
import { PALETTE, type PaletteItem } from "../slots/palette";
import { useStudio } from "../store";
import { cellKey, MAIN_FRAME, variantLabel } from "./model";
import { filterStore, setsOf, toggleOn } from "./sets";
import type { VariantSet } from "./variantSets.generated";
import "./mainComponent.css";

/*
 * The Main component frame (spec docs/research/studio-main-component-spec-2026-10-09.md §2, §3.1): beside the Playground,
 * every Figma component set of the page's components drawn as Figma lays a set out — columns are its first variant
 * property, rows its second, the others (State, Leading-Icon…) are filters in the frame's panel. Each cell is the
 * component for real, from its Assets code (the same parse as the Assets preview), with that variant's props.
 */

const pageComponents = (page: PlatformPage) => ((api as Record<string, ReadonlyArray<{ name: string }>>)[page] ?? []).map((entry) => entry.name);
/** Overlays open over the whole canvas: their variants are not drawn in the frame (yet). */
const OVERLAYS = new Set(["Dialog", "ModalForm", "SidePanel", "BottomSheet", "Toast"]);
/** The Assets item a component is drawn from: its own, else the first one that uses it (Tabs in "Tabs"' Stack). */
const paletteFor = (component: string): PaletteItem | null => (OVERLAYS.has(component) ? null : PALETTE.find((item) => item.root === component) ?? PALETTE.find((item) => item.components.includes(component)) ?? null);
/** The component's own node in the item (the item itself, or the first of its kind inside it). */
function nodeOf(node: PageNode | null | undefined, component: string): PageNode | null | undefined {
  if (!node) return node;
  if (node.name === component) return node;
  for (const child of node.children) {
    const found = child.kind === "element" ? nodeOf(child, component) : child.kind === "map" ? nodeOf(child.node, component) : null;
    if (found) return found;
  }
  return null;
}

/** The components of `page` the frame draws: those with Figma variant sets and an Assets item to draw them from. */
export function mainComponents(page: PlatformPage): string[] {
  return [...new Set(pageComponents(page))].filter((name) => setsOf(name).length && paletteFor(name));
}

const overlaySet = (set: VariantSet) => /overlay/i.test(set.name) || Object.values(set.fixed).includes("overlay");
const literal = (value: unknown): PageValue => ({ kind: "literal", value });
const codeValue = (value: string, values: readonly string[]) => (values.every((item) => item === "true" || item === "false") ? value === "true" : value);

/** The cell's node: the Assets node with this variant's props (and the set's toggles as filtered). */
function cellNode(base: PageNode, set: VariantSet, variant: Readonly<Record<string, string>>, filters: Readonly<Record<string, string>>): PageNode {
  const props: Record<string, PageValue> = { ...base.props };
  for (const [prop, value] of Object.entries(set.fixed)) props[prop] = literal(value);
  for (const axis of set.axes) if (variant[axis.prop] !== undefined) props[axis.prop] = literal(codeValue(variant[axis.prop], axis.values));
  for (const toggle of set.toggles) {
    if (toggleOn(toggle, filters)) props[toggle.prop] = literal(toggle.on);
    else delete props[toggle.prop];
  }
  return { ...base, props };
}

export function MainComponentFrame({ page }: { page: PlatformPage }) {
  const components = useMemo(() => mainComponents(page), [page]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  // The frame is as wide as its widest grid (cells keep their natural size, as in Figma).
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;
    const measure = () => setWidth((current) => (Math.abs(current - content.offsetWidth) > 1 ? content.offsetWidth : current));
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [components]);
  if (!components.length) return null;
  return (
    <StudioFrame id={MAIN_FRAME} kind="main-component" label="Main component" width={width}>
      <div ref={contentRef} className="studio-frame__page studio-mc">
        {components.map((component) => <ComponentSets key={component} component={component} />)}
      </div>
    </StudioFrame>
  );
}

function ComponentSets({ component }: { component: string }) {
  const item = paletteFor(component);
  const parsed = useItemNode(item!);
  const node = useMemo(() => nodeOf(parsed, component), [parsed, component]);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  return (
    <section className="studio-mc__component" aria-label={component}>
      <Heading level={2} textStyle="Heading/4">{component}</Heading>
      {setsOf(component).map((set) => (
        <SetGrid key={set.name} component={component} set={set} base={node} portal={portal} />
      ))}
      <div ref={setPortal} className="studio-mc__portal" />
    </section>
  );
}

function SetGrid({ component, set, base, portal }: { component: string; set: VariantSet; base: PageNode | null | undefined; portal: HTMLDivElement | null }) {
  const filters = useSyncExternalStore(filterStore.subscribe, () => filterStore.get(set.name), () => filterStore.get(set.name));
  const selection = useStudio((state) => state.selection);
  const [columns, rows, ...rest] = set.axes;
  const rowValues = rows ? rows.values : [null];
  const fixedRest = Object.fromEntries(rest.map((axis) => [axis.prop, filters[axis.prop] ?? axis.default]));
  const selectedCell = selection?.kind === "variant" && selection.component === component && selection.set === set.name ? cellKey(component, set.name, selection.variant) : null;
  return (
    // An overlay set is drawn on a photo, what it is made for (its White levels vanish on a plain light or dark surface).
    <section className="studio-mc__set" aria-label={set.name} data-backdrop={overlaySet(set) ? "photo" : undefined} style={overlaySet(set) ? ({ "--studio-mc-photo": `url("${platformMedia.mountainRoad.src}")` } as CSSProperties) : undefined}>
      <Text as="p" textStyle="Body/Small/Medium" tone="base">{set.name}</Text>
      {rest.length || set.toggles.length ? (
        <Text as="p" textStyle="Caption/Regular" tone="light">
          {[...rest.map((axis) => `${axis.label}=${axis.names[axis.values.indexOf(fixedRest[axis.prop])] ?? fixedRest[axis.prop]}`), ...set.toggles.map((toggle) => `${toggle.label}=${toggleOn(toggle, filters) ? "On" : "Off"}`)].join(" · ")}
        </Text>
      ) : null}
      <div className="studio-mc__grid" style={{ gridTemplateColumns: `max-content repeat(${columns?.values.length ?? 1}, max-content)` }}>
        <span />
        {columns ? columns.names.map((name) => <Text key={name} as="span" textStyle="Caption/Regular" tone="light" className="studio-mc__head">{name}</Text>) : <span />}
        {rowValues.map((rowValue, rowIndex) => (
          <RowCells key={rowValue ?? "row"} component={component} set={set} base={base} portal={portal} rowLabel={rows ? rows.names[rowIndex] : ""} rowValue={rowValue} fixedRest={fixedRest} filters={filters} selectedCell={selectedCell} />
        ))}
      </div>
    </section>
  );
}

function RowCells({ component, set, base, portal, rowLabel, rowValue, fixedRest, filters, selectedCell }: {
  component: string; set: VariantSet; base: PageNode | null | undefined; portal: HTMLDivElement | null; rowLabel: string; rowValue: string | null;
  fixedRest: Record<string, string>; filters: Readonly<Record<string, string>>; selectedCell: string | null;
}) {
  const [columns, rows] = set.axes;
  const columnValues = columns ? columns.values : [null];
  return (
    <>
      <Text as="span" textStyle="Caption/Regular" tone="light" className="studio-mc__head studio-mc__head--row">{rowLabel}</Text>
      {columnValues.map((columnValue) => {
        const variant: Record<string, string> = { ...set.fixed, ...fixedRest };
        if (columns && columnValue !== null) variant[columns.prop] = columnValue;
        if (rows && rowValue !== null) variant[rows.prop] = rowValue;
        const key = cellKey(component, set.name, variant);
        const name = variantLabel(variant, set.axes);
        return (
          <div key={key} className="studio-mc__cell" data-mc-cell={key} data-mc-component={component} data-mc-set={set.name} data-mc-variant={JSON.stringify(variant)} data-mc-name={name} data-selected={selectedCell === key || undefined} aria-label={name}>
            <div className="studio-mc__stage">
              {base && portal ? renderInert(cellNode(base, set, variant, filters), portal) : base === null ? <Text as="span" textStyle="Caption/Regular" tone="light">—</Text> : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
