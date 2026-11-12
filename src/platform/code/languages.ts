import manifest from "../code-languages.generated.json";

/*
 * The docs Code view's languages and what each can show for a snippet (plan
 * docs/research/code-languages-plan-2026-10-03.md §3.E). React is the reference; another language shows code for a
 * snippet only when every component in it is available there (code-languages.generated.json, built with the
 * guidelines). Until then the Code view says so in words: it never shows a placeholder dressed as code.
 */

export type CodeLanguageId = "react" | "html" | "vue" | "swift" | "flutter" | "svelte";
/** ready: code in that language · markup: the static markup only (behaviour needs JavaScript) · not-yet: nothing. */
export type CodeLanguageStatus = "ready" | "markup" | "not-yet";

export type CodeLanguageInfo = {
  id: CodeLanguageId;
  /** The picker's option and the not-ready message ("Vue isn't available for Button yet"). */
  label: string;
  /** The Languages table's longer name. */
  name: string;
  /** How an app gets it, once anything is available (the Languages table). */
  install: string;
};

/** In the picker's order: React, then the user's order for the ports (2026-10-08). Every language stays listed. */
export const CODE_LANGUAGES: readonly CodeLanguageInfo[] = [
  { id: "react", label: "React", name: "React 19 · TSX", install: "npm install @zen-ds/react" },
  { id: "html", label: "HTML", name: "HTML + CSS", install: "@zen-ds/react/styles.css on any page" },
  { id: "vue", label: "Vue", name: "Vue 3", install: "A Vue package (planned)" },
  { id: "swift", label: "Swift", name: "SwiftUI", install: "A Swift package (tokens today: platforms/swift)" },
  { id: "flutter", label: "Flutter", name: "Flutter", install: "A Dart package (tokens today: platforms/flutter)" },
  { id: "svelte", label: "Svelte", name: "Svelte 5", install: "A Svelte package (planned)" },
];

export const isCodeLanguage = (value: unknown): value is CodeLanguageId => CODE_LANGUAGES.some((language) => language.id === value);
export const languageInfo = (id: CodeLanguageId) => CODE_LANGUAGES.find((language) => language.id === id) ?? CODE_LANGUAGES[0];

type ManifestRow = { slug: string } & Record<CodeLanguageId, CodeLanguageStatus>;
const components = manifest.components as Record<string, ManifestRow>;

/** Every public component and its row, sorted by name (the Languages table). */
export const languageRows = Object.entries(components).map(([name, row]) => ({ name, ...row }));

/** The library components a snippet renders: its JSX tags that the library exports, in order of appearance. */
export function componentsIn(code: string): string[] {
  const found = new Set<string>();
  for (const match of code.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) if (components[match[1]]) found.add(match[1]);
  return [...found];
}

export type SnippetLanguageStatus = { status: CodeLanguageStatus; /** The snippet's components not available in it. */ missing: string[] };

/**
 * What `language` can show for a snippet: ready when all its components are, markup when the weakest is markup,
 * else not-yet with the missing components. A snippet without library components (a setup file) follows the
 * language as a whole: ready only for React.
 */
export function snippetStatus(code: string, language: CodeLanguageId): SnippetLanguageStatus {
  if (language === "react") return { status: "ready", missing: [] };
  const used = componentsIn(code);
  if (!used.length) return { status: "not-yet", missing: [] };
  const missing = used.filter((name) => components[name][language] === "not-yet");
  if (missing.length) return { status: "not-yet", missing };
  return { status: used.some((name) => components[name][language] === "markup") ? "markup" : "ready", missing: [] };
}

/** How many components each language has, for the Languages table. */
export function languageCounts(language: CodeLanguageId) {
  const counts = { ready: 0, markup: 0, total: languageRows.length };
  for (const row of languageRows) {
    if (row[language] === "ready") counts.ready += 1;
    else if (row[language] === "markup") counts.markup += 1;
  }
  return counts;
}

/** "Button", "Button and Icon", "Button, Icon and Tooltip", "Button, Icon, Tooltip and 2 more". */
export function listNames(names: readonly string[], max = 3) {
  if (names.length <= 1) return names.join("");
  if (names.length > max) return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
