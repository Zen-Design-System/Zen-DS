// POSIX path helpers for the Studio edit engine (tools/studio/*.mjs), so the engine runs in the browser as well as in
// Node (Studio builder GĐ2, docs/research/studio-builder-pages-spec-2026-10-06.md §3 2a). Same results as Node's
// path.posix for the repo-relative paths the engine handles; posix.selftest in engine-iso.selftest.mjs checks it.

/** Collapses ".", ".." and repeated slashes (Node path.posix.normalize). */
function normalize(value) {
  if (value === "") return ".";
  const absolute = value.startsWith("/");
  const trailing = value.endsWith("/");
  const out = [];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (out.length && out[out.length - 1] !== "..") out.pop();
      else if (!absolute) out.push("..");
      continue;
    }
    out.push(part);
  }
  let text = (absolute ? "/" : "") + out.join("/");
  if (!text) text = absolute ? "/" : ".";
  if (trailing && text !== "/") text += "/";
  return text;
}

function join(...parts) {
  const kept = parts.filter((part) => typeof part === "string" && part.length);
  return kept.length ? normalize(kept.join("/")) : ".";
}

function dirname(value) {
  if (!value) return ".";
  const trimmed = value.length > 1 ? value.replace(/\/+$/, "") || "/" : value;
  const at = trimmed.lastIndexOf("/");
  if (at < 0) return ".";
  if (at === 0) return "/";
  return trimmed.slice(0, at);
}

/** Node path.posix.relative for two paths of the same kind (both relative to one root, or both absolute). */
function relative(from, to) {
  const a = normalize(from).replace(/\/$/, "").split("/").filter((part) => part && part !== ".");
  const b = normalize(to).replace(/\/$/, "").split("/").filter((part) => part && part !== ".");
  let same = 0;
  while (same < a.length && same < b.length && a[same] === b[same]) same += 1;
  return [...Array(a.length - same).fill(".."), ...b.slice(same)].join("/");
}

export const posix = { normalize, join, dirname, relative, sep: "/" };
