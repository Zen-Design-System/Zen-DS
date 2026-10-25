import { createContext, useContext, useId, type ReactNode } from "react";
import { Heading } from "../../../components/Text";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";
import { useWords } from "../useWords";
import { InspectorHostContext } from "./controls/hostContext";
import { breakpointOf } from "../select/gridTracks";

/** Inside a section on Figma's field grid: its plain rows (InspectorRow, PropField) put the label above as well. */
const FieldGridContext = createContext(false);

/**
 * The label a label-left row hands its field (Figma Input/Inline-Field, user 2026-10-15): a field that takes it draws
 * it inside, on the left, with the value on the right, and the row gives the field its label column (inspector.css).
 * Controls that are not one field (a switch, a Segmented) leave it and keep the label beside them.
 */
const InlineLabelContext = createContext<ReactNode>(null);

/** The row's label for a field drawn as Figma's Inline-Field, or null outside a label-left row. */
export const useInlineLabel = () => useContext(InlineLabelContext);

/** Around a control that holds fields of its own (an icon switch and its picker): they keep their own labels. */
export function NoInlineLabel({ children }: { children: ReactNode }) {
  return <InlineLabelContext.Provider value={null}>{children}</InlineLabelContext.Provider>;
}

/**
 * A titled inspector block (Figma's "Layout", "Text"…): title row with optional actions, then its rows. `fieldGrid`: the
 * section is on Figma UI3's field grid (InspectorFields), and its plain rows follow it — label above, the control across
 * the two field columns, an action in the icon column (spec docs/research/studio-inspector-figma-spec-2026-10-09.md §1).
 */
/** `responsive`: the section edits per-breakpoint props itself (Layout); every other section of a layer in a frame
 *  narrower than desktop says its fields apply on every breakpoint (studio-responsive-breakpoints §4). */
export function InspectorSection({ title, actions, children, note, className, fieldGrid = false, responsive = false }: { title: ReactNode; actions?: ReactNode; children: ReactNode; note?: ReactNode; className?: string; fieldGrid?: boolean; responsive?: boolean }) {
  const id = useId();
  const say = useWords();
  const host = useContext(InspectorHostContext);
  const everywhere = !responsive && host?.isConnected && breakpointOf(host) !== "desktop";
  return (
    <section className={["studio-inspector__section", className].filter(Boolean).join(" ")} aria-labelledby={id} data-field-grid={fieldGrid || undefined}>
      <div className="studio-inspector__section-head">
        <Heading id={id} level={3} textStyle="Body/Small/Bold">{typeof title === "string" ? say(title) : title}</Heading>
        {everywhere ? <span className={`studio-inspector__everywhere ${typographyStyles["Caption/Regular"]}`} title="These fields are the same on every breakpoint">All breakpoints</span> : null}
        {actions ? <div className="studio-inspector__section-actions">{actions}</div> : null}
      </div>
      {note ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{typeof note === "string" ? say(note) : note}</p> : null}
      <div className="studio-inspector__section-body"><FieldGridContext.Provider value={fieldGrid}>{children}</FieldGridContext.Provider></div>
    </section>
  );
}

/**
 * One label + control row: label column, then the control filling the rest. A field control (text, number, select,
 * colour, icon, a read-only value) takes the label inside instead (useInlineLabel) and spans both columns. A row with an action (Remove effect, Restore
 * a binding, Min and max) adds a trailing slot sized like an xs IconButton; inputs have no per-field reset (user,
 * 2026-10-09: inputs read the same everywhere; "Reset all overrides" sets a component back). `isDefault` shows the
 * control's value in the lighter default tone. `name` (the prop, or several space-separated) lets other rows point at
 * it (data-prop: "Edit size" focuses the size row). `labelTitle` is the label's tooltip (the prop's own name).
 * `compact`: a 24px row (the Design tab header's label/value rows). `bound`: the value comes from code — a ƒ after the
 * label, the expression and what an edit does in its tooltip (and read to screen readers), never a line of its own.
 */
export function InspectorRow({ label, children, action, hint, isDefault, name, labelTitle, compact, bound }: { label: ReactNode; children: ReactNode; action?: ReactNode; hint?: ReactNode; isDefault?: boolean; name?: string; labelTitle?: string; compact?: boolean; bound?: RowBinding }) {
  const stacked = useContext(FieldGridContext) && !compact;
  const say = useWords();
  const inlineLabel = !stacked && !compact && label !== "" && label !== null && label !== undefined
    ? <>{label}{bound ? <BoundMark binding={bound} /> : null}</>
    : null;
  return (
    <div className="studio-inspector__row" data-default={isDefault || undefined} data-prop={name} data-compact={compact || undefined} data-bound={bound ? "true" : undefined} data-action={action ? "true" : undefined} data-stacked={stacked || undefined}>
      {/* No tooltip with the prop's name on the Design tab: Figma's labels are its words alone (UX writing audit
          2026-10-18); the Code tab shows the code. `labelTitle` stays for callers and is not shown. */}
      <span className={`studio-inspector__row-label ${typographyStyles[stacked ? "Caption/Regular" : "Body/Small/Regular"]}`} data-prop-name={labelTitle || undefined}>
        {label}
        {bound ? <BoundMark binding={bound} /> : null}
      </span>
      <div className="studio-inspector__row-control"><InlineLabelContext.Provider value={inlineLabel}>{children}</InlineLabelContext.Provider></div>
      {action ? <div className="studio-inspector__row-action">{action}</div> : null}
      {/* Under its field as Zen Input's Help-Text: Caption/Regular, Content/Neutral/Light, the Outside-Field-Gap above. */}
      {hint ? <p className={`studio-inspector__row-hint ${typographyStyles["Caption/Regular"]}`}>{typeof hint === "string" ? say(hint) : hint}</p> : null}
    </div>
  );
}

/**
 * Figma UI3's field grid (docs/research/studio-inspector-figma-spec-2026-10-09.md §1): two equal field columns and a
 * 24px icon column. Labels sit above their fields (Caption/Regular): one label over the row, or one per column
 * ("Alignment" · "Gap"); a single field spans both columns. `icon` takes the icon column (Figma's wrap, min/max and
 * advanced-settings toggles); the column stays reserved when empty, so the fields of every section line up. `name` is the
 * prop (data-prop, as InspectorRow); `code` (what Figma's word writes in code) stays on the labels as data, not a tooltip:
 * the Design tab speaks Figma's words only (UX writing audit 2026-10-18).
 */
/** `own`: the fields write a value of their own at the breakpoint being edited (a per-breakpoint prop, responsiveModel.ts):
 *  a dot after the first label. */
export function InspectorFields({ labels = [], fields, icon, name, code, own }: { labels?: string[]; fields: ReactNode[]; icon?: ReactNode; name?: string; code?: string; own?: boolean }) {
  const column = (index: number, count: number) => (count === 1 ? "wide" : String(index + 1));
  return (
    <div className="studio-fields" role="group" aria-label={labels.length ? `${labels.join(" and ")}${own ? " (own value on this breakpoint)" : ""}` : undefined} data-prop={name} data-labelled={labels.length ? "true" : undefined} data-own={own || undefined}>
      {labels.map((text, index) => (
        <span key={text} className={`studio-fields__label ${typographyStyles["Caption/Regular"]}`} data-col={column(index, labels.length)} data-code={code}>{text}</span>
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
  const text = useWords()(`Bound to {${binding.expression}}. ${binding.note}`);
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
