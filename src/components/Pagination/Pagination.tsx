import { useEffect, useState, type ButtonHTMLAttributes, type Ref } from "react";
import { IconButton } from "../Button";
import { Chip } from "../Chip";
import { Icon } from "../Icon";
import { InputField } from "../Input";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./pagination.css";
import "../Icon/core";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useControllableState } from "../_shared/use-controllable-state";
import { dataAttributes } from "../_shared/data-attributes";

export const paginationThemes = ["primary", "secondary", "inline", "manually"] as const;
export const paginationItemSizes = ["xsmall", "small"] as const;
export type PaginationTheme = (typeof paginationThemes)[number];
/** CSS / Figma key (the `data-size` value). */
type PaginationItemSizeKey = (typeof paginationItemSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type PaginationItemSize = "xs" | "sm" | "xsmall" | "small";
export type PaginationLevel = "primary" | "secondary";

export interface PaginationItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  page: number | "…";
  /** Figma Size: XSmall 24 (Select-Item/Size/Small) · Small 32 (Select-Item/Size/Medium). Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: PaginationItemSize;
  /** Selected fill: Primary Active/Neutral/Solid (Inverse label) · Secondary Active/Neutral/Subtle. */
  level?: PaginationLevel;
  selected?: boolean;
  /** Narrow screens hide optional pages (everything but first, last and current), keeping `1 … 5 … 12`. */
  optional?: boolean;
  /** Forwarded to the page `<button>` (the non-interactive ellipsis item takes none). */
  ref?: Ref<HTMLButtonElement>;
}

/** Figma .Primitives/Pagination/Item (774:15999). The ellipsis renders as a non-interactive item. */
export function PaginationItem({ page, size: sizeProp = "xs", level = "primary", selected = false, optional = false, className, ref, ...buttonProps }: PaginationItemProps) {
  const t = useZenLabels();
  const size = scaleKey(sizeProp, paginationItemSizes);
  const classes = ["zen-pagination__item", typographyStyles["Body/Small/Medium"], className].filter(Boolean).join(" ");
  if (page === "…") return <span className={classes} data-size={size} data-level={level} aria-hidden="true">…</span>;
  return (
    <button {...buttonProps} ref={ref} type="button" className={classes} data-size={size} data-level={level} data-selected={selected ? "true" : "false"} data-optional={optional ? "true" : undefined} aria-current={selected ? "page" : undefined} aria-label={buttonProps["aria-label"] ?? t.page(page)}>
      {page}
    </button>
  );
}

/** 1 … n with at most 7 slots, like Figma's `1 2 3 … 8 9 10`. */
export function paginationRange(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (page <= 3 || page >= pageCount - 2) return [1, 2, 3, "…", pageCount - 2, pageCount - 1, pageCount];
  return [1, "…", page - 1, page, page + 1, "…", pageCount];
}

export interface PaginationProps {
  /** 1-based current page (controlled). Leave it out and Pagination keeps the page itself, from `defaultPage`. */
  page?: number;
  /** Uncontrolled start for `page` (default 1): ‹ › and the page items then move it themselves. */
  defaultPage?: number;
  /** Called with the new 1-based page when ‹ › or a page item is pressed. */
  onValueChange?: (page: number) => void;
  /** Called with the new page number (1-based). `onValueChange` is the same callback under the name value controls share. */
  onPageChange?: (page: number) => void;
  /** Primary/Secondary: numbered items. Inline: page-size Chip + range label. Manually: page-size Input + range label. */
  theme?: PaginationTheme;
  /** Number of pages (Primary/Secondary). For Inline/Manually it is derived from `total` / `pageSize`. */
  pageCount?: number;
  /** Items per page and total items (Inline/Manually). `pageSize` is controlled; leave it out and the page-size Chip or
   *  Input changes it itself, from `defaultPageSize` (default 50), keeping the first row of the page in view. */
  pageSize?: number;
  defaultPageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Page items and the ‹ › arrows: xs = 24px (Figma) · sm = 32px. Short (xs, sm) or Figma (xsmall, small) spelling. */
  size?: PaginationItemSize;
  /** Accessible name of the navigation landmark. Default: the locale's “Pagination”. */
  "aria-label"?: string;
  className?: string;
  /** Forwarded to the root `<nav>`. */
  ref?: Ref<HTMLElement>;
  /** Figma instance overrides: props of the arrows, page items and page-size chip it draws, by layer (`{ Previous: { level: "secondary" }, "Page[3]": { level: "secondary" } }`). Written by Zen Studio;
   *  app code keeps the defaults. */
  overrides?: NestedOverrides;
}

/**
 * Figma Pagination (774:29083). Button/Icon-Main XSmall Tertiary ‹ › (icon-chevron-*-line-small) around the
 * content, Spacing/Gap/Medium between groups; Pages gap Spacing/Gap/2XSmall; Inline/Manually navigator gap XSmall.
 * The arrows follow `size` (Figma draws XSmall only): XSmall items (24, Select-Item/Size/Small) keep Icon-Main XSmall
 * (Button/Size/XSmall), Small items (32, Select-Item/Size/Medium) take Icon-Main Small (Button/Size/Small), so the
 * arrows always match the items in both densities.
 */
