import { createContext, useContext, useId, type ReactNode } from "react";
import { Heading } from "../../../components/Text";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";

/** Inside a section on Figma's field grid: its plain rows (InspectorRow, PropField) put the label above as well. */
const FieldGridContext = createContext(false);

/**
 * A titled inspector block (Figma's "Layout", "Text"…): title row with optional actions, then its rows. `fieldGrid`: the
 * section is on Figma UI3's field grid (InspectorFields), and its plain rows follow it — label above, the control across
 * the two field columns, an action in the icon column (spec docs/research/studio-inspector-figma-spec-2026-10-09.md §1).
 */
export function InspectorSection({ title, actions, children, note, className, fieldGrid = false }: { title: ReactNode; actions?: ReactNode; children: ReactNode; note?: ReactNode; className?: string; fieldGrid?: boolean }) {
  const id = useId();
  return (
    <section className={["studio-inspector__section", className].filter(Boolean).join(" ")} aria-labelledby={id} data-field-grid={fieldGrid || undefined}>
      <div className="studio-inspector__section-head">
        <Heading id={id} level={3} textStyle="Body/Small/Bold">{title}</Heading>
        {actions ? <div className="studio-inspector__section-actions">{actions}</div> : null}
      </div>
      {note ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{note}</p> : null}
      <div className="studio-inspector__section-body"><FieldGridContext.Provider value={fieldGrid}>{children}</FieldGridContext.Provider></div>
    </section>
  );
}

/**
 * One label + control row: label column, then the control filling the rest. A row with an action (Remove effect, Restore
 * a binding, Min and max) adds a trailing slot sized like an xs IconButton; inputs have no per-field reset (user,
 * 2026-10-09: inputs read the same everywhere; "Reset all overrides" sets a component back). `isDefault` shows the
 * control's value in the lighter default tone. `name` (the prop, or several space-separated) lets other rows point at
 * it (data-prop: "Edit size" focuses the size row). `labelTitle` is the label's tooltip (the prop's own name).
 * `compact`: a 24px row (the Design tab header's label/value rows). `bound`: the value comes from code — a ƒ after the
 * label, the expression and what an edit does in its tooltip (and read to screen readers), never a line of its own.
 */
export function InspectorRow({ label, children, action, hint, isDefault, name, labelTitle, compact, bound }: { label: ReactNode; children: ReactNode; action?: ReactNode; hint?: ReactNode; isDefault?: boolean; name?: string; labelTitle?: string; compact?: boolean; bound?: RowBinding }) {
  const stacked = useContext(FieldGridContext) && !compact;
  return (
    <div className="studio-inspector__row" data-default={isDefault || undefined} data-prop={name} data-compact={compact || undefined} data-bound={bound ? "true" : undefined} data-action={action ? "true" : undefined} data-stacked={stacked || undefined}>
      <span className={`studio-inspector__row-label ${typographyStyles[stacked ? "Caption/Regular" : "Body/Small/Regular"]}`} title={labelTitle}>
        {label}
        {bound ? <BoundMark binding={bound} /> : null}
      </span>
      <div className="studio-inspector__row-control">{children}</div>
      {action ? <div className="studio-inspector__row-action">{action}</div> : null}
      {hint ? <p className={`studio-inspector__row-hint ${typographyStyles["Body/Small/Regular"]}`}>{hint}</p> : null}
    </div>
  );
}

/**
 * Figma UI3's field grid (docs/research/studio-inspector-figma-spec-2026-10-09.md §1): two equal field columns and a
 * 24px icon column. Labels sit above their fields (Caption/Regular): one label over the row, or one per column
 * ("Alignment" · "Gap"); a single field spans both columns. `icon` takes the icon column (Figma's wrap, min/max and
 * advanced-settings toggles); the column stays reserved when empty, so the fields of every section line up. `name` is the
 * prop (data-prop, as InspectorRow); `code` is the labels' tooltip: what Figma's word writes in code.
 */
export function InspectorFields({ labels = [], fields, icon, name, code }: { labels?: string[]; fields: ReactNode[]; icon?: ReactNode; name?: string; code?: string }) {
  const column = (index: number, count: number) => (count === 1 ? "wide" : String(index + 1));
  return (
    <div className="studio-fields" role="group" aria-label={labels.length ? labels.join(" and ") : undefined} data-prop={name} data-labelled={labels.length ? "true" : undefined}>
      {labels.map((text, index) => (
        <span key={text} className={`studio-fields__label ${typographyStyles["Caption/Regular"]}`} data-col={column(index, labels.length)} title={code}>{text}</span>
      ))}
      {fields.map((field, index) => (
        <div key={index} className="studio-fields__cell" data-col={column(index, fields.length)}>{field}</div>
      ))}
      <div className="studio-fields__icon">{icon}</div>
    </div>
  );
}

/** A row's binding: the expression the source passes, and what an edit to the control does with it. */
export type RowBinding = { expression: string; note: string };

/** ƒ after a label: the value is bound to code. Hover names the expression; screen readers hear it with the label. */
export function BoundMark({ binding }: { binding: RowBinding }) {
  const text = `Bound to {${binding.expression}}. ${binding.note}`;
  return (
    <span className={`studio-inspector__bound-mark ${typographyStyles["Body/Small/Medium"]}`} title={text}>
      <span aria-hidden="true">ƒ</span>
      <VisuallyHidden>{`, ${text}`}</VisuallyHidden>
    </span>
  );
}

/** A compact clickable list row (frames, child elements): 16px icon (a component's in the Layers hue), Body/Small/Medium name, Caption meta. */
export function InspectorItem({ icon, name, meta, onClick, component }: { icon: ReactNode; name: ReactNode; meta?: ReactNode; onClick: () => void; component?: boolean }) {
  return (
    <li className="studio-inspector__item-wrap">
      <button type="button" className="studio-inspector__item" data-component={component || undefined} onClick={onClick}>
        <span className="studio-inspector__item-icon" aria-hidden="true">{icon}</span>
        <span className={`studio-inspector__item-name ${typographyStyles["Body/Small/Medium"]}`}>{name}</span>
        {meta ? <span className={`studio-inspector__item-meta ${typographyStyles["Body/Small/Regular"]}`}>{meta}</span> : null}
      </button>
    </li>
  );
}
