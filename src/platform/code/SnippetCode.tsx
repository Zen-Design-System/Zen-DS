import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SelectField } from "../../components/Input";
import { Link } from "../../components/Link";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { demoFile } from "../examples/demoFile";
import { usesDemo } from "../examples/exampleCode";
import { useStudioBridge } from "../studio/bridge";
import { CodeView, type CodeLanguage } from "../studio/code/CodeView";
import { htmlSnippet } from "./html";
import { CODE_LANGUAGES, isCodeLanguage, languageInfo, listNames, snippetStatus, type CodeLanguageId, type CodeLanguageStatus } from "./languages";
import { setCodeLanguage, useCodeLanguage } from "./preference";
import { useSnippetSpecimen, type SpecimenSource } from "./specimen";
import "./snippet.css";

/*
 * A copyable snippet (a playground's live code, an example's code) in the git-style code view, with the language
 * picker in its header (plan docs/research/code-languages-plan-2026-10-03.md §3.E). The classic docs and Zen Studio
 * (the playground's and the example's Code tab) render this same view. Every language stays listed with its honest
 * state (user, 2026-11-12); one that has no code for the snippet says so in words, and Copy leaves. HTML is the
 * specimen's live markup (code/html.ts), read from where the snippet's specimen renders (code/specimen.ts).
 */

const STATUS_META: Record<CodeLanguageStatus, string | undefined> = { ready: undefined, markup: "Markup only", "not-yet": "Not yet" };

/**
 * The HTML snippet of the specimen while `source` is given, read again whenever the specimen's DOM changes: a string,
 * null when the specimen is not rendered, undefined before the first read (no source).
 */
function useSpecimenHtml(source: SpecimenSource | null, markupOnly: boolean, code: string): string | null | undefined {
  const [html, setHtml] = useState<string | null | undefined>(undefined);
  useLayoutEffect(() => {
    if (!source) return undefined;
    let frame = 0;
    let observer: MutationObserver | null = null;
    const read = (element: Element) => setHtml(htmlSnippet(element, { markupOnly }));
    // On the first commit the specimen's container may not have its ref yet (a parent's ref attaches after its
    // children's effects), and a Studio frame can draw later: look again for a few frames before saying there is none.
    const attach = (tries: number) => {
      const element = source();
      if (!element) {
        if (tries > 0) frame = requestAnimationFrame(() => attach(tries - 1));
        else setHtml(null);
        return;
      }
      read(element);
      // A pressed state, an image that loaded, a list that grew: the markup follows what the specimen shows.
      observer = new MutationObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => read(element));
      });
      observer.observe(element, { subtree: true, childList: true, attributes: true, characterData: true });
    };
    attach(10);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
    // `code` follows the playground's props: the specimen re-rendered with them in the same commit.
  }, [source, markupOnly, code]);
  return source ? html : undefined;
}

/** The Installation page's Languages section, keeping the other parameters (?code=…) of the address. */
function languagesHref() {
  const url = new URL(window.location.href);
  url.searchParams.set("page", "installation");
  url.searchParams.delete("collection");
  url.hash = "languages";
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Follows a docs link in place: the docs and the Studio both route on popstate (they re-read ?page=), so no reload
 * drops the Studio's state. The classic docs then bring the section's heading under the header and focus it, as
 * "On this page" does.
 */
function followDocsLink(event: MouseEvent<HTMLAnchorElement>, scroll: boolean) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const url = new URL(event.currentTarget.href);
  window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (!scroll) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const heading = document.getElementById(url.hash.slice(1));
    if (!heading) return;
    heading.scrollIntoView({ block: "start" });
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }));
}

/**
 * An example imports the demo world from "./demo" (examples/source.ts): the header offers that file, demo.ts, to copy
 * beside the snippet, so the copied example runs as it is.
 */
function DemoFileButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(demoFile);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context or permission): the label stays as it was.
    }
  };
  return (
    <>
      {/* zen-allow-compact-button: platform chrome — a file action in the code view's header, beside Wrap and Copy. */}
      <Button level="tertiary" size="xs" startIcon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} decorative />} aria-label={copied ? "Copied demo.ts" : "Copy demo.ts, the sample data this example imports"} onClick={copy}>demo.ts</Button>
      <VisuallyHidden role="status">{copied ? "demo.ts copied to the clipboard" : ""}</VisuallyHidden>
    </>
  );
}

/**
 * `specimen`: where the snippet's specimen renders, when no ComponentPreview or ExampleCard around the snippet says so
 * (the Studio's Code tab, beside the example's frame on the canvas).
 */
export function SnippetCode({ code, maxHeight, specimen }: { code: string; maxHeight?: number | string; specimen?: SpecimenSource }) {
  const studio = useStudioBridge();
  const around = useSnippetSpecimen();
  const source = specimen ?? around;
  const picked = useCodeLanguage();
  // HTML needs a specimen to read: a snippet without one (a setup file) has no HTML.
  const htmlState = source ? snippetStatus(code, "html") : { status: "not-yet" as const, missing: [] };
  const html = useSpecimenHtml(picked === "html" && htmlState.status !== "not-yet" ? source : null, htmlState.status === "markup", code);
  // A specimen that is not rendered (null) has no markup to show either.
  const states = CODE_LANGUAGES.map((language) => ({ language, ...(language.id !== "html" ? snippetStatus(code, language.id) : html === null ? { status: "not-yet" as const, missing: [] } : htmlState) }));
  const current = states.find((state) => state.language.id === picked) ?? states[0];
  const codeIn = (language: CodeLanguageId): { code: string; highlight: CodeLanguage } | null => (language === "react" ? { code, highlight: "tsx" } : language === "html" && html ? { code: html, highlight: "html" } : null);
  const shown = current.status === "not-yet" ? null : codeIn(picked);

  const picker = (
    <SelectField
      aria-label="Code language"
      className="platform-snippet__language"
      size="sm"
      popoverWidth="hug"
      value={picked}
      onValueChange={(value) => { if (isCodeLanguage(value)) setCodeLanguage(value); }}
      options={states.map(({ language, status }) => ({ value: language.id, label: language.label, meta: STATUS_META[status] }))}
    />
  );

  if (shown) return <CodeView key="code" code={shown.code} language={shown.highlight} languageControl={picker} maxHeight={maxHeight} actions={picked === "react" && usesDemo(code) ? <DemoFileButton /> : undefined} />;
  // HTML not read yet (the first frames): the code view waits empty rather than saying "not available".
  if (picked === "html" && current.status !== "not-yet" && html === undefined) return <CodeView key="code" code="" language="html" languageControl={picker} maxHeight={maxHeight} toolbar={false} />;

  const { label } = languageInfo(picked);
  const available = states.filter((state) => state.status !== "not-yet").map((state) => state.language.label);
  const notice = (
    <>
      <p>{current.missing.length ? `${label} isn't available for ${listNames(current.missing)} yet.` : `${label} isn't available for this snippet yet.`}</p>
      <p>
        {`${listNames(available)} ${available.length === 1 ? "is" : "are"} available. `}
        <Link href={languagesHref()} onClick={(event) => followDocsLink(event, !studio)}>See language status</Link>
      </p>
    </>
  );
  return <CodeView key="notice" code="" languageControl={picker} notice={notice} maxHeight={maxHeight} />;
}