export function Pagination({ page: pageProp, defaultPage = 1, onValueChange, onPageChange, theme = "primary", pageCount, pageSize, defaultPageSize = 50, total = 0, pageSizeOptions = [10, 25, 50, 100], onPageSizeChange, size: sizeProp = "xs", "aria-label": ariaLabelProp, className, overrides, ref, ...rest }: PaginationProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.pagination;
  const size = scaleKey(sizeProp, paginationItemSizes);
  const [page, setPage] = useControllableState({ value: pageProp, defaultValue: defaultPage, name: "Pagination page" });
  const [ownPageSize, setOwnPageSize] = useState(defaultPageSize);
  const perPage = pageSize ?? ownPageSize;
  const compact = theme === "inline" || theme === "manually";
  const pages = Math.max(1, compact ? Math.ceil(total / Math.max(1, perPage)) : pageCount ?? 1);
  const current = Math.min(Math.max(1, page), pages);
  const go = (next: number) => { if (next >= 1 && next <= pages && next !== current) { setPage(next); onValueChange?.(next); onPageChange?.(next); } };
  // A new page size keeps the first row of the page in view (the page Pagination keeps itself; a controlled one is yours).
  const resize = (next: number) => { setPage(Math.floor(((current - 1) * perPage) / next) + 1); setOwnPageSize(next); onPageSizeChange?.(next); };
  const arrowSize = size === "small" ? "sm" : "xs";
  const previous = nest("Previous", <IconButton appearance="main" level="tertiary" size={arrowSize} data-arrow="previous" aria-label={t.previousPage} disabled={current <= 1} onClick={() => go(current - 1)} icon={<Icon name="icon-chevron-left-line-small" />} />);
  const next = nest("Next", <IconButton appearance="main" level="tertiary" size={arrowSize} data-arrow="next" aria-label={t.nextPage} disabled={current >= pages} onClick={() => go(current + 1)} icon={<Icon name="icon-chevron-right-line-small" />} />);

  if (!compact) {
    const level: PaginationLevel = theme === "secondary" ? "secondary" : "primary";
    return (
      <nav {...dataAttributes(rest)} ref={ref} className={["zen-pagination", className].filter(Boolean).join(" ")} data-tone={theme} aria-label={ariaLabel}>
        {previous}
        <div className="zen-pagination__pages">
          {paginationRange(current, pages).map((item, index) => nest("Page", (
            <PaginationItem key={`${item}-${index}`} page={item} size={size} level={item === "…" ? "secondary" : level} selected={item === current}
              optional={pages > 7 && typeof item === "number" && item !== 1 && item !== pages && item !== current}
              onClick={() => typeof item === "number" && go(item)} />
          ), item === "…" ? `gap-${index}` : item))}
        </div>
        {next}
      </nav>
    );
  }

  const first = total === 0 ? 0 : (current - 1) * perPage + 1;
  const last = Math.min(total, current * perPage);
  return (
    <nav {...dataAttributes(rest)} ref={ref} className={["zen-pagination", className].filter(Boolean).join(" ")} data-tone={theme} aria-label={ariaLabel}>
      {theme === "inline"
        ? nest("Page-Size", <PageSizeChip pageSize={pageSize ?? ownPageSize} options={pageSizeOptions} onChange={resize} />)
        : <PageSizeInput pageSize={pageSize ?? ownPageSize} onChange={resize} />}
      <span className={`zen-pagination__range ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{t.resultsRange(first, last, total)}</span>
      <div className="zen-pagination__navigator">{previous}{next}</div>
    </nav>
  );
}

/** Inline: Chip/Advanced Small Secondary Text-Only ("50 results") opening the shared Popover. */
function PageSizeChip({ pageSize, options, onChange }: { pageSize: number; options: number[]; onChange: (value: number) => void }) {
  const t = useZenLabels();
  return (
    <Chip
      variant="advanced"
      size="small"
      dropdown
      popoverLabel={t.resultsPerPage}
      popoverItems={options.map((option) => ({ id: String(option), label: t.results(option), selected: option === pageSize }))}
      onPopoverSelect={(item) => onChange(Number(item.id))}
    >
      {t.results(pageSize)}
    </Chip>
  );
}

/** Manually: Input/Text-Field Small (133px) holding the page size; committed on Enter or blur. */
function PageSizeInput({ pageSize, onChange }: { pageSize: number; onChange: (value: number) => void }) {
  const t = useZenLabels();
  const [draft, setDraft] = useState(String(pageSize));
  useEffect(() => setDraft(String(pageSize)), [pageSize]);
  const commit = () => {
    const value = Math.round(Number(draft));
    if (Number.isFinite(value) && value > 0) onChange(value);
    else setDraft(String(pageSize));
  };
  return (
    <InputField
      className="zen-pagination__page-size"
      size="small"
      inputMode="numeric"
      aria-label={t.resultsPerPage}
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === "Enter") commit(); }}
      trailing={<span className={`zen-pagination__page-size-unit ${typographyStyles["Body/Base/Medium"]}`}>{t.resultsUnit}</span>}
    />
  );
}
