import { useDeferredValue, useMemo, useState, type CSSProperties } from "react";
import catalog from "../tokens/catalog.generated.json";
import { Search } from "../components/Search";
import { Segmented } from "../components/Segmented";
import { EmptyState } from "../components/EmptyState";
import { typographyStyles } from "../tokens/typography.generated";
import { toKebab, type ResolvedToken, type TokenValue } from "./resolvedTokens";

/** Codebase Platform token table template, shared by every token collection page.
 * Figma: 14257:56624 Global Colors, 14257:58579 Global Dimensions, 14257:60681 Base Colors. */

type TokenGroup = { title: string; tokens: ResolvedToken[] };
type ViewOption = { id: string; label: string };

const aliasPattern = /^\{(.+)\}$/;
const catalogOrder = new Map(catalog.tokens.map((token, index) => [`${token.collectionSlug}:${token.name}`, index]));
const valuesByName = new Map(catalog.tokens.map((token) => [token.name, token.valuesByMode as Record<string, TokenValue>]));
/** Global/Base colors are single-mode collections that encode the scheme in the name (`Light/…`, `Dark/…`). */
const schemeCollections = new Set(["global-colors", "base-colors-project"]);

const aliasOf = (value: TokenValue) => (typeof value === "string" ? value.match(aliasPattern)?.[1] ?? null : null);
const valueForMode = (values: Record<string, TokenValue>, mode: string) => values[mode] ?? Object.values(values)[0];

/** Follows `{Alias}` references through the catalog; each hop reads the same mode when the target has it. */
function resolveValue(value: TokenValue, mode: string, depth = 0): TokenValue {
  const alias = aliasOf(value);
  if (!alias || depth > 8) return value;
  const target = valuesByName.get(alias);
  return target ? resolveValue(valueForMode(target, mode), mode, depth + 1) : value;
}

