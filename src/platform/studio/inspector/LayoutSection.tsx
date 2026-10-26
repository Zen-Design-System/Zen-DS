import { optionLabel, tokenName } from "./controls/scale";
import { tip } from "../shell/ShortcutTip";
import { useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Checkbox } from "../../../components/Checkbox";
import { Icon } from "../../../components/Icon";
import { Popover, PopoverItem } from "../../../components/Popover";
import { Segmented } from "../../../components/Segmented";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { EditOp, SourceAttr } from "../types";
import { AlignmentBox } from "./controls/AlignmentBox";
import { ColumnsField } from "./controls/ColumnsField";
import { ScaleField } from "./controls/ScaleField";
import "./controls/controls.css";
import type { FieldApi } from "./fieldApi";
import {
  alignView, axisPadding, axisPaddingOps, crossOps, flowOf, flowOps, gapAutoOps, gapOps, gapsSplit, layoutWarnings, relinkChoices, relinkOps,
  type AlignView, type CrossMode, type Flow, type Literal, type Written,
} from "./layoutModel";
import { PropField } from "./PropField";
import { propLabel, type PropSpec, type PropValue } from "./propSchema";
import { InspectorFields, InspectorSection } from "./Section";
import { addAutoLayoutToSelection, isAutoLayoutFrame, isFrameWithoutAutoLayout, removeAutoLayoutFromSelection, removeAutoLayoutShortcut } from "../edit/autoLayout";
import { autoLayoutShortcut } from "../select/wrapSelection";
import { useStudio } from "../store";
import { breakpointOf, primaryBreakpointOf } from "../select/gridTracks";
import { BREAKPOINT_ICONS, BREAKPOINT_LABELS, BREAKPOINTS } from "../../../../tools/studio/screen-devices.mjs";
import { HIDE_ON_LAYERS, hideOnOp, toggledHideOn } from "../edit/hideOn";
import { breakpointsWithOwn, ownProps, resetOps, responsiveOps, responsivePropsOf, responsiveRead, sameEverywhereOps, shownAt, widerOf, type Breakpoint, type RLiteral } from "./responsiveModel";

/*
 * The Auto layout / Layout section in Figma UI3's words and field grid (docs/research/studio-inspector-figma-spec-2026-10-09.md
 * §1 and §3; first version: docs/research/studio-inspector-redesign-2026-10-03.md, Phases 3, 4 and 6): labels above the
 * fields, two field columns and an icon column; one control per concept, each gesture one apply (one undo step) planned
 * by layoutModel.ts. Figma's words, Zen's code: Flow → direction / wrap, Resizing → width / height, Alignment → align +
 * justify, Gap (Auto) → gap / justify="between", Padding H / V → paddingX / paddingY (padding when equal), Clip content → clip.
 *   Stack     Flow (Vertical · Horizontal, Wrap beside), Resizing, Alignment | Gap (the cross axis beside), Padding H | V.
 *   Grid      Resizing, Alignment (cells), Gap (one, or column and row), Columns (Auto-fit · Count · Tracks, per breakpoint), Padding.
 *   Box       Resizing, Padding H | V, Clip content.   FormFieldset: Flow (2), Gap.   FormActions: Alignment, Side inset (when pinned).
 *   others    their rows as before (Container max width and page margin, Form gap).
 * A value the source binds or spreads keeps its own row (PropField: edited in place when it may be, else read-only), so
 * the grouped controls only ever show literals. Written props that do nothing here get a warning with Remove.
 */

/** The props a written literal is read for (the model's `Written`). */
const READ = ["direction", "wrap", "align", "justify", "gap", "rowGap", "columnGap", "padding", "paddingX", "paddingY", "columns", "minColumnWidth", "inset", "sticky", "clip"];

