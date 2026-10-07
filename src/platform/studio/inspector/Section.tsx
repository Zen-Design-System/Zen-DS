import { useId, type ReactNode } from "react";
import { Heading } from "../../../components/Text";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";

/** A titled inspector block (Figma's "Layout", "Text"…): title row with optional actions, then its rows. */
export function InspectorSection({ title, actions, children, note, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; note?: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section className={["studio-inspector__section", className].filter(Boolean).join(" ")} aria-labelledby={id}>
      <div className="studio-inspector__section-head">
        <Heading id={id} level={3} textStyle="Body/Small/Bold">{title}</Heading>
        {actions ? <div className="studio-inspector__section-actions">{actions}</div> : null}
      </div>
      {note ? <p className={`studio-inspector__note ${typographyStyles["Body/Small/Regular"]}`}>{note}</p> : null}
      <div className="studio-inspector__section-body">{children}</div>
    </section>
  );
}

/**
 * One label + control row (label column, control fills, a fixed trailing slot sized like an xs IconButton for an
 * optional action such as a reset, so a control's width never changes with its value state). `isDefault` shows the
 * control's value in the lighter default tone. `name` (the prop, or several space-separated) lets other rows point at
 * it (data-prop: "Edit size" focuses the size row). `labelTitle` is the label's tooltip (the prop's own name).
 * `compact`: a 24px row (the Design tab header's label/value rows). `bound`: the value comes from code — a ƒ after the
 * label, the expression and what an edit does in its tooltip (and read to screen readers), never a line of its own.
 */
export function InspectorRow({ label, children, action, hint, isDefault, name, labelTitle, compact, bound }: { label: ReactNode; children: ReactNode; action?: ReactNode; hint?: ReactNode; isDefault?: boolean; name?: string; labelTitle?: string; compact?: boolean; bound?: RowBinding }) {
  return (
    <div className="studio-inspector__row" data-default={isDefault || undefined} data-prop={name} data-compact={compact || undefined} data-bound={bound ? "true" : undefined}>
      <span className={`studio-inspector__row-label ${typographyStyles["Body/Small/Regular"]}`} title={labelTitle}>
        {label}
        {bound ? <BoundMark binding={bound} /> : null}
      </span>
      <div className="studio-inspector__row-control">{children}</div>
      <div className="studio-inspector__row-action">{action}</div>
      {hint ? <p className={`studio-inspector__row-hint ${typographyStyles["Body/Small/Regular"]}`}>{hint}</p> : null}
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