/** `#RRGGBBAA` → `#RRGGBB 90%` (Figma Value column format). */
function formatColor(value: TokenValue) {
  const text = String(value).toUpperCase();
  const match = text.match(/^(#[0-9A-F]{6})([0-9A-F]{2})$/);
  if (!match) return text;
  return `${match[1]} ${Math.round((parseInt(match[2], 16) / 255) * 100)}%`;
}

const isUnitless = (name: string) => name.includes("Font-Weight");

/** Letter spacing is authored in px but documented relative to its font size, as Figma shows it. */
function formatNumber(token: ResolvedToken, mode: string, value: number) {
  if (isUnitless(token.name)) return String(value);
  if (token.name.startsWith("Typography/Letter-Spacing/")) {
    const suffix = token.name.replace("Typography/Letter-Spacing/", "");
    const fontSize = resolveValue(valueForMode(valuesByName.get(`Typography/Font-Size/${suffix === "Body-Code" ? "Body-Small" : suffix}`) ?? {}, mode) ?? 0, mode);
    if (typeof fontSize === "number" && fontSize !== 0) return `${((value / fontSize) * 100).toFixed(2)}%`;
    return `${value.toFixed(2)}px`;
  }
  return `${value}px`;
}

function formatValue(token: ResolvedToken, mode: string, value: TokenValue) {
  if (token.kind === "color") return formatColor(value);
  if (typeof value === "number") return formatNumber(token, mode, value);
  return String(value);
}

const schemeOf = (name: string) => (name.startsWith("Light/") ? "Light" : name.startsWith("Dark/") ? "Dark" : null);

function viewOptions(collectionSlug: string, modes: string[]): ViewOption[] {
  if (schemeCollections.has(collectionSlug)) return [{ id: "Light", label: "Light Colors" }, { id: "Dark", label: "Dark Colors" }];
  if (modes.length < 2) return [];
  // "Light"/"Dark" read as colour schemes only in a Light + Dark collection: Emphasis Level's "Light" is a weight mode.
  const scheme = modes.includes("Light") && modes.includes("Dark");
  return modes.map((mode) => ({ id: mode, label: scheme && (mode === "Light" || mode === "Dark") ? `${mode} Colors` : mode }));
}

/** Groups by the path above the leaf (`Light/Tomato/1` → `Tomato`); leaf-level tokens form the untitled first table. */
function groupTokens(tokens: ResolvedToken[], stripScheme: boolean) {
  const groups = new Map<string, ResolvedToken[]>();
  for (const token of tokens) {
    const segments = token.name.split("/");
    if (stripScheme && schemeOf(token.name)) segments.shift();
    const title = segments.slice(0, -1).join(" / ");
    groups.set(title, [...(groups.get(title) ?? []), token]);
  }
  return [...groups]
    .map(([title, items]): TokenGroup => ({ title, tokens: items }))
    .sort((left, right) => Number(Boolean(left.title)) - Number(Boolean(right.title)));
}

const leafName = (name: string) => name.split("/").pop() ?? name;
const tokenReference = (token: ResolvedToken) => token.cssVariable ?? `.zen-type-${toKebab(token.name)}`;

function Pill({ children, title }: { children: string; title?: string }) {
  return <span className={`token-table-view__pill ${typographyStyles["Body/Code/Regular"]}`} title={title}>{children}</span>;
}

function ValueCell({ token, mode, plain }: { token: ResolvedToken; mode: string; plain: boolean }) {
  const raw = valueForMode(token.valuesByMode, mode);
  const alias = aliasOf(raw);
  const resolved = formatValue(token, mode, resolveValue(raw, mode));
  // Aliased tokens show the referenced token (same CSS-variable format as the Token column); the resolved value stays on hover.
  const text = alias ? `--zen-${toKebab(alias)}` : resolved;
  const title = alias ? `${alias} → ${resolved}` : undefined;
  return (
    <div className="token-table-view__cell token-table-view__cell--values" role="cell">
      {plain
        ? <span className={`token-table-view__value ${typographyStyles["Body/Code/Regular"]}`} title={title}>{text}</span>
        : <Pill title={title}>{text}</Pill>}
    </div>
  );
}

/** Letter spacing has no meaningful preview (it is documented as a % of its font size in Value),
 * so its table drops the Preview column. */
const hasPreview = (token: ResolvedToken) => !token.name.startsWith("Typography/Letter-Spacing/");

/** Dimension/Preview column: Figma draws dimensions as an accent bar; other value kinds get the closest visual. */
function PreviewCell({ token, mode }: { token: ResolvedToken; mode: string }) {
  const value = resolveValue(valueForMode(token.valuesByMode, mode), mode);
  let preview = null;
  if (token.kind === "font-style") preview = <span className={`token-table-view__sample zen-type-${toKebab(token.name)}`}>Aa</span>;
  else if (token.kind === "font-family") preview = <span className="token-table-view__sample" style={{ fontFamily: String(value) }}>Aa</span>;
  else if (typeof value === "number") {
    const style: CSSProperties | null = token.name.includes("Font-Weight") ? { fontWeight: value }
      : token.name.startsWith("Typography/Font-Size/") ? { fontSize: value, lineHeight: 1 }
        : null;
    if (style) preview = <span className="token-table-view__sample" style={style}>Aa</span>;
    else if (token.name.includes("Radius")) preview = <span className="token-table-view__radius" style={{ borderTopLeftRadius: Math.min(value, 999) }} />;
    else preview = <span className="token-table-view__dimension" style={{ width: value }} />;
  }
  return <div className="token-table-view__cell token-table-view__cell--dimension" role="cell" aria-hidden="true">{preview}</div>;
}

function TokenRow({ token, mode, layout, plainValue, preview = true }: { token: ResolvedToken; mode: string; layout: "color" | "dimension"; plainValue: boolean; preview?: boolean }) {
  if (layout === "dimension") {
    return (
      <div className="token-table-view__row" role="row">
        <div className="token-table-view__cell" role="cell"><Pill>{tokenReference(token)}</Pill></div>
        <ValueCell token={token} mode={mode} plain={false} />
        {preview ? <PreviewCell token={token} mode={mode} /> : null}
      </div>
    );
  }
  const resolved = resolveValue(valueForMode(token.valuesByMode, mode), mode);
  const fill = typeof resolved === "string" && resolved.startsWith("#") ? resolved : `var(${token.cssVariable})`;
  return (
    <div className="token-table-view__row" role="row">
      <div className="token-table-view__cell token-table-view__cell--name" role="cell">
        {token.kind === "color" ? <span className="token-table-view__swatch" aria-hidden="true"><span><span style={{ background: fill }} /></span></span> : null}
        <span className={typographyStyles["Body/Code/Bold"]}>{leafName(token.name)}</span>
      </div>
      <div className="token-table-view__cell" role="cell"><Pill>{tokenReference(token)}</Pill></div>
      <ValueCell token={token} mode={mode} plain={plainValue} />
    </div>
  );
}

function TokenTable({ group, columns: allColumns, mode, layout, plainValue }: { group: TokenGroup; columns: string[]; mode: string; layout: "color" | "dimension"; plainValue: boolean }) {
  // Dimension tables drop their third (Preview/Dimension) column when no token in the group has a preview.
  const preview = layout === "color" || group.tokens.some(hasPreview);
  const columns = preview ? allColumns : allColumns.slice(0, 2);
  return (
    <section className="token-table-view__section" aria-label={group.title || undefined}>
      {group.title ? <h2 className={`token-table-view__title ${typographyStyles["Heading/1"]}`}>{group.title}</h2> : null}
      <div className="token-table-view__table" role="table">
        <div className="token-table-view__head" role="row">
          {columns.map((column) => <div key={column} className={`token-table-view__head-cell ${typographyStyles["Body/Code/Bold"]}`} role="columnheader">{column}</div>)}
        </div>
        {group.tokens.map((token) => <TokenRow key={`${token.type}-${token.name}`} token={token} mode={mode} layout={layout} plainValue={plainValue} preview={preview} />)}
      </div>
    </section>
  );
}

/** Toolbar (Segmented scheme/mode + Search) and one titled table per token group. */
export function TokenTableView({ collectionSlug, collectionName, modes, tokens }: { collectionSlug: string; collectionName: string; modes: string[]; tokens: ResolvedToken[] }) {
  const options = viewOptions(collectionSlug, modes);
  const [view, setView] = useState(options[0]?.id ?? modes[0]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const byScheme = schemeCollections.has(collectionSlug);
  const mode = byScheme ? modes[0] : view;
  const colorLayout = tokens.some((token) => token.kind === "color");
  const previewColumn = tokens.some((token) => token.kind !== "dimension" || token.name.includes("Font-Weight") || token.name.startsWith("Typography/")) ? "Preview" : "Dimension";

  const groups = useMemo(() => {
    const ordered = [...tokens].sort((left, right) =>
      (catalogOrder.get(`${left.collectionSlug}:${left.name}`) ?? Number.MAX_SAFE_INTEGER) - (catalogOrder.get(`${right.collectionSlug}:${right.name}`) ?? Number.MAX_SAFE_INTEGER));
    const visible = ordered.filter((token) => {
      const tokenScheme = schemeOf(token.name);
      if (byScheme && tokenScheme && tokenScheme !== view) return false;
      if (!deferredQuery) return true;
      return token.name.toLowerCase().includes(deferredQuery) || tokenReference(token).includes(deferredQuery);
    });
    return groupTokens(visible, byScheme);
  }, [tokens, byScheme, view, deferredQuery]);

  return (
    <div className="token-table-view" data-collection={collectionSlug}>
      <div className="token-table-view__toolbar" data-layout={options.length ? "end" : "center"}>
        {options.length ? (
          <Segmented className="token-table-view__schemes" level="secondary" size="medium" value={view} onChange={setView} aria-label={byScheme ? "Color scheme" : "Mode"} options={options} />
        ) : null}
        <div className="token-table-view__search">
          <Search size="medium" theme="default" state="default" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label={`Search ${collectionName}`} />
        </div>
      </div>
      {groups.length ? groups.map((group) => (
        <TokenTable
          key={group.title || "root"}
          group={group}
          mode={mode}
          layout={colorLayout ? "color" : "dimension"}
          columns={colorLayout ? ["Name", "Token", "Value"] : ["Token", "Value", previewColumn]}
          plainValue={collectionSlug === "global-colors"}
        />
      )) : (
        <EmptyState title={`No tokens match “${query.trim()}”`} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
          Search by token name (“surface”), path (“Background/Neutral”) or value (“#111”).
        </EmptyState>
      )}
    </div>
  );
}
