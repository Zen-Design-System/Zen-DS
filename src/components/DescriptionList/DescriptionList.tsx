import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { Text } from "../Text";
import "./description-list.css";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export const descriptionListLayouts = ["inline", "stacked"] as const;
export type DescriptionListLayout = (typeof descriptionListLayouts)[number];

/** One term → description pair of a DescriptionList (`items`). */
export interface DescriptionListItem {
  /** React key. Defaults to the term when it is a string, otherwise the index. */
  id?: string;
  /** The label (dt): Body/Small/Regular, Content/Neutral/Base. A noun or short phrase ("Shipping", "Order number"). */
  term: ReactNode;
  /** The value (dd): Body/Base/Medium, Content/Neutral/Strongest. Format it for people ("$1,280.40", "2 Oct 2026"). */
  description: ReactNode;
  /** An action for this row only, e.g. a Tertiary sm "Edit" Button or a Copy IconButton (aria-label names the row). */
  action?: ReactNode;
  /** The row that closes a calculation (a receipt total): Body/Base/Bold with a High (Border/Neutral/Solid) rule above. One per list. */
  emphasis?: boolean;
}

export interface DescriptionItemProps {
  /** The label (dt): Body/Small/Regular, Content/Neutral/Base. */
  term: ReactNode;
  /** The value (dd): Body/Base/Medium, Content/Neutral/Strongest. */
  description: ReactNode;
  /** An action for this row only (rendered in its own dd at the end of the row). */
  action?: ReactNode;
  /** The total row: Body/Base/Bold with a High rule above it. One per list. */
  emphasis?: boolean;
  /** On the row's div (the dt/dd group). */
  className?: string;
}

/**
 * One row of a DescriptionList: a dt + dd group (plus a dd for the action). Use it only as a child of DescriptionList.
 *
 *   <DescriptionItem term="Total" description="$321.90" emphasis />
 */
export function DescriptionItem({ term, description, action, emphasis = false, className }: DescriptionItemProps) {
  return (
    <div className={["zen-description-list__item", className].filter(Boolean).join(" ")} data-emphasis={emphasis ? "true" : undefined} data-action={action ? "true" : undefined}>
      <Text as="dt" className="zen-description-list__term" textStyle={emphasis ? "Body/Base/Bold" : "Body/Small/Regular"} tone={emphasis ? "strongest" : "base"}>{term}</Text>
      <Text as="dd" className="zen-description-list__description" textStyle={emphasis ? "Body/Base/Bold" : "Body/Base/Medium"}>{description}</Text>
      {action ? <dd className="zen-description-list__action">{action}</dd> : null}
    </div>
  );
}

export interface DescriptionListProps extends Omit<HTMLAttributes<HTMLDListElement>, "children"> {
  /** The rows, in reading order. Or pass DescriptionItem children (both render, items first). */
  items?: DescriptionListItem[];
  /**
   * inline (default): term at the start and value at the end of one line (order summaries, specs); it stacks by itself
   * when the list is narrower than `stackBelow`. stacked: term above value (profiles, addresses, long values).
   */
  layout?: DescriptionListLayout;
  /** Pale rules (Border/Neutral/Pale) between rows, with Padding/Small above and below each rule. Default false. */
  divider?: boolean;
  /**
   * Inline layout only: below this width (px) of the list itself the rows stack (term above value). Default 280, so
   * lists in phone cards and sheets (about 300–350px) stay inline while narrow columns stack; 0 keeps them inline.
   */
  stackBelow?: number;
  /** DescriptionItem rows. */
  children?: ReactNode;
}

const keyOf = (item: DescriptionListItem, index: number) => item.id ?? (typeof item.term === "string" ? `${item.term}-${index}` : String(index));

/**
 * A semantic description list (dl) of term → description pairs: order summaries and receipts, profile details, specs
 * and metadata. Figma: Description List (14859:79180, Layout × Divider, an Items slot) built from
 * .Primitives/Description-List/Item (14859:78890, Layout × Emphasis × Divider, Term · Value · Action). Typography comes from the Figma text styles (term Body/Small/Regular Base, value Body/Base/Medium
 * Strongest, total Body/Base/Bold); rules use Border/Neutral/Pale, and the total's rule Border/Neutral/Solid (Divider High).
 *
 *   <DescriptionList items={[{ term: "Subtotal", description: "$311.90" }, { term: "Total", description: "$321.90", emphasis: true }]} />
 */
export const DescriptionList = forwardRef<HTMLDListElement, DescriptionListProps>(function DescriptionList(
  { items = [], layout = "inline", divider = false, stackBelow = 280, className, children, ...rest },
  ref,
) {
  const localRef = useRef<HTMLDListElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  const setRef = useCallback((node: HTMLDListElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  // Inline rows stack under `stackBelow` px of their own width (a card, sheet or table cell), not the viewport's.
  useIsomorphicLayoutEffect(() => {
    const element = localRef.current;
    if (!element || layout !== "inline" || !stackBelow || typeof ResizeObserver === "undefined") { setNarrow(false); return undefined; }
    const update = () => setNarrow(element.clientWidth > 0 && element.clientWidth < stackBelow);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout, stackBelow]);
  return (
    <dl
      {...rest}
      ref={setRef}
      className={["zen-description-list", className].filter(Boolean).join(" ")}
      data-layout={layout}
      data-stacked={layout === "inline" && narrow ? "true" : undefined}
      data-divider={divider ? "true" : undefined}
    >
      {items.map((item, index) => <DescriptionItem key={keyOf(item, index)} term={item.term} description={item.description} action={item.action} emphasis={item.emphasis} />)}
      {children}
    </dl>
  );
});
