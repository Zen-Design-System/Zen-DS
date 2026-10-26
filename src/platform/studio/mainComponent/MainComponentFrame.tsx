import { memo, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
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
import { OverlayPreviewContext } from "../../../components/_shared/overlay";
import { AppShellChromeContext, type AppShellChrome } from "../../../components/AppShell/context";
import { MAIN_SAMPLES } from "./samples";
import { filterStore, setsOf, toggleOn } from "./sets";
import type { MainSet } from "./appShellSets";
import { componentsOf } from "../../../../tools/studio/appshell-placeholder.mjs";
import type { VariantAxis, VariantSet } from "./variantSets.generated";
import "./mainComponent.css";

/*
 * The Main component frame (spec docs/research/studio-main-component-spec-2026-10-09.md §2, §3.1): beside the Playground,
 * every Figma component set of the page's components drawn as Figma lays a set out — columns are its first variant
 * property, rows its second, the others (State, Leading-Icon…) are filters in the frame's panel. Each cell is the
 * component for real, from its Assets code (the same parse as the Assets preview), with that variant's props.
 */

const pageComponents = (page: PlatformPage) => ((api as Record<string, ReadonlyArray<{ name: string }>>)[page] ?? []).map((entry) => entry.name);
/** Modal overlays, drawn open in a screen of their own (px): the cell is their `[data-zen-overlay-root]` frame and an
 *  OverlayPreviewContext, so each draws contained and runs none of its modal behaviour (focus, Tab trap, Escape, scroll
 *  lock), which would take the Studio's keys. */
const OVERLAY_SCREENS: Readonly<Record<string, { width: number; height: number }>> = {
  Dialog: { width: 640, height: 400 },
  ModalForm: { width: 1040, height: 720 },
  SidePanel: { width: 640, height: 600 },
  BottomSheet: { width: 390, height: 560 },
  DatePickerSheet: { width: 390, height: 720 },
};
/** The code a component is drawn from: its Main component sample (samples.ts), else its own Assets item, else the first
 *  one that uses it (Tabs in "Tabs"' Stack). */
const paletteFor = (component: string): PaletteItem | null => MAIN_SAMPLES[component] ?? (OVERLAY_SCREENS[component] ? null : PALETTE.find((item) => item.root === component) ?? PALETTE.find((item) => item.components.includes(component)) ?? null);
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
/** A cell's prop value: a Yes / No axis is a boolean, a numeric one (Progress=Low → 20) a number, else the text. */
const codeValue = (value: string, values: readonly string[]) => (values.every((item) => item === "true" || item === "false") ? value === "true" : values.every((item) => /^-?\d+(\.\d+)?$/.test(item)) ? Number(value) : value);

/** The cell's node: the Assets node with this variant's props (and the set's toggles as filtered). */
function cellNode(base: PageNode, set: VariantSet, variant: Readonly<Record<string, string>>, filters: Readonly<Record<string, string>>): PageNode {
  const props: Record<string, PageValue> = { ...base.props };
  // An overlay's variant is drawn open (the Assets preview closes them).
  if (OVERLAY_SCREENS[base.name]) props.open = literal(true);
  for (const [prop, value] of Object.entries(set.fixed)) props[prop] = literal(value);
  for (const axis of set.axes) {
    if (variant[axis.prop] === undefined) continue;
    // "" is a variant without the prop (ChatConversationItem State=Text: no call).
    if (variant[axis.prop] === "") delete props[axis.prop];
    else props[axis.prop] = literal(codeValue(variant[axis.prop], axis.values));
  }
  for (const toggle of set.toggles) {
    // On keeps the sample's own value (a Bottom Sheet's "Sort by" title), else Figma's placeholder for the layer.
    if (toggleOn(toggle, filters)) { if (!(toggle.prop in base.props)) props[toggle.prop] = literal(toggle.on); }
    else delete props[toggle.prop];
  }
  return { ...base, props };
}

/** Figma's width of a set that fills its row (its variants are FIXED there; the code fills its container). */
const FILL_WIDTHS: Readonly<Record<string, number | ((variant: Readonly<Record<string, string>>) => number)>> = {
  Divider: 356,
  "Rating/NPS-Scale": (variant) => (variant.scale === "5" ? 212 : 392),
  "Primitives/Dashboard/Header": 1232,
};
/** Sets of full-width rows (Figma FIXED 1232: a Dashboard header's Navigation, Main, Control-Bar and Custom rows): every
 *  cell takes that width, and the first variant property runs down the rows as Figma stacks them. */
const ROW_SETS: Readonly<Record<string, number | undefined>> = { "Primitives/Dashboard/Header": 1232 };
/** Figma's ring chart widths past 352, by Size: Donut with Total=Start, Donut beside its legend, Radial beside its legend
 *  (a legend below keeps 352 at every Size). */
const RING_WIDTHS: Readonly<Record<"below" | "donutTotal" | "donutBeside" | "radialBeside", Readonly<Record<string, number>>>> = {
  below: {},
  donutTotal: { medium: 400, large: 512, xlarge: 600 },
  donutBeside: { large: 400, xlarge: 480 },
  radialBeside: { large: 440, xlarge: 520 },
};
/** Sets drawn at their Figma width (FIXED there, the code fills its container): a phone's bottom bar is 390
 *  (Bottom-Navigation width = Viewport-Width). */
const FIXED_WIDTHS: Readonly<Record<string, number | ((variant: Readonly<Record<string, string>>) => number) | undefined>> = {
  // Header/AppShell is FIXED 1272 (a 1512 desktop beside its 240 Sidebar).
  "Header/AppShell": 1272,
  "Bottom-Navigation/Mobile/Default": 390,
  "Bottom-Navigation/Mobile/Floating": 390,
  "Bottom-Navigation/Mobile/Floating-Glass": 390,
  // Every Chart/Donut-Chart (15324:80365) and Chart/Radial-Chart (15325:1135) variant is FIXED (chart-donut.json,
  // chart-radial.json): a ring beside its legend or total needs that width, not a max-content cell's. 352 unless listed.
  "Chart/Donut-Chart": (variant) => (variant.totalPosition === "start" ? RING_WIDTHS.donutTotal : variant.legendPosition === "bottom" ? RING_WIDTHS.below : RING_WIDTHS.donutBeside)[variant.size] ?? 352,
  "Chart/Radial-Chart": (variant) => (variant.legendPosition === "bottom" ? RING_WIDTHS.below : RING_WIDTHS.radialBeside)[variant.size] ?? 352,
};
/** The grid's axes: columns, rows, then the filters (a row set puts its first property on the rows). */
const gridAxes = (set: VariantSet): [VariantAxis | undefined, VariantAxis | undefined, ...VariantAxis[]] =>
  ROW_SETS[set.name] ? [undefined, set.axes[0], ...set.axes.slice(1)] : [set.axes[0], set.axes[1], ...set.axes.slice(2)];

/** A component that fills its container would collapse in the cell (it sizes to its content, as in Figma): it takes
 *  its set's Figma width, else 360, so no variant ever draws as an empty cell. */
const FILL_FALLBACK = 360;

/** What an AppShell tells its header, for a header drawn on its own: Figma's Header/AppShell shows the Collapse Button by
 *  default (Collapse Button = true), which the shell's collapse="header" draws beside its Sidebar. Nothing it calls acts. */
const PREVIEW_CHROME: AppShellChrome = { toggle: "collapse", sidebarCollapsed: false, toggleSidebar: () => {}, sidebarId: "", navOpen: false, openNav: () => {}, registerHeader: () => {}, phone: false };
/** Components drawn inside a shell's chrome (their own cell has no AppShell around it). */
const IN_SHELL = new Set(["AppShellHeader"]);

function Stage({ component, set, variant, screen: frame, children }: { component: string; set: string; variant: Readonly<Record<string, string>>; screen?: { width: number; height: number }; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState(false);
  // An overlay's screen, or the Figma frame a listed variant fills (an AppShell takes its height: --zen-app-shell-height).
  const screen = frame ?? OVERLAY_SCREENS[component];
  // Once per cell, not per render: the stage observer sees a new variant collapse it (children are new elements on
  // every render, which re-created this observer and forced a layout per cell each time).
  useLayoutEffect(() => {
    const stage = ref.current;
    if (!stage || fill || screen) return undefined;
    const check = () => {
      const child = stage.firstElementChild as HTMLElement | null;
      if (child && child.offsetWidth < 2) setFill(true);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fill, screen]);
  if (screen) {
    return (
      <div ref={ref} className="studio-mc__stage studio-mc__screen" data-zen-overlay-root="" style={{ "--studio-mc-screen-width": `${screen.width}px`, "--studio-mc-screen-height": `${screen.height}px`, "--zen-app-shell-height": `${screen.height}px` } as CSSProperties}>
        <OverlayPreviewContext.Provider value>{children}</OverlayPreviewContext.Provider>
      </div>
    );
  }
  const fixed = ROW_SETS[set] ?? FIXED_WIDTHS[set];
  const width = fixed ?? FILL_WIDTHS[set];
  const style = fill || fixed ? ({ "--studio-mc-fill": `${typeof width === "function" ? width(variant) : width ?? FILL_FALLBACK}px` } as CSSProperties) : undefined;
  const content = IN_SHELL.has(component) ? <AppShellChromeContext.Provider value={PREVIEW_CHROME}>{children}</AppShellChromeContext.Provider> : children;
  return <div ref={ref} className="studio-mc__stage" data-fill={fill || fixed ? true : undefined} style={style}>{content}</div>;
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

/** Memoised: the frame's width measure re-renders MainComponentFrame, which never changes what a component draws. */
const ComponentSets = memo(function ComponentSets({ component }: { component: string }) {
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
});

function SetGrid({ component, set, base, portal }: { component: string; set: MainSet; base: PageNode | null | undefined; portal: HTMLDivElement | null }) {
  if (set.variants && set.code) return <ListGrid component={component} set={set} portal={portal} />;
  return <AxisGrid component={component} set={set} base={base} portal={portal} />;
}

/** Only this set's selected cell (a string): any other selection change (a frame, a layer, another set) leaves every
 *  cell of this set alone (a click on Input re-rendered all 268 cells, 2026-10-25). */
const useSelectedCell = (component: string, set: string) => useStudio((state) => {
  const selection = state.selection;
  return selection?.kind === "variant" && selection.component === component && selection.set === set ? cellKey(component, set, selection.variant) : null;
});

/** A set of listed variants (appShellSets.ts): Figma's own variants in its order, `wrap` to a row, each named above its
 *  cell and drawn from its own code in the frame Figma draws it in. */
function ListGrid({ component, set, portal }: { component: string; set: MainSet; portal: HTMLDivElement | null }) {
  const selectedCell = useSelectedCell(component, set.name);
  const variants = set.variants ?? [];
  return (
    <section className="studio-mc__set" aria-label={set.name}>
      <Text as="p" textStyle="Body/Small/Medium" tone="base">{set.name}</Text>
      <div className="studio-mc__grid studio-mc__grid--list" style={{ gridTemplateColumns: `repeat(${Math.min(set.wrap ?? 4, variants.length)}, max-content)` }}>
        {variants.map((variant) => {
          const key = cellKey(component, set.name, variant);
          return <CodeCell key={key} component={component} set={set} variant={variant} portal={portal} selected={selectedCell === key} />;
        })}
      </div>
    </section>
  );
}

const CodeCell = memo(function CodeCell({ component, set, variant, portal, selected }: { component: string; set: MainSet; variant: Readonly<Record<string, string>>; portal: HTMLDivElement | null; selected: boolean }) {
  const code = set.code?.(variant) ?? "";
  const item = useMemo<PaletteItem>(() => ({ id: `main-${component}`, label: component, group: "Page", root: component, components: componentsOf(code), interactive: false, input: false, build: () => code }), [component, code]);
  const node = useItemNode(item);
  const key = cellKey(component, set.name, variant);
  const name = variantLabel(variant, set.axes);
  return (
    <div className="studio-mc__cell" data-mc-cell={key} data-mc-component={component} data-mc-set={set.name} data-mc-variant={JSON.stringify(variant)} data-mc-name={name} data-selected={selected || undefined} aria-label={name}>
      <Text as="span" textStyle="Caption/Regular" tone="light" className="studio-mc__head">{name}</Text>
      <Stage component={component} set={set.name} variant={variant} screen={set.screen?.(variant)}>
        {node && portal ? renderInert(node, portal) : node === null ? <Text as="span" textStyle="Caption/Regular" tone="light">—</Text> : null}
      </Stage>
    </div>
  );
});

function AxisGrid({ component, set, base, portal }: { component: string; set: VariantSet; base: PageNode | null | undefined; portal: HTMLDivElement | null }) {
  const filters = useSyncExternalStore(filterStore.subscribe, () => filterStore.get(set.name), () => filterStore.get(set.name));
  const selectedCell = useSelectedCell(component, set.name);
  const [columns, rows, ...rest] = gridAxes(set);
  const rowValues = rows ? rows.values : [null];
  const fixedRest = Object.fromEntries(rest.map((axis) => [axis.prop, filters[axis.prop] ?? axis.default]));
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
  const [columns, rows] = gridAxes(set);
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
            <Stage component={component} set={set.name} variant={variant}>
              {base && portal ? renderInert(cellNode(base, set, variant, filters), portal) : base === null ? <Text as="span" textStyle="Caption/Regular" tone="light">—</Text> : null}
            </Stage>
          </div>
        );
      })}
    </>
  );
}
