import { useSyncExternalStore } from "react";
import { isCodeLanguage, type CodeLanguageId } from "./languages";

/*
 * The one Code view language of the docs and Zen Studio: picking it in any snippet switches every snippet, in every
 * tab. Per viewer in localStorage, and in the address (?code=vue) so a shared link opens with it; React, the default,
 * leaves the address alone.
 */

const KEY = "zen-docs:code-language";
const PARAM = "code";

function readLanguage(): CodeLanguageId {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(PARAM);
    if (isCodeLanguage(fromUrl)) return fromUrl;
    const stored = window.localStorage.getItem(KEY);
    return isCodeLanguage(stored) ? stored : "react";
  } catch {
    return "react";
  }
}

let language: CodeLanguageId = typeof window === "undefined" ? "react" : readLanguage();
const listeners = new Set<() => void>();

function notify(next: CodeLanguageId) {
  if (next === language) return;
  language = next;
  listeners.forEach((listener) => listener());
}

/** Another tab picked a language. */
function onStorage(event: StorageEvent) {
  if (event.key === KEY && isCodeLanguage(event.newValue)) notify(event.newValue);
}

function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

export function setCodeLanguage(next: CodeLanguageId) {
  notify(next);
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // Storage blocked: the choice still holds for this page.
  }
  // The address keeps every other parameter (the docs and the Studio route by ?page=); no new history entry.
  const url = new URL(window.location.href);
  if (next === "react") url.searchParams.delete(PARAM);
  else url.searchParams.set(PARAM, next);
  const href = `${url.pathname}${url.search}${url.hash}`;
  if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, "", href);
}

/** The language every snippet shows. */
export function useCodeLanguage(): CodeLanguageId {
  return useSyncExternalStore(subscribe, () => language, () => "react");
}
