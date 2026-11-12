import type { MouseEvent } from "react";
import { SelectField } from "../../components/Input";
import { Link } from "../../components/Link";
import { useStudioBridge } from "../studio/bridge";
import { CodeView, type CodeLanguage } from "../studio/code/CodeView";
import { CODE_LANGUAGES, isCodeLanguage, languageInfo, listNames, snippetStatus, type CodeLanguageId, type CodeLanguageStatus } from "./languages";
import { setCodeLanguage, useCodeLanguage } from "./preference";
import "./snippet.css";

/*
 * A copyable snippet (a playground's live code, an example's code) in the git-style code view, with the language
 * picker in its header (plan docs/research/code-languages-plan-2026-10-03.md §3.E). The classic docs and Zen Studio
 * (the playground's and the example's Code tab) render this same view. Every language stays listed with its honest
 * state (user, 2026-11-12); one that has no code for the snippet says so in words, and Copy leaves.
 */

const STATUS_META: Record<CodeLanguageStatus, string | undefined> = { ready: undefined, markup: "Markup only", "not-yet": "Not yet" };

/** The snippet in `language`, or null while that language has no code for it. */
function codeIn(language: CodeLanguageId, code: string): { code: string; highlight: CodeLanguage } | null {
  return language === "react" ? { code, highlight: "tsx" } : null;
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

export function SnippetCode({ code, maxHeight }: { code: string; maxHeight?: number | string }) {
  const studio = useStudioBridge();
  const picked = useCodeLanguage();
  const states = CODE_LANGUAGES.map((language) => ({ language, ...snippetStatus(code, language.id) }));
  const current = states.find((state) => state.language.id === picked) ?? states[0];
  const shown = current.status === "not-yet" ? null : codeIn(picked, code);

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

  if (shown) return <CodeView key="code" code={shown.code} language={shown.highlight} languageControl={picker} maxHeight={maxHeight} />;

  const { label } = languageInfo(picked);
  const available = states.filter((state) => state.status !== "not-yet" && codeIn(state.language.id, code)).map((state) => state.language.label);
  const notice = (
    <>
      <p>{current.missing.length ? `${label} isn't available for ${listNames(current.missing)} yet.` : `${label} isn't available yet.`}</p>
      <p>
        {`${listNames(available)} ${available.length === 1 ? "is" : "are"} available. `}
        <Link href={languagesHref()} onClick={(event) => followDocsLink(event, !studio)}>See language status</Link>
      </p>
    </>
  );
  return <CodeView key="notice" code="" languageControl={picker} notice={notice} maxHeight={maxHeight} />;
}
