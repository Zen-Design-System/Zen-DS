import { useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Checkbox } from "../../../components/Checkbox";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
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
  const [splitView, setSplitView] = useState(false);
  const spec = (name: string) => specs.find((candidate) => candidate.name === name);
  const state = (name: string) => api.valueFor(name).state;
  const literal = (name: string): Literal | undefined => {
    const value = api.valueFor(name);
    return value.state === "literal" ? value.value : undefined;
  };
  // Only literals (or nothing) are grouped: a bound or spread value keeps its own row.
  const plain = (...names: string[]) => names.every((name) => !spec(name) || state(name) === "literal" || state(name) === "unset");
  const written: Written = Object.fromEntries(READ.map((name) => [name, literal(name)]));
  const disabled = api.disabled;
  const apply = (ops: EditOp[], label: string) => { if (ops.length) void api.apply(ops, `${component} ${label}`, optimisticOf(ops)); };
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
  const scale = (name: string, label: string, leading: string, onSet: (key: string) => void, extra?: { value?: string; extras?: Array<{ key: string; label: string }>; onReset?: () => void; placeholder?: string }) => {
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
          placeholder={extra?.placeholder}
          onSet={onSet}
          onReset={extra?.onReset ?? (value !== undefined ? () => api.removeProp(name) : undefined)}
        />
      </div>
    );
  };

  const row = (written.direction === "row");
  const view = alignView(written);

  // ── Flow ──
  if ((component === "Stack" || component === "FormFieldset") && spec("direction") && plain("direction", "wrap")) {
    handled.add("direction");
    handled.add("wrap");
    const flow = flowOf(written);
    const wraps = Boolean(spec("wrap"));
    const items: Array<{ id: Flow; icon: string; name: string }> = [
      { id: "vertical", icon: "icon-arrow-down-line", name: "Vertical" },
      { id: "horizontal", icon: "icon-arrow-right-line", name: component === "FormFieldset" ? "Horizontal (wraps)" : "Horizontal" },
    ];
    const anyWritten = written.direction !== undefined || written.wrap !== undefined;
    // Figma: Wrap is the toggle beside the flow icons; on a vertical flow it turns the flow horizontal and wrapping.
    const wrapToggle = wraps ? (
      // zen-allow-secondary: a pressed toolbar toggle (Figma's wrap), as CodeView's "Wrap lines"
      <IconButton
        icon="icon-corner-down-left-line"
        aria-label="Wrap"
        aria-pressed={flow === "wrap"}
        appearance="flat"
        level={flow === "wrap" ? "secondary" : "primary"}
        size="xs"
        disabled={disabled}
        onClick={() => apply(flowOps(written, flow === "wrap" ? "horizontal" : "wrap"), flow === "wrap" ? "wrap off" : "flow → wrap")}
      />
    ) : undefined;
    groups.push(
      <InspectorFields
        key="flow"
        name="direction"
        labels={["Flow"]}
        code={wraps ? "Stack direction · wrap" : `${component} direction`}
        icon={wrapToggle}
        fields={[<Seg key="flow" label="Flow" value={flow === "wrap" ? "horizontal" : flow} unset={!anyWritten} disabled={disabled} options={items} onPick={(next) => apply(flowOps(written, next as Flow), `flow → ${next}`)} />]}
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
    const gapField = gapPlain ? scale("gap", "Gap", row ? "icon-spacing-width-01-line" : "icon-spacing-height-01-line", (key) => apply(key === "auto" ? gapAutoOps(written) : gapOps(written, key), key === "auto" ? "gap → Auto (space between)" : `gap → ${key}`), {
      value: view.auto ? "auto" : undefined,
      extras: [{ key: "auto", label: "Auto" }],
      onReset: view.auto ? () => apply([{ op: "removeProp", name: "justify" }], "Auto off") : written.gap !== undefined ? () => api.removeProp("gap") : undefined,
    }) : null;
    groups.push(
      <InspectorFields
        key="align"
        name="align justify"
        labels={gapField ? ["Alignment", "Gap"] : ["Alignment"]}
        code="Stack align · justify · gap"
        icon={<CrossMenu view={view} disabled={disabled} onPick={(mode) => apply(crossOps(written, mode), `cross axis → ${mode}`)} />}
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
              onPick={(next) => apply(next === "stretch" ? [{ op: "removeProp", name: "align" }] : [{ op: "setProp", name: "align", value: { kind: "string", value: next } }], `align → ${next}`)}
            />,
          ]}
        />,
      );
    }
    if (spec("gap") && plain("gap", "rowGap", "columnGap")) {
      const split = splitView || gapsSplit(written);
      const choices = relinkChoices(written);
      const relink = split && gapsSplit(written)
        ? (choices.length > 1
          ? <Menu aria-label="Use one gap" items={choices.map((key) => ({ id: key, label: `Use ${key} for both`, onSelect: () => { setSplitView(false); apply(relinkOps(written, key), `gap → ${key} for both`); } }))} trigger={<IconButton icon="icon-link-broken-01-line" aria-label="Use one gap" appearance="flat" level="primary" size="xs" disabled={disabled} />} />
          : <IconButton icon="icon-link-broken-01-line" aria-label="Use one gap" appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => { setSplitView(false); if (choices[0]) apply(relinkOps(written, choices[0]), `gap → ${choices[0]} for both`); }} />)
        : split
          ? <IconButton icon="icon-link-broken-01-line" aria-label="Use one gap" appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => setSplitView(false)} />
          : <IconButton icon="icon-link-01-line" aria-label="Separate row and column gaps" appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => setSplitView(true)} />;
      groups.push(
        <InspectorFields
          key="grid-gap"
          labels={split ? ["Column gap", "Row gap"] : ["Gap"]}
          code={split ? "Grid columnGap · rowGap" : "Grid gap"}
          icon={relink}
          fields={split ? [
            scale("columnGap", "Column gap", "icon-spacing-width-01-line", (key) => apply([{ op: "setProp", name: "columnGap", value: { kind: "string", value: key } }], `column gap → ${key}`)),
            scale("rowGap", "Row gap", "icon-spacing-height-01-line", (key) => apply([{ op: "setProp", name: "rowGap", value: { kind: "string", value: key } }], `row gap → ${key}`)),
          ] : [scale("gap", "Gap", "icon-layout-grid-01-line", (key) => apply(gapOps(written, key), `gap → ${key}`)), <span key="none" />]}
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
      return scale(name, axis === "x" ? "Horizontal padding" : "Vertical padding", axis === "x" ? "icon-spacing-width-02-line" : "icon-spacing-height-02-line", (key) => apply(axisPaddingOps(written, axis, key), `${axis === "x" ? "horizontal" : "vertical"} padding → ${key}`), {
        value: typeof shown === "string" ? shown : undefined,
        // ⌫ removes the axis's own value (it falls back to padding); a value it only inherits stays.
        onReset: written[name] !== undefined ? () => api.removeProp(name) : undefined,
      });
    };
    groups.push(<InspectorFields key="padding" labels={["Padding"]} code={`${component} paddingX · paddingY (padding when equal)`} fields={[axisField("x"), axisField("y")]} />);
    handled.add("padding");
    handled.add("paddingX");
    handled.add("paddingY");
  }

  // Grid's one padding (no per-axis props).
  if (component === "Grid" && spec("padding") && !spec("paddingX") && plain("padding")) {
    groups.push(<InspectorFields key="grid-padding" labels={["Padding"]} code="Grid padding" fields={[scale("padding", "Padding", "icon-grid-dots-outer-line", (key) => apply([{ op: "setProp", name: "padding", value: { kind: "string", value: key } }], `padding → ${key}`)), <span key="none" />]} />);
  }

  // ── Clip content (Box clip), under Padding as in Figma ──
  if (spec("clip") && plain("clip")) {
    handled.add("clip");
    const clipped = written.clip === true;
    groups.push(
      <InspectorFields
        key="clip"
        name="clip"
        code="Box clip"
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
            onPick={(next) => apply(next === "end" ? [{ op: "removeProp", name: "align" }] : [{ op: "setProp", name: "align", value: { kind: "string", value: next } }], `align → ${next}`)}
          />,
        ]}
      />,
    );
    if (spec("inset") && written.sticky !== true && written.inset === undefined && plain("inset")) handled.add("inset");
  }

  // Everything else keeps its row (bound or spread values, Container, Form gap, FormFieldset gap, Grid padding…).
  const rest = specs.filter((candidate) => !handled.has(candidate.name)).map((candidate) => field(candidate.name));
  const warnings = layoutWarnings(component, written);
  return (
    <InspectorSection title={component === "Stack" || component === "Grid" || component === "FormFieldset" ? "Auto layout" : "Layout"} note={note} fieldGrid>
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
  );
}
