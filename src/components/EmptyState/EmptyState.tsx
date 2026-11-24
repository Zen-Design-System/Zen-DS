import { createContext, useContext, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from "react";
import { Button, type ButtonLevel } from "../Button";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { emptyStateActionLevels, emptyStateArt, emptyStateCaptionClass, emptyStateIllustrationClass, emptyStateModel, type EmptyStateHeadingLevel, type EmptyStateSize } from "./model";
import "./empty-state.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { dataAttributes } from "../_shared/data-attributes";

export { emptyStateSizes, type EmptyStateSize } from "./model";

export interface EmptyStateAction {
  label: ReactNode;
  onClick?: () => void;
  /** Button level; defaults to primary for `primaryAction` and tertiary for `secondaryAction`. */
  level?: ButtonLevel;
}

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root `<section>`. */
export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The root `<section>`. */
  ref?: Ref<HTMLElement>;
  /** Figma Title (Heading/4 stand-alone; Body/Extra/Bold inside a titled card or at level 4 and deeper). */
  title: ReactNode;
  /**
   * Heading level of the title, from where the Empty State sits: one level below the nearest heading above. Default 3,
   * or one below the card title inside a ChartCard (set for you). Stand-alone at level 2 or 3 the title keeps the Figma
   * Heading/4. At level 4 and deeper, and always inside a ChartCard, it uses Body/Extra/Bold so it is never larger than
   * the card title (Heading/Subheading) it sits under. In a Card you title yourself, pass the level below your title
   * (4 under the usual h3 card title) and `compactTitle`.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * For a Card you title yourself: the title uses Body/Extra/Bold, as inside a ChartCard, so it never outsizes the card
   * title above it — also when that title is an h2 in Subheading and this one an h3. Default false.
   */
  compactTitle?: boolean;
  /** Figma Caption (Body/Base/Regular, Content/Neutral/Light). */
  children?: ReactNode;
  /**
   * Illustration size, from where the Empty State sits. `md` (240, default): the Empty State fills the page's main
   * content (first run, a page with no results, no access). `sm` (200): it fills one region of a page that still shows
   * other content — a widget or Card, a table or list, a tab panel, a side panel, sheet or dialog. Default `sm` inside
   * a ChartCard (set for you).
   */
  size?: EmptyStateSize;
  /**
   * Figma Illustration: `true` renders the placeholder with `icon`; pass a node for your own art. `false` hides it —
   * avoid it: where space is short use `size="sm"` (harness: empty-state/keep-illustration).
   */
  illustration?: boolean | ReactNode;
  /** Icon at the centre of the placeholder illustration: an icon name or an icon element. */
  icon?: IconName | ReactElement;
  /** Figma CTA Primary: Button/Main Medium Primary, full width. */
  primaryAction?: EmptyStateAction;
  /** Figma CTA Secondary: Button/Main Medium Tertiary, full width. */
  secondaryAction?: EmptyStateAction;
  className?: string;
  /** Figma instance overrides: props of the illustration icon and Buttons it draws, by layer (`{ Primary: { level: "accent" }, "Illustration/Icon": { name: "icon-users-line" } }`). Written by Zen Studio;
   *  app code sets icon / primaryAction / secondaryAction. */
  overrides?: NestedOverrides;
}

/**
 * Figma Empty-State/Illustration/Placeholder (16339:69): a faded grid, a dashed and a solid circle, and an icon.
 * Size=Medium (6085:25816) 240 with a 44 icon (Popular/2XLarge); Size=Small (16339:53) 200, the same art at 5/6 scale
 * with a 36 icon (Popular/XLarge) and the same 1px grid and 2px rings. Icon Content/Placeholder.
 */
export function EmptyStateIllustration({ icon = "icon-user-circle-line", size: sizeProp = "md", ref, ...rest }: {
  icon?: IconName | ReactElement;
  /** `md` 240 (default) · `sm` 200. */
  size?: EmptyStateSize;
  /** The root `<span>` element. */
  ref?: Ref<HTMLSpanElement>;
}) {
  const nest = useNested();
  return (
    <span {...dataAttributes(rest)} ref={ref} className={emptyStateIllustrationClass(sizeProp)} aria-hidden="true">
      <svg viewBox="0 0 240 240" width="240" height="240" className="zen-empty-state__art">
        <g className="zen-empty-state__grid">
          {emptyStateArt.lines.map(({ key, ...line }) => <line key={key} {...line} />)}
        </g>
        {emptyStateArt.circles.map((circle) => <circle key={circle.className} {...circle} />)}
      </svg>
      <span className="zen-empty-state__icon">{nest("Icon", renderIcon(icon))}</span>
    </span>
  );
}

/**
 * Provided by a titled card (ChartCard) around its content, with the level of the card title. An Empty State inside
 * takes the next level and the Body/Extra/Bold title style. Internal: not exported from the package.
 */
export const EmptyStateCardContext = createContext<EmptyStateHeadingLevel | undefined>(undefined);

/**
 * Figma Empty-State (16339:135; Size=Medium 6085:25796): 320px centred column — illustration (240, or 200 at `size="sm"`), gap XSmall, then the content wrapper
 * (gap XLarge) of Title + Caption (gap 4) and the CTAs (full-width Primary + Tertiary, gap Small); padding-bottom 4XLarge.
 * Inside a ChartCard the title sits one level below the card title in Body/Extra/Bold, so it never outranks or
 * outsizes the card title (see `headingLevel`).
 */
export function EmptyState({ ref, title, headingLevel, compactTitle = false, children, size: sizeProp, illustration = true, icon, primaryAction, secondaryAction, className, overrides, ...rest }: EmptyStateProps) {
  const nest = useNested(overrides);
  const cardLevel = useContext(EmptyStateCardContext);
  const empty = emptyStateModel({ size: sizeProp, headingLevel, compactTitle, cardLevel });
  const art = illustration === true ? nest("Illustration", <EmptyStateIllustration icon={icon} size={empty.size} />) : nest.slot(illustration || null);
  const hasActions = Boolean(primaryAction || secondaryAction);
  const Heading = empty.heading;
  return (
    <section {...rest} ref={ref} className={[empty.className, className].filter(Boolean).join(" ")}>
      {art}
      <div className="zen-empty-state__body">
        <div className="zen-empty-state__content">
          <Heading className={empty.titleClass}>{title}</Heading>
          {children ? <p className={emptyStateCaptionClass}>{nest.slot(children)}</p> : null}
        </div>
        {hasActions ? (
          <div className="zen-empty-state__actions">
            {primaryAction ? nest("Primary", <Button appearance="main" level={primaryAction.level ?? emptyStateActionLevels.first} size="md" onClick={primaryAction.onClick}>{primaryAction.label}</Button>) : null}
            {secondaryAction ? nest("Secondary", <Button appearance="main" level={secondaryAction.level ?? emptyStateActionLevels.second} size="md" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