/** Figma's words for the layout props that keep a row of their own (a bound or spread value). */
const figmaWords: Readonly<Record<string, string>> = {
  direction: "Flow", wrap: "Wrap", align: "Alignment · cross axis", justify: "Alignment · main axis", gap: "Gap", rowGap: "Row gap",
  columnGap: "Column gap", padding: "Padding", paddingX: "Horizontal padding", paddingY: "Vertical padding", clip: "Clip content",
};

/** What an apply shows at once: a set prop as its literal, a removed one as unset. */
function optimisticOf(ops: EditOp[]): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const op of ops) {
    if (op.op === "setProp" && "value" in op.value) out[op.name] = { state: "literal", value: op.value.value, raw: "" };
    else if (op.op === "removeProp") out[op.name] = { state: "unset" };
  }
  return out;
}

/** A Segmented whose unset (effective) segment reads in the default tone. */
function Seg({ label, value, unset, disabled, options, onPick }: { label: string; value: string; unset: boolean; disabled: boolean; options: Array<{ id: string; icon?: string; name: string }>; onPick: (id: string) => void }) {
  return (
    <div className="studio-layout-seg" data-default={unset || undefined}>
      <Segmented
        aria-label={label}
        size="sm"
        fullWidth
        disabled={disabled}
        value={value}
        onValueChange={(next) => { if (next !== value) onPick(next); }}
        options={options.map((option) => (option.icon ? { id: option.id, label: "", leading: option.icon as never, "aria-label": option.name } : { id: option.id, label: option.name }))}
      />
    </div>
  );
}

/** Figma's advanced layout settings beside Gap: how the children sit on the cross axis (where the alignment box puts
 *  them, stretched, or on the text baseline in a row). */
