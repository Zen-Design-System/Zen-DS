import { useEffect, useRef, type ReactNode } from "react";

/* Pagination examples always paginate real content: these datasets are deterministic (no randomness between renders),
   and ScrollBox keeps a long page inside a ~5-row box (sticky table header) so the Pagination below never moves away. */

const people = ["Ava Chen", "Bao Nguyen", "Chi Tran", "Duy Le", "Emi Sato", "Finn Walsh", "Gia Pham", "Hana Kim"];
const pad = (n: number) => String(n).padStart(2, "0");

export type AuditEvent = { id: number; time: string; actor: string; event: string };
const auditActions = ["Signed in", "Changed the billing plan", "Invited a member", "Removed a member", "Exported members.csv", "Updated the SSO settings", "Created an API key", "Revoked an API key", "Renamed the workspace", "Changed a role to Admin"];
/** 1 240 audit-log entries, newest first. */
export const auditLog: AuditEvent[] = Array.from({ length: 1240 }, (_, i) => {
  const minutes = i * 17;
  return { id: i + 1, time: `Sep ${27 - Math.floor(minutes / 1440)}, ${pad(23 - Math.floor((minutes % 1440) / 60))}:${pad(59 - (minutes % 60))}`, actor: people[(i * 5) % people.length], event: auditActions[(i * 7) % auditActions.length] };
});

export type SearchResult = { id: number; title: string; kind: string; path: string };
const resultTitles = ["Color tokens", "Spacing tokens", "Typography tokens", "Token naming", "Design tokens JSON", "Tokens in Figma", "Token aliases", "Theme tokens", "Component tokens", "Dark mode tokens", "Token build script", "Token versioning"];
const resultComponents = ["Button", "Chip", "Input", "Card", "Table", "Popover", "Tooltip", "Tabs", "Badge", "Avatar", "Sidebar", "Toast", "Dialog", "Checkbox", "Toggle", "Search", "Pagination", "List Item", "Date Picker", "Uploader"];
const resultKinds = ["Guide", "Component", "Foundation", "Changelog"];
/** 240 search results for "tokens" (24 pages of 10). */
export const searchResults: SearchResult[] = Array.from({ length: 240 }, (_, i) => ({
  id: i + 1,
  title: `${resultTitles[i % resultTitles.length]} — ${resultComponents[Math.floor(i / resultTitles.length) % resultComponents.length]}`,
  kind: resultKinds[(i * 3) % resultKinds.length],
  path: `docs/components/${resultComponents[Math.floor(i / resultTitles.length) % resultComponents.length].toLowerCase().replace(/ /g, "-")}#${resultTitles[i % resultTitles.length].toLowerCase().replace(/ /g, "-")}`,
}));

export type Order = { id: number; number: string; customer: string; total: string };
/** 480 orders (the playground's total). */
export const orders: Order[] = Array.from({ length: 480 }, (_, i) => ({ id: i + 1, number: `#${10480 - i}`, customer: people[(i * 3) % people.length], total: `$${(19 + ((i * 37) % 480)).toFixed(2)}` }));

/** The rows of one page. */
export const pageOf = <T,>(items: T[], page: number, pageSize: number) => items.slice((page - 1) * pageSize, page * pageSize);

/**
 * A focusable, labelled scroll region (~5 table rows high) for one page of results. It returns to the top whenever `resetKey`
 * changes (a new page or page size), so every page starts at its first item.
 */
export function ScrollBox({ label, resetKey, children }: { label: string; resetKey: string | number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [resetKey]);
  return <div ref={ref} className="pe-scroll-box" role="region" tabIndex={0} aria-label={label}>{children}</div>;
}
