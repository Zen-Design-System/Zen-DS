import { isValidElement, type MouseEvent, type ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItemData, type BreadcrumbsProps } from "../Breadcrumbs/Breadcrumbs";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { useZenLabels } from "./zen-context";

/**
 * A trail on a phone (user 2026-10-19: "Trên mobile có thể cân nhắc bỏ Breadcrumb"; component-usage-rules §17): a
 * Breadcrumbs gives way to a Back to its parent crumb on a child page and to nothing on a root (one crumb). `node` is
 * what the caller would draw; anything that is not a Breadcrumbs element comes back as it is.
 */
export function phoneTrail(node: ReactNode): ReactNode {
  if (!isValidElement<BreadcrumbsProps>(node) || node.type !== Breadcrumbs) return node;
  const items = node.props.items ?? [];
  const parent = items.length >= 2 ? items[items.length - 2] : null;
  return parent ? <TrailBack parent={parent} onNavigate={node.props.onNavigate} /> : null;
}

/** PageHeader's Back look (Button/Flat Primary Small with the medium chevron), naming the page it returns to. */
function TrailBack({ parent, onNavigate }: { parent: BreadcrumbItemData; onNavigate?: BreadcrumbsProps["onNavigate"] }) {
  const t = useZenLabels();
  const go = (event: MouseEvent) => {
    if (onNavigate) onNavigate(parent, event);
    else if (parent.href) window.location.assign(parent.href);
  };
  return (
    <Button appearance="flat" level="primary" size="sm" startIcon={<Icon name="icon-chevron-left-line-medium" decorative />} aria-label={typeof parent.label === "string" ? `${t.back}: ${parent.label}` : undefined} onClick={go}>
      {parent.label}
    </Button>
  );
}
