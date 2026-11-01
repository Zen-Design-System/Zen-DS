import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Box, Stack } from "../components/Layout";
import { Link } from "../components/Link";
import { SheetCode, SheetKeys, SheetTable } from "../components/SheetTable";
import { TableText } from "../components/Table";
import { Text } from "../components/Text";
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

export function ComponentKeyboard({ page }: { page: PlatformPage }) {
  const rows = referenceFor(page)?.keyboard;
  if (!rows?.length) return null;
  return (
    <PlatformSection id="keyboard" label="Keyboard">
      <section className="pe-section" aria-labelledby="platform-keyboard-title">
        <SectionHead id="platform-keyboard-title" title="Keyboard">Keys supported when the component has focus. Everything reachable by pointer is reachable by keyboard.</SectionHead>
        {/* Reference rows run long: a SheetTable lets them grow (a Table keeps one line). */}
        <SheetTable aria-label="Keyboard interactions" rows={rows.map(([keys, action]) => ({ keys, action }))} getRowId={(row) => row.keys}
          columns={[
            { id: "keys", header: "Key", width: "32%", cell: (row) => <SheetKeys value={row.keys} /> },
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
      <section className="pe-section" aria-labelledby="platform-api-title">
        <SectionHead id="platform-api-title" title="API">Figma properties and the props that implement them.</SectionHead>
        <SheetTable aria-label="Properties" rows={rows.map(([figma, prop, values]) => ({ figma, prop, values }))} getRowId={(row) => `${row.figma}-${row.prop}`}
          columns={[
            { id: "figma", header: "Figma property", width: "20%", cell: (row) => <TableText bold>{row.figma}</TableText> },
            { id: "prop", header: "Prop", width: "22%", cell: (row) => <SheetCode>{row.prop}</SheetCode> },
            { id: "values", header: "Values", cell: (row) => <TableText>{row.values}</TableText> },
          ]} />
      </section>
    </PlatformSection>
  );
}

type ApiProp = { name: string; type: string; required: boolean; default: string | null; description: string; deprecated: string | null };
type ApiComponent = { name: string; extends: string | null; props: ApiProp[] };
const propsFor = (page: PlatformPage): ApiComponent[] | undefined => (apiReference as unknown as Record<string, ApiComponent[]>)[guidelineSlugFor(page)];

/** Does the page have a Keyboard or an API table (the Studio board draws its Docs frame only then)? */
export const hasComponentReference = (page: PlatformPage) => Boolean(referenceFor(page)?.keyboard?.length || referenceFor(page)?.api?.length);
/** The components whose props the page documents, in its order (the Studio board draws one Props frame each). */
export const propsComponentNames = (page: PlatformPage) => (propsFor(page) ?? []).map((component) => component.name);

/** Props of every component on the page, generated from the TypeScript source (scripts/build-api.mjs → api.generated.json).
 *  `only`: one component's props (the Studio board's "Props · <Component>" frames), with ids of its own. */
export function ComponentProps({ page, only }: { page: PlatformPage; only?: string }) {
  const components = propsFor(page)?.filter((component) => !only || component.name === only);
  if (!components?.length) return null;
  const key = only ? `props-${only}` : "props";
  return (
    <PlatformSection id={key} label={only ? `${only} props` : "Props"}>
      <section className="pe-section" aria-labelledby={`platform-${key}-title`}>
        <SectionHead id={`platform-${key}-title`} title={only ? `${only} props` : "Props"}>Generated from the TypeScript source, so it is always current. AI agents read the same data from docs/api.</SectionHead>
        {components.map((component) => (
          <div key={component.name} className="platform-ref__component">
            <h3 className={typographyStyles["Heading/4"]}>{component.name}</h3>
            {component.extends ? <p className={typographyStyles["Body/Small/Regular"]}>Also accepts <SheetCode>{component.extends}</SheetCode>.</p> : null}
            {/* Four columns of long unions and signatures: narrower than 680px, the sheet scrolls sideways. */}
            <SheetTable aria-label={`${component.name} props`} rows={component.props} getRowId={(row) => row.name} minWidth="680px"
              columns={[
                { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{`${row.name}${row.required ? "" : "?"}`}</SheetCode> },
                { id: "type", header: "Type", width: "34%", cell: (row) => row.type === "unknown" ? <TableText>HTML attribute</TableText> : <SheetCode>{row.type}</SheetCode> },
                { id: "default", header: "Default", width: "12%", cell: (row) => row.default === null ? <TableText>—</TableText> : <SheetCode>{row.default}</SheetCode> },
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

export type PageSection = { id: string; label: string };

/** Headings inside these belong to a preview (an example card, a guideline visual, a dialog), not to the page. Only pages without
 *  `[data-toc-label]` sections read h2s, so a guide's step panels (.platform-example-panel) count as sections. */
const PREVIEW_HEADINGS = ".pe-card, .platform-guideline-visual, .pg-example__stage, [role=dialog], [data-typography]:not(.official-platform)";
const slug = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The page's sections for "On this page": the rendered `[data-toc-label]` sections (component pages), else the page's
 * own h2 headings (guides and foundations), which get an id from their text when they have none. Sections that
 * rendered nothing are skipped; the list follows the page as it changes.
 */
export function usePageSections(scope: RefObject<HTMLElement | null>): PageSection[] {
  const [items, setItems] = useState<PageSection[]>([]);
  useEffect(() => {
    const root = scope.current;
    if (!root) return undefined;
    const collect = () => {
      const labelled = [...root.querySelectorAll<HTMLElement>("[data-toc-label]")].filter((el) => el.childElementCount > 0);
      const next = labelled.length
        ? labelled.map((el) => ({ id: el.id, label: el.dataset.tocLabel ?? el.id }))
        : [...root.querySelectorAll<HTMLElement>("h2")].filter((el) => !el.parentElement?.closest(PREVIEW_HEADINGS) && el.textContent?.trim()).map((el) => {
          if (!el.id) el.id = `section-${slug(el.textContent ?? "")}`;
          return { id: el.id, label: el.textContent!.trim() };
        });
      setItems((current) => (current.length === next.length && current.every((item, index) => item.id === next[index].id && item.label === next[index].label) ? current : next));
    };
    collect();
    const mutation = new MutationObserver(collect);
    mutation.observe(root, { childList: true, subtree: true });
    return () => mutation.disconnect();
  }, [scope]);
  return items;
}

/**
 * Figma B5 "On this page" (◇ Master-Layout 15917:6719, Trailing-Pane): an All-Caps/S Light label, then one Body/Small
 * link per section, the section in view Body/Small/Medium Strongest and the rest Regular Light (aria-current). A link
 * scrolls its section under the sticky header, keeps the #hash shareable and focuses the section's heading; ↑ / ↓ jump
 * to the previous / next section unless a control, an open overlay or a text field owns the key.
 */
export function PlatformOnThisPage({ items }: { items: PageSection[] }) {
  const [active, setActive] = useState<string>("");
  const clickedRef = useRef(0);
  useEffect(() => {
    if (!items.length) return undefined;
    const update = () => {
      if (Date.now() - clickedRef.current < 600) return; // keep the clicked item while the smooth scroll settles
      // The line just under the sticky header (its height changes with the window and the density).
      const line = (document.querySelector(".zen-app-shell__header")?.getBoundingClientRect().bottom ?? 64) + 48;
      let current = items[0]?.id ?? "";
      for (const item of items) { const el = document.getElementById(item.id); if (el && el.getBoundingClientRect().top <= line) current = item.id; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = items[items.length - 1].id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [items]);
  /** Scroll a section under the header, mark it current, keep the #hash shareable and move focus to its heading. */
  const go = (id: string) => {
    clickedRef.current = Date.now();
    setActive(id);
    const target = document.getElementById(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Keep the page URL shareable without adding a history entry per jump.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    const heading = target?.matches("h2, h3") ? target : target?.querySelector<HTMLElement>("h2, h3");
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
  return (
    <Stack gap="sm" className="platform-toc">
      <Box padding="xs"><Text textStyle="All-Caps/S" tone="light">On this page</Text></Box>
      <Stack as="nav" gap="sm" aria-label="On this page" aria-keyshortcuts="ArrowUp ArrowDown">
        {items.map((item) => (
          // zen-allow-link-underline: Figma "On this page" is a list of plain Body/Small rows; the nav landmark says they are links.
          <Text key={item.id} textStyle={item.id === active ? "Body/Small/Medium" : "Body/Small/Regular"} tone={item.id === active ? "strongest" : "light"}>
            <Link href={`#${item.id}`} tone="inherit" underline="hover" aria-current={item.id === active ? "location" : undefined} onClick={(event) => { event.preventDefault(); go(item.id); }}>{item.label}</Link>
          </Text>
        ))}
      </Stack>
    </Stack>
  );
}
