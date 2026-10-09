import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { SelectField } from "../../../components/Input";
import { Heading } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyCssEdit } from "../api";
import { canvasApi } from "../canvas/viewport";
import { confirmDiscard, requestSave, useStudioDrafts } from "../sourceDrafts";
import { InspectorRow, InspectorSection } from "../inspector/Section";
import { ValueCell } from "../inspector/PartPanel";
import { canEdit, studioStore, useStudio } from "../store";
import { invalidateCssIndex, styleRows, type Declaration, type StyleRow } from "./cssResolve";
import { variantElement, variantLabel, variantRoot, cellElement, type VariantSelection } from "./model";
import { findSet, setFilter, toggleOn, filterStore } from "./sets";
import { TokenField } from "./TokenField";
import { isDocumentToken } from "./tokens";
import type { VariantSet } from "./variantSets.generated";
import "./mainComponent.css";

/*
 * The Inspector for a variant or a layer of the Main component frame (spec §2, M1: read only). Its variant properties
 * switch to another variant of the set as Figma's do; then every style the library's CSS sets on the layer, grouped as
 * Figma's Design panel, each with the token it reads, the custom properties in between and the variants the rule that
 * sets it covers ("Size = xs · every Level, State").
 */

const GROUPS: ReadonlyArray<{ title: string; test: (prop: string) => boolean }> = [
  { title: "Layout", test: (prop) => /^(width|height|min-|max-|padding|gap|row-gap|column-gap|margin|inset|top|left|right|bottom|flex|align|justify|display|aspect)/.test(prop) },
  { title: "Appearance", test: (prop) => /^(background|border|outline|box-shadow|opacity|backdrop|filter|fill|stroke)/.test(prop) },
  { title: "Text", test: (prop) => /^(color|font|line-height|letter-spacing|text-|white-space)/.test(prop) },
];
const COLOUR = /^(color|background-color|background|border(-\w+)?-color|outline-color|fill|stroke)$/;

const label = (prop: string) => prop[0].toUpperCase() + prop.slice(1).replace(/-/g, " ");
const short = (name: string) => name.replace(/^--zen-/, "");
const fileName = (file: string) => file.split("/").pop() ?? file;

/** "Size = xs · every Level, State": the variant attributes a rule requires, named by the set's axes. */
function scopeText(declaration: Declaration, set: VariantSet | null): string {
  const entries = Object.entries(declaration.scope);
  // The base rule: every variant takes it unless a variant's own rule sets the property (Primary is Button's base).
  if (!entries.length) return declaration.selector === "style" ? "inline style" : `base rule ${declaration.selector}, unless a variant rule overrides it`;
  const axes = set?.axes ?? [];
  const named = entries.map(([attribute, value]) => {
    const prop = attribute.replace(/^data-/, "").replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
    const axis = axes.find((item) => item.prop === prop);
    return { axis, text: `${axis?.label ?? attribute.replace(/^data-/, "")} = ${value || "set"}` };
  });
  const free = axes.filter((axis) => !named.some((item) => item.axis === axis)).map((axis) => axis.label);
  return `${named.map((item) => item.text).join(", ")}${free.length ? ` · every ${free.join(", ")}` : ""}`;
}

function useRows(selection: VariantSelection): { rows: StyleRow[]; found: boolean } {
  const [tick, setTick] = useState(0);
  // A CSS file hot-updated (an edit, a save): read the rules again.
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) return undefined;
    const refresh = () => { invalidateCssIndex(); setTick((value) => value + 1); };
    hot.on("vite:afterUpdate", refresh);
    return () => hot.off?.("vite:afterUpdate", refresh);
  }, []);
  return useMemo(() => {
    void tick;
    const world = canvasApi.getWorldElement();
    const element = world ? variantElement(world, selection) : null;
    if (!world || !element) return { rows: [], found: false };
    return { rows: styleRows(element, variantRoot(cellElement(world, selection))), found: true };
  }, [selection, tick]);
}

