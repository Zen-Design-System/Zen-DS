import { useState, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { Segmented } from "../../../components/Segmented";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { EditOp, SourceAttr } from "../types";
import { AlignmentBox } from "./controls/AlignmentBox";
import { ColumnsField } from "./controls/ColumnsField";
import { ScaleField } from "./controls/ScaleField";
import "./controls/controls.css";
import type { FieldApi } from "./fieldApi";
import {
  alignView, crossOps, flowOf, flowOps, gapAutoOps, gapOps, gapsSplit, layoutWarnings, paddingAxial, relinkChoices, relinkOps, uniformPadding,
  uniformPaddingOps, type CrossMode, type Flow, type Literal, type Written,
} from "./layoutModel";
import { PropField } from "./PropField";
import { propLabel, type PropSpec, type PropValue } from "./propSchema";
import { InspectorRow, InspectorSection } from "./Section";

/*
 * The Layout section (spec docs/research/studio-inspector-redesign-2026-10-03.md, Phases 3, 4 and 6; plan WP-D): one
 * control per concept, each gesture one apply (one undo step) planned by layoutModel.ts.
 *   Stack     Flow (Vertical · Horizontal · Wrap), Size, the alignment box beside Gap (with Auto) and the cross axis,
 *             Padding (all sides or per axis).
 *   Grid      Size, Align cells, Gap (one, or row and column), Columns (Auto-fit · Count · Tracks, per breakpoint), Padding.
 *   Box       Size, Padding.   FormFieldset: Flow (2), Gap.   FormActions: Alignment, Side inset (when pinned).
 *   others    their rows as before (Container max width and page margin, Form gap).
 * A value the source binds or spreads keeps its own row (PropField: edited in place when it may be, else read-only), so
 * the grouped controls only ever show literals. Written props that do nothing here get a warning with Remove.
 */

/** The props a written literal is read for (the model's `Written`). */
const READ = ["direction", "wrap", "align", "justify", "gap", "rowGap", "columnGap", "padding", "paddingX", "paddingY", "columns", "minColumnWidth", "inset", "sticky"];

/** What an apply shows at once: a set prop as its literal, a removed one as unset. */
function optimisticOf(ops: EditOp[]): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const op of ops) {
    if (op.op === "setProp" && op.value.kind !== "expression") out[op.name] = { state: "literal", value: op.value.value, raw: "" };
    else if (op.op === "removeProp") out[op.name] = { state: "unset" };
  }
  return out;
}