function CrossMenu({ view, disabled, onPick }: { view: AlignView; disabled: boolean; onPick: (mode: CrossMode) => void }) {
  const [open, setOpen] = useState(false);
  const [withKeys, setWithKeys] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const items: Array<{ id: CrossMode; label: string; caption: string }> = [
    { id: "position", label: "Position", caption: "Where the alignment box puts them" },
    { id: "stretch", label: "Stretch", caption: view.row ? "Fill the row's height" : "Fill the column's width" },
    ...(view.row ? [{ id: "baseline" as const, label: "Text baseline", caption: "On their first line of text" }] : []),
  ];
  const current = items.find((item) => item.id === view.cross)?.label ?? "Position";
  return (
    <span ref={anchor} className="studio-layout-cross">
      {/* zen-allow-filter-button: Figma's advanced layout settings, a 24px icon in the panel's icon column (no room for a Chip); not a filter */}
      <IconButton
        icon="icon-sliders-02-line"
        aria-label={`Cross axis: ${current}${view.crossDefault ? " (default)" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        appearance="flat"
        level="primary"
        size="xs"
        disabled={disabled}
        onClick={(event) => { setWithKeys(event.detail === 0); setOpen((now) => !now); }}
      />
      <Popover open={open} onOpenChange={(next) => { if (!next) setOpen(false); }} anchorRef={anchor} align="end" autoFocus={withKeys} aria-label="Cross axis">
        {items.map((item) => (
          <PopoverItem key={item.id} label={item.label} caption={item.caption} selected={view.cross === item.id} onSelect={() => { setOpen(false); if (item.id !== view.cross || view.crossDefault) onPick(item.id); }} />
        ))}
      </Popover>
    </span>
  );
}

export function LayoutSection({ specs, api, note, component, sizing, attributes, host }: {
  specs: PropSpec[];
  api: FieldApi;
  note?: string;
  component: string;
  /** The Size group (SizingSection), after Flow. */
  sizing?: ReactNode;
  /** The element's attributes as written (Grid columns per breakpoint). */
  attributes: SourceAttr[];
  /** The selection's rendered element (the frame's breakpoint, the grid's tracks). */
  host: HTMLElement | null;
}) {
  const selection = useStudio((state) => state.selection);
  const [splitView, setSplitView] = useState(false);
  const spec = (name: string) => specs.find((candidate) => candidate.name === name);
  // Per-breakpoint props (responsiveModel.ts; studio-responsive-breakpoints §4): the controls show the value at the
  // editing breakpoint (the one the Screen shows, or the one picked in the Breakpoint row) and write that breakpoint's
  // key. A per-breakpoint value reads as the literal it shows there, so the grouped controls take it as a plain one.
  const responsive = responsivePropsOf(component);
  const selected = selection?.kind === "node" ? selection.src : "";
  const frameBreakpoint: Breakpoint = host ? breakpointOf(host) : "desktop";
  // The breakpoint the Screen is drawn for (a web page's desktop, a phone Screen's mobile): edits there stay plain.
  const primary: Breakpoint = primaryBreakpointOf(host);
  const [picked, setPicked] = useState<{ breakpoint: Breakpoint; for: string } | null>(null);
  const editing: Breakpoint = picked && picked.for === `${selected}|${frameBreakpoint}` ? picked.breakpoint : frameBreakpoint;
  const reads = Object.fromEntries(responsive.map((name) => [name, responsiveRead(attributes, name)]));
  const perBreakpoint = responsive.filter((name) => reads[name].kind === "responsive");
  const valueFor = (name: string): PropValue => {
    const read = reads[name];
    if (read?.kind !== "responsive") return api.valueFor(name);
    const shown = shownAt(read, editing);
    return shown === undefined ? { state: "unset" } : { state: "literal", value: shown, raw: "" };
  };
  const state = (name: string) => valueFor(name).state;
  const literal = (name: string): Literal | undefined => {
    const value = valueFor(name);
    return value.state === "literal" ? value.value : undefined;
  };
  // Only literals (or nothing) are grouped: a bound or spread value keeps its own row.
  const plain = (...names: string[]) => names.every((name) => !spec(name) || state(name) === "literal" || state(name) === "unset");
  const written: Written = Object.fromEntries(READ.map((name) => [name, literal(name)]));
  const disabled = api.disabled;
  const defaults: Record<string, RLiteral | undefined> = Object.fromEntries(responsive.map((name) => {
    const fallback = spec(name)?.defaultValue;
    return [name, typeof fallback === "string" || typeof fallback === "number" || typeof fallback === "boolean" ? fallback : undefined];
  }));
  const where = editing === primary && !perBreakpoint.length ? "" : ` on ${BREAKPOINT_LABELS[editing]}`;
  const apply = (ops: EditOp[], label: string) => {
    const planned = responsive.length ? responsiveOps(ops, { component, attributes, breakpoint: editing, primary, defaults }) : ops;
    if (planned.length) void api.apply(planned, `${component} ${label}${where}`, optimisticOf(planned));
  };
  /** ⌫ on a grouped field: the prop's default at the editing breakpoint (its key goes on a per-breakpoint prop). */
  const removeProp = (name: string) => { if (responsive.includes(name)) apply([{ op: "removeProp", name }], `${name} reset`); else api.removeProp(name); };
  const handled = new Set<string>();
  const groups: ReactNode[] = [];

  /** A plain row (PropField), as every prop the groups do not take: Figma's word for it where there is one. */
  const field = (name: string, label: string | undefined = figmaWords[name]) => {
    const found = spec(name);
    if (!found) return null;
    handled.add(name);
    return (
      <PropField
        key={name}
        spec={found}
        label={label ?? propLabel(name, component)}
        value={api.valueFor(name)}
        disabled={disabled}
        boundHint={api.boundHint}
        onSet={(value) => api.setProp(name, value)}
        onReset={() => api.removeProp(name)}
        restore={api.restoreFor?.(name)}
        repeats={api.repeats}
      />
    );
  };

  /** A gap / padding token field (ScaleField) for a literal or unset prop. */
  const scale = (name: string, label: string, leading: string, onSet: (key: string) => void, extra?: { value?: string; extras?: Array<{ key: string; label: string }>; actions?: Array<{ key: string; label: string; run: () => void }>; onReset?: () => void; placeholder?: string }) => {
    const found = spec(name);
    if (!found || found.editor.kind !== "enum") return null;
    handled.add(name);
    const value = literal(name);
    return (
      <div className="studio-layout-field" data-prop={name}>
        <ScaleField
          label={label}
          prop={name}
          scale={name.startsWith("padding") || name === "inset" ? "padding" : "gap"}
          options={found.editor.options}
          value={extra?.value ?? (typeof value === "string" ? value : undefined)}
          fallback={typeof found.defaultValue === "string" ? found.defaultValue : undefined}
          disabled={disabled}
          leading={leading as never}
          extras={extra?.extras}
          actions={extra?.actions}
          placeholder={extra?.placeholder}
          onSet={onSet}
          onReset={extra?.onReset ?? (value !== undefined ? () => removeProp(name) : undefined)}
        />
      </div>
    );
  };

  const row = (written.direction === "row");
  const view = alignView(written);

  // ── Breakpoint: which breakpoint the fields edit (shown while the Screen is narrower than desktop, or once the element
  // writes per-breakpoint values); a dot marks a breakpoint with values of its own. ──
  const own = new Set(ownProps(component, attributes, editing));
  const ownOf = (...names: string[]) => editing !== "desktop" && names.some((name) => own.has(name));
  if (responsive.length && (frameBreakpoint !== primary || perBreakpoint.length || picked)) {
    const marked = new Set(breakpointsWithOwn(component, attributes));
    groups.push(
      <InspectorFields
        key="breakpoint"
        name="breakpoint"
        labels={["Breakpoint"]}
        code={`${component} per breakpoint: { desktop, tablet, mobile }`}
        icon={perBreakpoint.length ? <IconButton icon="icon-link-01-line" appearance="flat" level="primary" size="xs" aria-label="Same on every breakpoint" tooltip={`Same on every breakpoint (${BREAKPOINT_LABELS[editing]}'s values)`} disabled={disabled} onClick={() => { const ops = sameEverywhereOps(component, attributes, editing); if (ops.length) void api.apply(ops, `${component} same on every breakpoint`, optimisticOf(ops)); }} /> : undefined}
        fields={[(
          <Segmented
            key="breakpoint"
            aria-label="Edit the breakpoint"
            size="sm"
            fullWidth
            value={editing}
            onValueChange={(next) => setPicked({ breakpoint: next as Breakpoint, for: `${selected}|${frameBreakpoint}` })}
            options={BREAKPOINTS.map((key) => ({
              id: key,
              label: null,
              leading: BREAKPOINT_ICONS[key] as never,
              badge: marked.has(key) && key !== "desktop" ? <span className="studio-layout-own-dot" aria-hidden="true" /> : undefined,
              "aria-label": `${BREAKPOINT_LABELS[key]}${key === frameBreakpoint ? " (shown)" : ""}${marked.has(key) && key !== "desktop" ? ", has its own values" : ""}`,
            }))}
          />
        )]}
      />,
    );
    if (editing !== "desktop") {
      const ownNames = [...own].map((name) => figmaWords[name] ?? name);
      groups.push(
        <div key="breakpoint-note" className="studio-layout-breakpoint" data-prop="breakpoint-note">
          <p className={`studio-inspector__note ${typographyStyles["Caption/Regular"]}`}>
            {ownNames.length ? `Own on ${BREAKPOINT_LABELS[editing]}: ${ownNames.join(", ")}` : `${BREAKPOINT_LABELS[editing]} shows ${BREAKPOINT_LABELS[widerOf(editing, component, attributes)]}'s values; a change here is its own`}
          </p>
          {ownNames.length ? <Button appearance="flat" level="primary" size="sm" disabled={disabled} onClick={() => { const ops = resetOps(component, attributes, editing); if (ops.length) void api.apply(ops, `${component} reset ${BREAKPOINT_LABELS[editing]} to ${BREAKPOINT_LABELS[widerOf(editing, component, attributes)]}`, optimisticOf(ops)); }}>{`Reset to ${BREAKPOINT_LABELS[widerOf(editing, component, attributes)]}`}</Button> : null}
        </div>,
      );
    }
  }

  // ── Flow ──
  if ((component === "Stack" || component === "FormFieldset") && spec("direction") && plain("direction", "wrap")) {
    handled.add("direction");
    handled.add("wrap");
    const flow = flowOf(written);
    const wraps = Boolean(spec("wrap"));
    // Figma UI3: Vertical · Horizontal · Wrap in one Segmented (user, 2026-10-15: Wrap was a toggle in the icon column).
    const items: Array<{ id: Flow; icon: string; name: string }> = [
      { id: "vertical", icon: "icon-arrow-down-line", name: "Vertical" },
      { id: "horizontal", icon: "icon-arrow-right-line", name: component === "FormFieldset" ? "Horizontal (wraps)" : "Horizontal" },
      ...(wraps ? [{ id: "wrap" as const, icon: "icon-corner-down-left-line", name: "Wrap" }] : []),
    ];
    const anyWritten = written.direction !== undefined || written.wrap !== undefined;
    groups.push(
      <InspectorFields
        key="flow"
        name="direction"
        own={ownOf("direction", "wrap")}
        labels={["Flow"]}
        code={wraps ? "Stack direction · wrap" : `${component} direction`}
        fields={[<Seg key="flow" label="Flow" value={wraps ? flow : flow === "wrap" ? "horizontal" : flow} unset={!anyWritten} disabled={disabled} options={items} onPick={(next) => apply(flowOps(written, next as Flow), `Flow → ${optionLabel(next)}`)} />]}
      />,
    );
  } else if (component === "Stack" || component === "FormFieldset") {
    // Bound or spread: their own rows, still first (Figma's order).
    groups.push(field("direction"), field("wrap"));
  }

  if (sizing) groups.push(<div key="size">{sizing}</div>);

  // ── Alignment + Gap (Stack) ──
  if (component === "Stack" && spec("align") && spec("justify") && plain("align", "justify")) {
    handled.add("align");
    handled.add("justify");
    const gapPlain = Boolean(spec("gap")) && plain("gap");
    const gapField = gapPlain ? scale("gap", "Gap", row ? "icon-spacing-width-01-line" : "icon-spacing-height-01-line", (key) => apply(key === "auto" ? gapAutoOps(written) : gapOps(written, key), key === "auto" ? "Gap → Auto" : `Gap → ${tokenName(key)}`), {
      value: view.auto ? "auto" : undefined,
      extras: [{ key: "auto", label: "Auto" }],
      onReset: view.auto ? () => apply([{ op: "removeProp", name: "justify" }], "Auto off") : written.gap !== undefined ? () => removeProp("gap") : undefined,
    }) : null;
    groups.push(
      <InspectorFields
        key="align"
        name="align justify"
        own={ownOf("align", "justify", "gap")}
        labels={gapField ? ["Alignment", "Gap"] : ["Alignment"]}
        code="Stack align · justify · gap"
        icon={<CrossMenu view={view} disabled={disabled} onPick={(mode) => apply(crossOps(written, mode), `Alignment → ${optionLabel(mode)}`)} />}
        fields={[<AlignmentBox key="box" written={written} disabled={disabled} onOps={(ops, label) => apply(ops, label)} />, gapField ?? <span key="gap" />]}
      />,
    );
    // A bound or spread gap keeps its own row (PropField).
    if (!gapField) groups.push(field("gap"));
  } else if (component === "Stack") {
    groups.push(field("align"), field("justify"), field("gap"));
  }

  // ── Grid: align cells, gap (one or two), columns ──
  if (component === "Grid") {
    if (spec("align") && plain("align")) {
      handled.add("align");
      const value = typeof written.align === "string" ? written.align : "stretch";
      groups.push(
        <InspectorFields
          key="grid-align"
          name="align"
          labels={["Alignment"]}
          code="Grid align"
          fields={[
            <Seg
              key="cells"
              label="Align cells"
              value={value}
              unset={written.align === undefined}
              disabled={disabled}
              options={[
                { id: "start", icon: "icon-flex-align-top-line", name: "Top" },
                { id: "center", icon: "icon-align-vertical-center-01-line", name: "Middle" },
                { id: "end", icon: "icon-flex-align-bottom-line", name: "Bottom" },
                { id: "stretch", icon: "icon-chevron-selector-vertical-line", name: "Stretch" },
              ]}
              onPick={(next) => apply(next === "stretch" ? [{ op: "removeProp", name: "align" }] : [{ op: "setProp", name: "align", value: { kind: "string", value: next } }], `Alignment → ${optionLabel(next)}`)}
            />,
          ]}
        />,
      );
    }
    if (spec("gap") && plain("gap", "rowGap", "columnGap")) {
      const split = splitView || gapsSplit(written);
      const choices = relinkChoices(written);
      // One gap ↔ separate row and column gaps: a command in the gap fields' own list (as Figma keeps "Auto" in its gap
      // list), not a link icon in the icon column (user, 2026-10-15, with Wrap in Flow).
      const useOne = (key: string | undefined) => {
        setSplitView(false);
        if (gapsSplit(written) && key) apply(relinkOps(written, key), `Gap → ${tokenName(key)}`);
      };
      const separate = [{ key: "__separate__", label: "Separate row and column gaps", run: () => setSplitView(true) }];
      const joinWith = (own: unknown) => {
        const key = typeof own === "string" ? own : choices[0];
        return [{ key: "__one__", label: key ? `Use ${key} for both` : "Use one gap", run: () => useOne(key) }];
      };
      groups.push(
        <InspectorFields
          key="grid-gap"
          own={ownOf("gap", "rowGap", "columnGap")}
          labels={split ? ["Column gap", "Row gap"] : ["Gap"]}
          code={split ? "Grid columnGap · rowGap" : "Grid gap"}
          fields={split ? [
            scale("columnGap", "Column gap", "icon-spacing-width-01-line", (key) => apply([{ op: "setProp", name: "columnGap", value: { kind: "string", value: key } }], `Column gap → ${tokenName(key)}`), { actions: joinWith(written.columnGap) }),
            scale("rowGap", "Row gap", "icon-spacing-height-01-line", (key) => apply([{ op: "setProp", name: "rowGap", value: { kind: "string", value: key } }], `Row gap → ${tokenName(key)}`), { actions: joinWith(written.rowGap) }),
          ] : [scale("gap", "Gap", "icon-layout-grid-01-line", (key) => apply(gapOps(written, key), `Gap → ${tokenName(key)}`), { actions: separate }), <span key="none" />]}
        />,
      );
      handled.add("gap");
      handled.add("rowGap");
      handled.add("columnGap");
    }
    if (spec("columns") && plain("minColumnWidth")) {
      const columnsField = <ColumnsField key="columns" attributes={attributes} minColumnWidth={written.minColumnWidth as number | string | undefined} minFallback={typeof spec("minColumnWidth")?.defaultValue === "number" ? (spec("minColumnWidth")!.defaultValue as number) : 240} host={host} disabled={disabled} apply={apply} />;
      // Code the inspector cannot read (a variable, a spread object) keeps the columns row.
      const readable = state("columns") !== "spread" && !(state("columns") === "bound" && !attributes.some((attr) => attr.kind === "expression" && attr.name === "columns" && (attr.shape?.type === "object" || /^\s*(\d+|(["'`])[^"'`$]*\2)\s*$/.test(attr.value ?? ""))));
      if (readable) {
        handled.add("columns");
        handled.add("minColumnWidth");
        groups.push(columnsField);
      }
    }
  }

  // ── Padding: Figma's Horizontal | Vertical fields (Stack, Box); equal axes write one padding. Grid has one. ──
  if (spec("padding") && (spec("paddingX") || spec("paddingY")) && plain("padding", "paddingX", "paddingY")) {
    const axisField = (axis: "x" | "y") => {
      const name = axis === "x" ? "paddingX" : "paddingY";
      const shown = axisPadding(written, axis);
      return scale(name, axis === "x" ? "Horizontal padding" : "Vertical padding", axis === "x" ? "icon-spacing-width-02-line" : "icon-spacing-height-02-line", (key) => apply(axisPaddingOps(written, axis, key), `${axis === "x" ? "Horizontal" : "Vertical"} padding → ${tokenName(key, "padding")}`), {
        value: typeof shown === "string" ? shown : undefined,
        // ⌫ removes the axis's own value (it falls back to padding); a value it only inherits stays.
        onReset: written[name] !== undefined ? () => removeProp(name) : undefined,
      });
    };
    groups.push(<InspectorFields key="padding" own={ownOf("padding", "paddingX", "paddingY")} labels={["Padding"]} code={`${component} paddingX · paddingY (padding when equal)`} fields={[axisField("x"), axisField("y")]} />);
    handled.add("padding");
    handled.add("paddingX");
    handled.add("paddingY");
  }

  // Grid's one padding (no per-axis props).
  if (component === "Grid" && spec("padding") && !spec("paddingX") && plain("padding")) {
    groups.push(<InspectorFields key="grid-padding" own={ownOf("padding")} labels={["Padding"]} code="Grid padding" fields={[scale("padding", "Padding", "icon-grid-dots-outer-line", (key) => apply([{ op: "setProp", name: "padding", value: { kind: "string", value: key } }], `Padding → ${tokenName(key, "padding")}`)), <span key="none" />]} />);
  }

  // ── Hide on <breakpoint> (edit/hideOn.ts): the library's hideOn, shown with the Breakpoint row or once written ──
  const hideOnAttr = attributes.filter((attr) => attr.kind !== "spread" && attr.name === "hideOn").at(-1);
  const hideOnList = hideOnAttr?.kind === "expression" && /^\[\s*(?:(["'])(?:desktop|tablet|mobile)\1\s*,?\s*)*\]$/.test((hideOnAttr.value ?? "").trim())
    ? [...(hideOnAttr.value ?? "").matchAll(/(desktop|tablet|mobile)/g)].map((match) => match[1] as Breakpoint) : hideOnAttr ? null : [];
  if (HIDE_ON_LAYERS.has(component) && hideOnList && (hideOnList.length || frameBreakpoint !== primary || perBreakpoint.length || picked)) {
    handled.add("hideOn");
    groups.push(
      <InspectorFields
        key="hide-on"
        name="hideOn"
        labels={["Hide on"]}
        code={`${component} hideOn`}
        fields={[(
          <div key="hide-on" className="studio-layout-hide-on">
            {BREAKPOINTS.map((key) => (
              <Checkbox key={key} label={BREAKPOINT_LABELS[key]} checked={hideOnList.includes(key)} disabled={disabled} onCheckedChange={(next) => { const ops = [hideOnOp(toggledHideOn(hideOnList, key, next))]; void api.apply(ops, `${component} ${next ? "hidden" : "shown"} on ${BREAKPOINT_LABELS[key]}`, optimisticOf(ops)); }} />
            ))}
          </div>
        )]}
      />,
    );
  }

  // ── Clip content (Stack, Grid and Box clip: any frame, as in Figma), under Padding ──
  if (spec("clip") && plain("clip")) {
    handled.add("clip");
    const clipped = written.clip === true;
    groups.push(
      <InspectorFields
        key="clip"
        name="clip"
        code={`${component} clip`}
        fields={[<Checkbox key="clip" label="Clip content" checked={clipped} disabled={disabled} onCheckedChange={(next) => apply(next ? [{ op: "setProp", name: "clip", value: { kind: "boolean", value: true } }] : [{ op: "removeProp", name: "clip" }], next ? "clip content" : "clip content off")} />]}
      />,
    );
  }

  // ── FormActions: alignment; side inset only when pinned ──
  if (component === "FormActions" && spec("align") && plain("align")) {
    handled.add("align");
    const value = typeof written.align === "string" ? written.align : "end";
    groups.push(
      <InspectorFields
        key="actions-align"
        name="align"
        labels={["Alignment"]}
        code="FormActions align"
        fields={[
          <Seg
            key="align"
            label="Alignment"
            value={value}
            unset={written.align === undefined}
            disabled={disabled}
            options={[
              { id: "start", icon: "icon-flex-align-left-line", name: "Start" },
              { id: "between", icon: "icon-distribute-spacing-horizontal-line", name: "Space between" },
              { id: "end", icon: "icon-flex-align-right-line", name: "End" },
            ]}
            onPick={(next) => apply(next === "end" ? [{ op: "removeProp", name: "align" }] : [{ op: "setProp", name: "align", value: { kind: "string", value: next } }], `Alignment → ${optionLabel(next)}`)}
          />,
        ]}
      />,
    );
    if (spec("inset") && written.sticky !== true && written.inset === undefined && plain("inset")) handled.add("inset");
  }

  // Everything else keeps its row (bound or spread values, Container, Form gap, FormFieldset gap, Grid padding…).
  const rest = specs.filter((candidate) => !handled.has(candidate.name)).map((candidate) => field(candidate.name));
  const warnings = layoutWarnings(component, written);
  // Figma's Auto layout header (user, 2026-10-17: "Convert được Box(Frame) to Stack(auto layout)"): + on a frame without
  // auto layout turns it into one (⇧A), − on an auto layout frame takes it away (⌥⇧A); layers keep where they show.
  const frameAlone = component === "Box" && isFrameWithoutAutoLayout(selection);
  const autoLayoutAlone = component === "Stack" && isAutoLayoutFrame(selection);
  const removeAction = autoLayoutAlone ? <IconButton icon="icon-minus-line" appearance="flat" size="xs" aria-label="Remove auto layout" tooltip={tip("Remove auto layout", removeAutoLayoutShortcut)} disabled={disabled} onClick={() => { void removeAutoLayoutFromSelection(); }} /> : undefined;
  return (
    <>
    {frameAlone ? (
      <InspectorSection
        title="Auto layout"
        className="studio-inspector__section--head-only"
        actions={<IconButton icon="icon-plus-line" appearance="flat" size="xs" aria-label="Add auto layout" tooltip={tip("Add auto layout", autoLayoutShortcut)} disabled={disabled} onClick={() => { void addAutoLayoutToSelection(); }} />}
      >
        {null}
      </InspectorSection>
    ) : null}
    <InspectorSection title={component === "Stack" || component === "Grid" || component === "FormFieldset" ? "Auto layout" : "Layout"} note={note} fieldGrid actions={removeAction} responsive={responsive.length > 0}>
      {groups}
      {rest}
      {warnings.map((warning) => (
        <div key={warning.prop} className="studio-layout-warning" data-prop={`warning-${warning.prop}`}>
          <p className={`studio-layout-warning__text ${typographyStyles["Body/Small/Regular"]}`}>
            <Icon name="icon-alert-triangle-line" size="sm" decorative />
            {warning.text}
          </p>
          {/* zen-allow-destructive: removes a prop that does nothing here, as one undoable draft edit; not an irreversible delete */}
          <Button appearance="flat" level="primary" size="sm" disabled={disabled} onClick={() => apply(warning.fix, `remove ${warning.prop}`)}>Remove</Button>
        </div>
      ))}
    </InspectorSection>
    </>
  );
}