export function VariantPanel({ selection }: { selection: VariantSelection }) {
  const set = findSet(selection.component, selection.set);
  const { rows: all, found } = useRows(selection);
  // What a token decides is what an admin changes; layout mechanics (display, align-items) are listed by name only.
  const rows = all.filter((row) => row.chain.length);
  const fixed = all.filter((row) => !row.chain.length).map((row) => row.prop);
  const groups = GROUPS.map((group) => ({ ...group, rows: rows.filter((row) => group.test(row.prop)) }));
  const other = rows.filter((row) => !GROUPS.some((group) => group.test(row.prop)));
  const layer = selection.path.length > 0;
  const choose = (prop: string, value: string) => {
    if (!set) return;
    const gridAxis = set.axes.findIndex((axis) => axis.prop === prop) < 2;
    if (!gridAxis) setFilter(set.name, prop, value);
    const variant = { ...selection.variant, [prop]: value };
    studioStore.setState({ selection: { ...selection, variant, name: layer ? selection.name : variantLabel(variant, set.axes) } });
  };
  const filters = set ? filterStore.get(set.name) : {};
  return (
    <div className="studio-inspector__panel">
      <header className="studio-inspector__head-block">
        <div className="studio-inspector__title-row">
          <span className="studio-inspector__kind-icon" aria-hidden="true"><Icon name={layer ? "icon-layers-three-01-line" : "icon-grid-01-line"} size={16} /></span>
          <Heading level={2} textStyle="Body/Small/Bold" truncate title={selection.name}>{layer ? selection.name : selection.component}</Heading>
          <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>{layer ? "Layer" : "Variant"}</Badge>
        </div>
        <p className={`studio-inspector__description ${typographyStyles["Body/Small/Regular"]}`}>{selection.set}{layer ? ` · ${set ? variantLabel(selection.variant, set.axes) : ""}` : ""}</p>
      </header>

      {set ? (
        <InspectorSection title="Variant">
          {set.axes.map((axis) => (
            <InspectorRow key={axis.prop} label={axis.label} name={axis.prop}>
              <SelectField
                aria-label={axis.label}
                size="sm"
                value={selection.variant[axis.prop] ?? axis.default}
                onValueChange={(value) => choose(axis.prop, value)}
                options={axis.values.map((value, index) => ({ value, label: axis.names[index] }))}
              />
            </InspectorRow>
          ))}
          {set.toggles.map((toggle) => (
            <InspectorRow key={toggle.prop} label={toggle.label} name={toggle.prop}>
              <SelectField
                aria-label={toggle.label}
                size="sm"
                value={toggleOn(toggle, filters) ? "on" : "off"}
                onValueChange={(value) => setFilter(set.name, toggle.prop, value)}
                options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]}
              />
            </InspectorRow>
          ))}
        </InspectorSection>
      ) : null}

      {!found ? <div className="studio-mc__notes"><p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>This variant is not on the canvas.</p></div> : null}
      {[...groups, { title: "Other", rows: other }].filter((group) => group.rows.length).map((group) => (
        <InspectorSection key={group.title} title={group.title}>
          {group.rows.map((row) => <StyleRowView key={row.prop} row={row} set={set} component={selection.component} />)}
        </InspectorSection>
      ))}
      <div className="studio-mc__notes">
        {found && !rows.length ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>No token styles this layer.</p> : null}
        {fixed.length ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>Fixed in the CSS (no token): {fixed.join(", ")}.</p> : null}
        <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>
          A token changes for every variant its rule covers. Text styles and icons are set in {selection.component}.tsx.
        </p>
        <CssDrafts files={[...new Set(all.map((row) => row.declaration.file).concat(all.flatMap((row) => row.chain.map((step) => step.file))).filter((file) => file.startsWith("src/components/")))]} />
      </div>
    </div>
  );
}

/** The component's stylesheets with draft changes: saved (the harness and, from M3, the Figma check run) or discarded. */
function CssDrafts({ files }: { files: string[] }) {
  const drafts = useStudioDrafts();
  const pending = drafts.drafts.map((row) => row.file).filter((file) => files.includes(file));
  if (!pending.length) return null;
  return (
    <div className="studio-mc__drafts">
      <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>Draft: {pending.map(fileName).join(", ")} — not saved yet.</p>
      <div className="studio-inspector__actions">
        <Button appearance="main" size="sm" level="primary" disabled={Boolean(drafts.busy)} onClick={() => { void requestSave(pending); }}>Save</Button>
        <Button appearance="main" size="sm" level="danger-subtle" disabled={Boolean(drafts.busy)} onClick={() => confirmDiscard(pending)}>Discard</Button>
      </div>
    </div>
  );
}

function StyleRowView({ row, set, component }: { row: StyleRow; set: VariantSet | null; component: string }) {
  const steps = [row.declaration, ...row.chain];
  const token = row.chain.length ? short(row.chain[row.chain.length - 1].prop) : undefined;
  // The step the variant decides: the first one in the component's own CSS that a variant attribute scopes.
  // The one that reads a token of the design system is what an admin changes (`border-radius: var(--zen-button-radius)`
  // reads the component's own variable; its value on that size reads the token). Else the component's step nearest the
  // token (Primary's colour sits in the base rule: its own variable's value).
  const own = (step: Declaration) => step.file.startsWith("src/components/");
  const readsToken = (step: Declaration) => isDocumentToken(/^var\(\s*(--zen-[a-z0-9-]+)\s*\)$/.exec(step.value)?.[1] ?? "");
  const scoped = steps.find((step) => own(step) && Object.keys(step.scope).length && readsToken(step))
    ?? steps.find((step) => own(step) && Object.keys(step.scope).length)
    ?? [...steps].reverse().find((step) => own(step) && readsToken(step))
    ?? [...steps].reverse().find(own) ?? row.declaration;
  const hint = [
    `${fileName(scoped.file)} · ${scopeText(scoped, set)}${row.inherited ? " · inherited" : ""}`,
    row.chain.map((step) => short(step.prop)).join(" → "),
  ].filter(Boolean).join("\n");
  // The step an admin changes: the variant's own declaration, when it reads one token (a value written in px stays).
  const role = useStudio((state) => state.role);
  const reads = /^var\(\s*(--zen-[a-z0-9-]+)\s*\)$/.exec(scoped.value)?.[1] ?? null;
  const editable = reads && scoped.file.startsWith("src/components/") && scoped.selector !== "style" ? reads : null;
  const pick = (name: string) => {
    void applyCssEdit(
      { file: scoped.file, selector: scoped.selector, media: scoped.media, prop: scoped.prop, value: `var(${name})` },
      `${component} ${label(row.prop).toLowerCase()} → ${short(name)}`,
    );
  };
  return (
    <InspectorRow label={label(row.prop)} name={row.prop} labelTitle={`${row.prop}: ${row.declaration.value}\n${scoped.selector}`} hint={<span className="studio-mc__hint">{hint}</span>}>
      {editable ? (
        <div className="studio-mc__edit">
          <TokenField label={label(row.prop)} prop={row.prop} token={editable} disabled={role !== "admin" || !canEdit()} onPick={pick} />
          <ValueCell value={row.computed || row.declaration.value} swatch={COLOUR.test(row.prop) ? row.computed : undefined} />
        </div>
      ) : (
        <ValueCell value={row.computed || row.declaration.value} tokens={token ? [token] : []} swatch={COLOUR.test(row.prop) ? row.computed : undefined} />
      )}
    </InspectorRow>
  );
}