/** A group: its label above the controls (Figma UI3), `name` for data-prop. */
function Group({ label, name, children }: { label: string; name?: string; children: ReactNode }) {
  return (
    <div className="studio-layout-group" role="group" aria-label={label} data-prop={name}>
      <span className={`studio-layout-group__label ${typographyStyles["Body/Small/Regular"]}`}>{label}</span>
      {children}
    </div>
  );
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

const resetButton = (label: string, onClick: () => void) => <IconButton icon="icon-reverse-left-line" aria-label={label} appearance="flat" level="primary" size="xs" onClick={onClick} />;

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
  const [axialView, setAxialView] = useState<boolean | null>(null);
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

  /** A plain row (PropField), as every prop the groups do not take. */
  const field = (name: string, label?: string) => {
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
    const items: Array<{ id: Flow; icon: string; name: string }> = [
      { id: "vertical", icon: "icon-arrow-down-line", name: "Vertical" },
      { id: "horizontal", icon: "icon-arrow-right-line", name: component === "FormFieldset" ? "Horizontal (wraps)" : "Horizontal" },
      ...(spec("wrap") ? [{ id: "wrap" as const, icon: "icon-corner-down-left-line", name: "Wrap" }] : []),
    ];
    const anyWritten = written.direction !== undefined || written.wrap !== undefined;
    groups.push(
      <InspectorRow key="flow" name="direction" label="Direction" labelTitle="Direction · direction, wrap" isDefault={!anyWritten} action={anyWritten && !disabled ? resetButton("Reset direction", () => apply(flowOps(written, "vertical"), "reset direction")) : null}>
        <Seg label="Direction" value={flow} unset={!anyWritten} disabled={disabled} options={items} onPick={(next) => apply(flowOps(written, next as Flow), `flow → ${next}`)} />
      </InspectorRow>,
    );
  }

  if (sizing) groups.push(<div key="size">{sizing}</div>);

  // ── Alignment + Gap (Stack) ──
  if (component === "Stack" && spec("align") && spec("justify") && plain("align", "justify")) {
    handled.add("align");
    handled.add("justify");
    const gapPlain = Boolean(spec("gap")) && plain("gap");
    const crossItems: Array<{ id: CrossMode; icon: string; name: string }> = row
      ? [{ id: "position", icon: "icon-align-vertical-center-01-line", name: "Position" }, { id: "stretch", icon: "icon-chevron-selector-vertical-line", name: "Stretch" }, { id: "baseline", icon: "icon-type-01-line", name: "Text baseline" }]
      : [{ id: "position", icon: "icon-align-horizontal-centre-01-line", name: "Position" }, { id: "stretch", icon: "icon-chevron-selector-horizontal-line", name: "Stretch" }];
    const alignWritten = written.align !== undefined || written.justify !== undefined;
    groups.push(
      <Group key="align" label="Alignment" name="align justify">
        <div className="studio-layout-align">
          <AlignmentBox written={written} disabled={disabled} onOps={(ops, label) => apply(ops, label)} />
          <div className="studio-layout-align__side">
            {gapPlain ? scale("gap", "Gap", row ? "icon-spacing-width-01-line" : "icon-spacing-height-01-line", (key) => apply(key === "auto" ? gapAutoOps(written) : gapOps(written, key), key === "auto" ? "gap → Auto (space between)" : `gap → ${key}`), {
              value: view.auto ? "auto" : undefined,
              extras: [{ key: "auto", label: "Auto" }],
              onReset: view.auto ? () => apply([{ op: "removeProp", name: "justify" }], "Auto off") : written.gap !== undefined ? () => api.removeProp("gap") : undefined,
            }) : field("gap")}
            <Seg
              label="Cross axis"
              value={view.cross}
              unset={view.crossDefault}
              disabled={disabled}
              options={crossItems}
              onPick={(next) => apply(crossOps(written, next as CrossMode), `cross axis → ${next}`)}
            />
          </div>
          <span className="studio-layout-group__slot">{alignWritten && !disabled ? resetButton("Reset alignment", () => apply([...(written.align !== undefined ? [{ op: "removeProp", name: "align" } as EditOp] : []), ...(written.justify !== undefined ? [{ op: "removeProp", name: "justify" } as EditOp] : [])], "reset alignment")) : null}</span>
        </div>
      </Group>,
    );
  }

  // ── Grid: align cells, gap (one or two), columns ──
  if (component === "Grid") {
    if (spec("align") && plain("align")) {
      handled.add("align");
      const value = typeof written.align === "string" ? written.align : "stretch";
      groups.push(
        <Group key="grid-align" label="Alignment" name="align">
          <div className="studio-layout-group__row">
            <Seg
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
            />
            <span className="studio-layout-group__slot">{written.align !== undefined && !disabled ? resetButton("Reset alignment", () => api.removeProp("align")) : null}</span>
          </div>
        </Group>,
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
        <Group key="grid-gap" label="Gap">
          {split ? (
            <div className="studio-layout-group__row" data-pair="true">
              {scale("columnGap", "Column gap", "icon-spacing-width-01-line", (key) => apply([{ op: "setProp", name: "columnGap", value: { kind: "string", value: key } }], `column gap → ${key}`))}
              {scale("rowGap", "Row gap", "icon-spacing-height-01-line", (key) => apply([{ op: "setProp", name: "rowGap", value: { kind: "string", value: key } }], `row gap → ${key}`))}
              <span className="studio-layout-group__slot">{relink}</span>
            </div>
          ) : (
            <div className="studio-layout-group__row">
              {scale("gap", "Gap", "icon-layout-grid-01-line", (key) => apply(gapOps(written, key), `gap → ${key}`))}
              <span className="studio-layout-group__slot">{relink}</span>
            </div>
          )}
        </Group>,
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

  // ── Padding: all sides or per axis (Stack, Box); Grid has one ──
  if (spec("padding") && (spec("paddingX") || spec("paddingY")) && plain("padding", "paddingX", "paddingY")) {
    const axial = axialView ?? paddingAxial(written);
    const uniform = uniformPadding(written);
    const mixed = uniform === null;
    const resetAll = () => apply(["padding", "paddingX", "paddingY"].filter((name) => written[name] !== undefined).map((name): EditOp => ({ op: "removeProp", name })), "reset padding");
    groups.push(
      <Group key="padding" label="Padding">
        <div className="studio-layout-group__row" data-pair={axial || undefined}>
          {axial ? (
            <>
              {scale("paddingX", "Horizontal padding", "icon-spacing-width-02-line", (key) => apply([{ op: "setProp", name: "paddingX", value: { kind: "string", value: key } }], `horizontal padding → ${key}`))}
              {scale("paddingY", "Vertical padding", "icon-spacing-height-02-line", (key) => apply([{ op: "setProp", name: "paddingY", value: { kind: "string", value: key } }], `vertical padding → ${key}`))}
            </>
          ) : scale("padding", "Padding", "icon-grid-dots-outer-line", (key) => apply(uniformPaddingOps(written, key), `padding → ${key}`), {
            value: mixed ? undefined : uniform ?? undefined,
            placeholder: mixed ? `Mixed · ${String(written.paddingX ?? written.padding ?? "none")} / ${String(written.paddingY ?? written.padding ?? "none")}` : undefined,
            onReset: written.padding !== undefined || written.paddingX !== undefined || written.paddingY !== undefined ? resetAll : undefined,
          })}
          <span className="studio-layout-group__slot">
            {/* zen-allow-secondary: a pressed toolbar toggle (the view of the padding fields), as CodeView's "Wrap lines" */}
            <IconButton
              icon="icon-grid-dots-outer-line"
              aria-label="Same padding on all sides"
              aria-pressed={!axial}
              appearance="flat"
              level={axial ? "primary" : "secondary"}
              size="xs"
              onClick={() => setAxialView(!axial)}
            />
          </span>
        </div>
      </Group>,
    );
    handled.add("padding");
    handled.add("paddingX");
    handled.add("paddingY");
  }

  // Grid's one padding (no per-axis props).
  if (component === "Grid" && spec("padding") && !spec("paddingX") && plain("padding")) {
    groups.push(
      <Group key="grid-padding" label="Padding">
        <div className="studio-layout-group__row">
          {scale("padding", "Padding", "icon-grid-dots-outer-line", (key) => apply([{ op: "setProp", name: "padding", value: { kind: "string", value: key } }], `padding → ${key}`))}
          <span className="studio-layout-group__slot" />
        </div>
      </Group>,
    );
  }

  // ── FormActions: alignment; side inset only when pinned ──
  if (component === "FormActions" && spec("align") && plain("align")) {
    handled.add("align");
    const value = typeof written.align === "string" ? written.align : "end";
    groups.push(
      <Group key="actions-align" label="Alignment" name="align">
        <div className="studio-layout-group__row">
          <Seg
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
          />
          <span className="studio-layout-group__slot">{written.align !== undefined && !disabled ? resetButton("Reset alignment", () => api.removeProp("align")) : null}</span>
        </div>
      </Group>,
    );
    if (spec("inset") && written.sticky !== true && written.inset === undefined && plain("inset")) handled.add("inset");
  }

  // Everything else keeps its row (bound or spread values, Container, Form gap, FormFieldset gap, Grid padding…).
  const rest = specs.filter((candidate) => !handled.has(candidate.name)).map((candidate) => field(candidate.name));
  const warnings = layoutWarnings(component, written);
  return (
    <InspectorSection title="Layout" note={note}>
      {groups}
      {rest}
      {warnings.map((warning) => (
        <div key={warning.prop} className="studio-layout-warning" data-prop={`warning-${warning.prop}`}>
          <p className={`studio-layout-warning__text ${typographyStyles["Body/Small/Regular"]}`}>
            <Icon name="icon-alert-triangle-line" size="sm" decorative />
            {warning.text}
          </p>
          <Button appearance="flat" level="primary" size="sm" disabled={disabled} onClick={() => apply(warning.fix, `remove ${warning.prop}`)}>Remove</Button>
        </div>
      ))}
    </InspectorSection>
  );
}
