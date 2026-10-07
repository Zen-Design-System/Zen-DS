import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Table, TableText } from "../components/Table";
import { Tooltip } from "../components/Tooltip";
import { typographyStyles } from "../tokens/typography.generated";
import apiReference from "./api.generated.json";
import guidelines from "./guidelines.generated.json";
import { guidelineSlugFor } from "./PlatformGuidelines";
import type { PlatformPage } from "./PlatformExamples";

/** Optional reference data emitted by tools/usage-guard/build-guidelines.mjs next to the Do/Don't copy. */
type Reference = { title?: string; api?: [string, string, string][]; keyboard?: [string, string][] };
const referenceFor = (page: PlatformPage): Reference | undefined => (guidelines as unknown as Record<string, Reference>)[guidelineSlugFor(page)];

/** Anchored page section; the "On this page" rail lists every rendered section by its `data-toc-label`. */
export function PlatformSection({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div id={id} className="platform-anchor" data-toc-label={label}>{children}</div>;
}

function SectionHead({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <header className="pe-section__head">
      <h2 id={id} className={typographyStyles["Heading/3"]}>{title}</h2>
      <p className={typographyStyles["Body/Base/Regular"]}>{children}</p>
    </header>
  );
}

/** "A + B / C" → <kbd>A</kbd> + <kbd>B</kbd> / <kbd>C</kbd> */
function Keys({ value }: { value: string }) {
  const parts = value.split(/(\s*[+/]\s*|\s+then\s+)/);
  return <span className="platform-ref__keys">{parts.map((part, index) => /^\s*([+/]|then)\s*$/.test(part) ? <span key={index} className="platform-ref__sep">{part.trim()}</span> : part.trim() ? <kbd key={index}>{part.trim()}</kbd> : null)}</span>;
}

export function ComponentKeyboard({ page }: { page: PlatformPage }) {
  const rows = referenceFor(page)?.keyboard;
  if (!rows?.length) return null;
  return (
    <PlatformSection id="keyboard" label="Keyboard">
      <section className="pe-section platform-ref" aria-labelledby="platform-keyboard-title">
        <SectionHead id="platform-keyboard-title" title="Keyboard">Keys supported when the component has focus. Everything reachable by pointer is reachable by keyboard.</SectionHead>
        <Table aria-label="Keyboard interactions" rows={rows.map(([keys, action]) => ({ keys, action }))} getRowId={(row) => row.keys}
          columns={[
            { id: "keys", header: "Key", width: "32%", cell: (row) => <Keys value={row.keys} /> },
            { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
          ]} />
      </section>
    </PlatformSection>
  );
}

export function ComponentApi({ page }: { page: PlatformPage }) {
  const rows = referenceFor(page)?.api;
  if (!rows?.length) return null;
  return (
    <PlatformSection id="api" label="API">
      <section className="pe-section platform-ref" aria-labelledby="platform-api-title">
        <SectionHead id="platform-api-title" title="API">Figma properties and the props that implement them.</SectionHead>
        <Table aria-label="Properties" rows={rows.map(([figma, prop, values]) => ({ figma, prop, values }))} getRowId={(row) => `${row.figma}-${row.prop}`}
          columns={[
            { id: "figma", header: "Figma property", width: "20%", cell: (row) => <TableText bold>{row.figma}</TableText> },
            { id: "prop", header: "Prop", width: "22%", cell: (row) => <code className="platform-ref__code">{row.prop}</code> },
            { id: "values", header: "Values", cell: (row) => <TableText>{row.values}</TableText> },
          ]} />
      </section>
    </PlatformSection>
  );
}

type ApiProp = { name: string; type: string; required: boolean; default: string | null; description: string; deprecated: string | null };
type ApiComponent = { name: string; extends: string | null; props: ApiProp[] };
const propsFor = (page: PlatformPage): ApiComponent[] | undefined => (apiReference as unknown as Record<string, ApiComponent[]>)[guidelineSlugFor(page)];

/** Props of every component on the page, generated from the TypeScript source (scripts/build-api.mjs → api.generated.json). */
export function ComponentProps({ page }: { page: PlatformPage }) {
  const components = propsFor(page);
  if (!components?.length) return null;
  return (
    <PlatformSection id="props" label="Props">
      <section className="pe-section platform-ref" aria-labelledby="platform-props-title">
        <SectionHead id="platform-props-title" title="Props">Generated from the TypeScript source, so it is always current. AI agents read the same data from docs/api.</SectionHead>
        {components.map((component) => (
          <div key={component.name} className="platform-ref__component">
            <h3 className={typographyStyles["Heading/4"]}>{component.name}</h3>
            {component.extends ? <p className={typographyStyles["Body/Small/Regular"]}>Also accepts <code className="platform-ref__code">{component.extends}</code>.</p> : null}
            <Table aria-label={`${component.name} props`} rows={component.props} getRowId={(row) => row.name}
              columns={[
                { id: "prop", header: "Prop", width: "18%", cell: (row) => <code className="platform-ref__code">{row.name}{row.required ? "" : "?"}</code> },
                { id: "type", header: "Type", width: "34%", cell: (row) => row.type === "unknown" ? <TableText>HTML attribute</TableText> : <code className="platform-ref__code">{row.type}</code> },
                { id: "default", header: "Default", width: "12%", cell: (row) => row.default === null ? <TableText>—</TableText> : <code className="platform-ref__code">{row.default}</code> },
                { id: "description", header: "Description", cell: (row) => <TableText>{row.deprecated ? `Deprecated: ${row.deprecated} ` : ""}{row.description || "—"}</TableText> },
              ]} />
          </div>
        ))}
      </section>
    </PlatformSection>
  );
}

/** Elements that use ↑ / ↓ themselves; the section jump never steals the key from them. */
/** Focus inside these keeps ↑/↓ (the examples and playgrounds own their keys: menu triggers, lists, custom widgets). */
const ARROW_KEY_OWNERS = "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=listbox], [role=menu], [role=menubar], [role=tablist], [role=tab], [role=slider], [role=spinbutton], [role=combobox], [role=radiogroup], [role=radio], [role=grid], [role=tree], [role=option], .zen-table, .zen-date-picker, .zen-popover, .platform-code, pre, dialog, [aria-modal=true], [aria-haspopup]:not([aria-haspopup=false]), .pe-card__stage, .platform-example-panel";

/**
 * Figma Component-Page-Template "Sticky" (Codebase Platform 14366:142238): a 28px rail beside the content with one
 * 4×20 pill per section (radius full, gap 4, padding 0 12); the section in view is Background/Active/Neutral/Solid,
 * the rest Background/Neutral/Subtle. Each pill is a link named by its section (aria-label + a left Tooltip), with a
 * 28×24 hit area. Items come from the rendered `[data-toc-label]` sections; the one in view is marked `aria-current`.
 */
export function PlatformOnThisPage({ scope }: { scope: RefObject<HTMLElement | null> }) {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState<string>("");
  const clickedRef = useRef(0);
  useEffect(() => {
    const root = scope.current;
    if (!root) return undefined;
    // Sections that rendered nothing (e.g. a page without examples) are skipped.
    const collect = () => setItems([...root.querySelectorAll<HTMLElement>(":scope [data-toc-label]")].filter((el) => el.childElementCount > 0).map((el) => ({ id: el.id, label: el.dataset.tocLabel ?? el.id })));
    collect();
    const mutation = new MutationObserver(collect);
    mutation.observe(root, { childList: true, subtree: true });
    return () => mutation.disconnect();
  }, [scope]);
  useEffect(() => {
    const root = scope.current;
    if (!root || !items.length) return undefined;
    const update = () => {
      if (Date.now() - clickedRef.current < 600) return; // keep the clicked item while the smooth scroll settles
      const line = 120; // just under the sticky topbar
      let current = items[0]?.id ?? "";
      for (const item of items) { const el = document.getElementById(item.id); if (el && el.getBoundingClientRect().top <= line) current = item.id; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = items[items.length - 1].id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [items, scope]);
  /** Scroll a section under the topbar, mark it current, keep the #hash shareable and move focus to its heading. */
  const go = (id: string) => {
    clickedRef.current = Date.now();
    setActive(id);
    const target = document.getElementById(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Keep the page URL shareable without adding a history entry per jump.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    const heading = target?.querySelector<HTMLElement>("h2, h3");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  };
  const goRef = useRef(go);
  goRef.current = go;
  // ↑ / ↓ jump to the previous / next section, unless the key belongs to a control, an open overlay or a text field.
  useEffect(() => {
    if (items.length < 2) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== "ArrowDown" && event.key !== "ArrowUp") || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(ARROW_KEY_OWNERS) || document.querySelector('[aria-modal="true"]')) return;
      const index = items.findIndex((item) => item.id === active);
      const next = items[Math.min(items.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)))];
      if (!next || next.id === active) return;
      event.preventDefault();
      goRef.current(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, active]);
  if (items.length < 2) return null;
  return (
    <nav className="platform-toc" aria-label="On this page" aria-keyshortcuts="ArrowUp ArrowDown" style={{ "--platform-toc-height": `${items.length * 24}px` } as CSSProperties}>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Tooltip content={item.label} placement="left" delay={150}>
            <a
              className="platform-toc__link"
              href={`#${item.id}`}
              aria-label={item.label}
              aria-current={active === item.id ? "location" : undefined}
              onClick={(event) => { event.preventDefault(); go(item.id); }}
            />
            </Tooltip>
          </li>
        ))}
      </ul>
    </nav>
  );
}
