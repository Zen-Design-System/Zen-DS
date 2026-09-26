import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { IconButton } from "../Button";
import { Chip } from "../Chip";
import { Icon } from "../Icon";
import { InputField } from "../Input";
import { typographyStyles } from "../../tokens/typography.generated";
import "./pagination.css";

export const paginationThemes = ["primary", "secondary", "inline", "manually"] as const;
export const paginationItemSizes = ["xsmall", "small"] as const;
export type PaginationTheme = (typeof paginationThemes)[number];
export type PaginationItemSize = (typeof paginationItemSizes)[number];
export type PaginationLevel = "primary" | "secondary";

export interface PaginationItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  page: number | "…";
  /** Figma Size: XSmall 24 (Select-Item/Size/Small) · Small 32 (Select-Item/Size/Medium). */
  size?: PaginationItemSize;
  /** Selected fill: Primary Active/Neutral/Solid (Inverse label) · Secondary Active/Neutral/Subtle. */
  level?: PaginationLevel;
  selected?: boolean;
}

/** Figma .Primitives/Pagination/Item (774:15999). The ellipsis renders as a non-interactive item. */
export function PaginationItem({ page, size = "xsmall", level = "primary", selected = false, className, ...buttonProps }: PaginationItemProps) {
  const classes = ["zen-pagination__item", typographyStyles["Body/Small/Medium"], className].filter(Boolean).join(" ");
  if (page === "…") return <span className={classes} data-size={size} data-level={level} aria-hidden="true">…</span>;
  return (
    <button {...buttonProps} type="button" className={classes} data-size={size} data-level={level} data-selected={selected ? "true" : "false"} aria-current={selected ? "page" : undefined} aria-label={buttonProps["aria-label"] ?? `Page ${page}`}>
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
  /** 1-based current page. */
  page: number;
  onPageChange: (page: number) => void;
  /** Primary/Secondary: numbered items. Inline: page-size Chip + range label. Manually: page-size Input + range label. */
  theme?: PaginationTheme;
  /** Number of pages (Primary/Secondary). For Inline/Manually it is derived from `total` / `pageSize`. */
  pageCount?: number;
  /** Items per page and total items (Inline/Manually). */
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  size?: PaginationItemSize;
  "aria-label"?: string;
  className?: string;
}

/**
 * Figma Pagination (774:29083). Button/Icon-Main XSmall Tertiary ‹ › (icon-chevron-*-line-small) around the
 * content, Spacing/Gap/Medium between groups; Pages gap Spacing/Gap/2XSmall; Inline/Manually navigator gap XSmall.
 */
export function Pagination({ page, onPageChange, theme = "primary", pageCount, pageSize = 50, total = 0, pageSizeOptions = [10, 25, 50, 100], onPageSizeChange, size = "xsmall", "aria-label": ariaLabel = "Pagination", className }: PaginationProps) {
  const compact = theme === "inline" || theme === "manually";
  const pages = Math.max(1, compact ? Math.ceil(total / Math.max(1, pageSize)) : pageCount ?? 1);
  const current = Math.min(Math.max(1, page), pages);
  const go = (next: number) => { if (next >= 1 && next <= pages && next !== current) onPageChange(next); };
  const previous = <IconButton appearance="main" level="tertiary" size="xs" aria-label="Previous page" disabled={current <= 1} onClick={() => go(current - 1)} icon={<Icon name="icon-chevron-left-line-small" />} />;
  const next = <IconButton appearance="main" level="tertiary" size="xs" aria-label="Next page" disabled={current >= pages} onClick={() => go(current + 1)} icon={<Icon name="icon-chevron-right-line-small" />} />;

  if (!compact) {
    const level: PaginationLevel = theme === "secondary" ? "secondary" : "primary";
    return (
      <nav className={["zen-pagination", className].filter(Boolean).join(" ")} data-theme={theme} aria-label={ariaLabel}>
        {previous}
        <div className="zen-pagination__pages">
          {paginationRange(current, pages).map((item, index) => (
            <PaginationItem key={`${item}-${index}`} page={item} size={size} level={item === "…" ? "secondary" : level} selected={item === current} onClick={() => typeof item === "number" && go(item)} />
          ))}
        </div>
        {next}
      </nav>
    );
  }

  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(total, current * pageSize);
  return (
    <nav className={["zen-pagination", className].filter(Boolean).join(" ")} data-theme={theme} aria-label={ariaLabel}>
      {theme === "inline"
        ? <PageSizeChip pageSize={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} />
        : <PageSizeInput pageSize={pageSize} onChange={onPageSizeChange} />}
      <span className={`zen-pagination__range ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{first} - {last} of {total} results</span>
      <div className="zen-pagination__navigator">{previous}{next}</div>
    </nav>
  );
}

/** Inline: Chip/Advanced Small Secondary Text-Only ("50 results") opening the shared Popover. */
function PageSizeChip({ pageSize, options, onChange }: { pageSize: number; options: number[]; onChange?: (value: number) => void }) {
  return (
    <Chip
      variant="advanced"
      size="small"
      dropdown
      popoverLabel="Results per page"
      popoverItems={options.map((option) => ({ id: String(option), label: `${option} results`, selected: option === pageSize }))}
      onPopoverSelect={(item) => onChange?.(Number(item.id))}
    >
      {`${pageSize} results`}
    </Chip>
  );
}

/** Manually: Input/Text-Field Small (133px) holding the page size; committed on Enter or blur. */
function PageSizeInput({ pageSize, onChange }: { pageSize: number; onChange?: (value: number) => void }) {
  const [draft, setDraft] = useState(String(pageSize));
  useEffect(() => setDraft(String(pageSize)), [pageSize]);
  const commit = () => {
    const value = Math.round(Number(draft));
    if (Number.isFinite(value) && value > 0) onChange?.(value);
    else setDraft(String(pageSize));
  };
  return (
    <InputField
      className="zen-pagination__page-size"
      size="small"
      inputMode="numeric"
      aria-label="Results per page"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === "Enter") commit(); }}
      trailing={<span className={`zen-pagination__page-size-unit ${typographyStyles["Body/Base/Medium"]}`}>results</span>}
    />
  );
}
