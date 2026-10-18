// Zen Agent's self-check (plan docs/research/studio-vibe-agent-2026-10-18.md §7.4, user 2026-10-18: "dùng các rule,
// harness … lúc vibe trong studio"): the Zen usage harness (tools/usage-guard, the rules `npx zen-usage` runs in apps) on
// the open page's code. At the end of a turn that changed the page, the findings that turn caused go back to the model
// to fix; what was there before the turn (the Studio's starter page has one) is left alone.
import { checkSource } from "../../usage-guard/api.mjs";

/** The usage harness on a page's TSX: [{ severity, line, column, rule, tag, message, guideline, allow }]. */
export function pageFindings(code, filename = "page.zen.tsx") {
  return checkSource(String(code ?? ""), filename);
}

/**
 * Prototype wiring: on a page made in the Studio a button or a controlled control gets its action in the Prototype tab
 * (proto.*), when the person wants a prototype, so a design without one is not a slip. The self-check does not make the
 * agent wire every button; check_page still lists them apart.
 */
export const WIRING_RULES = new Set(["interaction/action-without-handler", "interaction/controlled-needs-handler"]);

/** The findings that are design slips (wiring left out). */
export const designFindings = (findings) => (findings ?? []).filter((finding) => !WIRING_RULES.has(finding.rule));

/** What makes two findings the same one, wherever its line moved to. */
const keyOf = (finding) => `${finding.rule}|${finding.tag ?? ""}|${finding.message}`;

/** The findings of `after` that `before` did not have (counted, so a second copy of an old finding is new). */
export function newFindings(after, before) {
  const left = new Map();
  for (const finding of before ?? []) left.set(keyOf(finding), (left.get(keyOf(finding)) ?? 0) + 1);
  return (after ?? []).filter((finding) => {
    const count = left.get(keyOf(finding)) ?? 0;
    if (!count) return true;
    left.set(keyOf(finding), count - 1);
    return false;
  });
}

/** One line per finding, as zen-ds check_usage prints them. */
export function formatFindings(findings, filename = "page.zen.tsx") {
  return findings.map((finding) => `${finding.severity === "error" ? "✗" : "⚠"} ${filename}:${finding.line}:${finding.column} [${finding.rule}] <${finding.tag}> ${finding.message}`).join("\n");
}

/** The page's code from a get_code answer (the tab's text content), or null when the open page is no Studio page. */
export function codeOf(answer) {
  if (!answer?.ok) return null;
  const text = (answer.content ?? []).filter((item) => item?.type === "text").map((item) => item.text).join("\n");
  return /@zen-page|from "@zen-ds\/react/.test(text) ? text : null;
}
