#!/usr/bin/env node
// zen-handover: hand a usage-limited Claude Code session's branch to the backup session, and take it back.
// The person adds it to their own Claude Code settings on the Team machine (see README.md next to this file):
//   StopFailure (rate_limit): when a turn stops on a usage limit in a Zen-DS or UIUX-Starter checkout, snapshot the
//     work tree (tracked changes + small untracked files) on top of HEAD, push it to refs/heads/handover/<branch> with
//     the limit text, the user's last request and Claude's last words in the commit message, and mark the checkout.
//     The backup session polls origin for handover/* refs and takes the branch over.
//   PreToolUse: only in a marked checkout, ask the backup to stop (refs/heads/reclaim/<branch>), wait for its handback
//     (refs/heads/handback/<branch>), stash the local changes (the backup's first commit holds them), fast-forward to
//     the backup's commits and tell Claude what happened before it touches anything.
// Other repos are left alone; in an unmarked checkout the PreToolUse hook returns in a few milliseconds.
// `node zen-handover.mjs status` shows this checkout's state and origin's handover refs.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_URL = /zen-ds|uiux-starter/i;
// A usage limit, not a passing 429: "You've hit your limit · resets 3pm", "Claude usage limit reached", …
const USAGE_LIMIT = /\bresets?\b|hit your|usage limit|weekly limit|session limit|out of (extra )?usage/i;
const FLAG = "zen-handover.json";
const WAIT_MS = Number(process.env.ZEN_HANDOVER_WAIT_MS) || 15 * 60 * 1000;
const POLL_MS = Number(process.env.ZEN_HANDOVER_POLL_MS) || 20 * 1000;
const MAX_UNTRACKED_BYTES = 5 * 1024 * 1024;
const MAX_UNTRACKED_FILES = 500;
const SECRET = /(^|\/)(\.env(\.[^/]*)?|\.npmrc|[^/]*\.(pem|key|p12|pfx))$/i;

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const git = (cwd, args, extra = {}) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 120_000, ...extra }).trim();
const tryGit = (cwd, args, extra) => {
  try {
    return git(cwd, args, extra);
  } catch {
    return null;
  }
};
const clip = (text, max) => (text.length > max ? `${text.slice(0, max)}\n[… ${text.length - max} more characters]` : text);
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function repoRoot(dir) {
  for (const start of [dir, path.join(dir, "Zen-DS"), path.join(dir, "UIUX-Starter")]) {
    for (let d = start; ; d = path.dirname(d)) {
      if (fs.existsSync(path.join(d, ".git"))) return d;
      if (path.dirname(d) === d) break;
    }
  }
  return null;
}

function gitDirOf(root) {
  const dotGit = path.join(root, ".git");
  if (fs.statSync(dotGit).isDirectory()) return dotGit;
  const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotGit, "utf8"));
  return m ? path.resolve(root, m[1].trim()) : dotGit;
}

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

// The user's last request and Claude's last words, from the end of the session transcript.
function lastWords(transcriptPath) {
  const out = { user: "", assistant: "" };
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return out;
  const fd = fs.openSync(transcriptPath, "r");
  const size = fs.fstatSync(fd).size;
  const length = Math.min(size, 4 * 1024 * 1024);
  const buffer = Buffer.alloc(length);
  fs.readSync(fd, buffer, 0, length, size - length);
  fs.closeSync(fd);
  const lines = buffer.toString("utf8").split("\n");
  for (let i = lines.length - 1; i >= 0 && !(out.user && out.assistant); i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (entry.isMeta || entry.isApiErrorMessage || entry.isSidechain) continue;
    const content = entry.message?.content;
    const text = (
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content.filter((b) => b?.type === "text").map((b) => b.text).join("\n")
          : ""
    ).trim();
    if (!text) continue;
    const role = entry.message?.role;
    if (role === "user" && !out.user && !/^<(local-command|command-|system-reminder|task-notification)/.test(text)) {
      out.user = text;
    }
    if (role === "assistant" && !out.assistant && !/^API Error/i.test(text) && !(text.length < 300 && USAGE_LIMIT.test(text))) {
      out.assistant = text;
    }
  }
  return out;
}

function onLimit(input, root, flagPath) {
  const said = `${input.last_assistant_message ?? ""} ${input.error_details ?? ""}`.trim();
  if (!USAGE_LIMIT.test(said) && !process.env.ZEN_HANDOVER_ANY_RATE_LIMIT) return;
  if (fs.existsSync(flagPath)) return; // handed over already: the backup holds the branch
  const url = tryGit(root, ["remote", "get-url", "origin"]) ?? "";
  if (!REPO_URL.test(url)) return;
  const branch = tryGit(root, ["symbolic-ref", "--short", "HEAD"]);
  if (!branch) return;
  const head = git(root, ["rev-parse", "HEAD"]);
  const gitDir = git(root, ["rev-parse", "--absolute-git-dir"]);
  const index = path.join(os.tmpdir(), `zen-handover-${process.pid}.index`);
  if (fs.existsSync(path.join(gitDir, "index"))) fs.copyFileSync(path.join(gitDir, "index"), index);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    git(root, ["add", "-u"], { env });
    const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
    const taken = [];
    const skipped = [];
    for (const file of untracked) {
      let size = Infinity;
      try {
        size = fs.statSync(path.join(root, file)).size;
      } catch {}
      const ok = size <= MAX_UNTRACKED_BYTES && !SECRET.test(file) && taken.length < MAX_UNTRACKED_FILES;
      (ok ? taken : skipped).push(file);
    }
    for (let i = 0; i < taken.length; i += 100) git(root, ["add", "--", ...taken.slice(i, i + 100)], { env });
    const tree = git(root, ["write-tree"], { env });
    const changed = git(root, ["diff", "--cached", "--name-only", head], { env }).split("\n").filter(Boolean);
    const words = lastWords(input.transcript_path);
    const message = [
      `handover: ${branch} (${path.basename(root)})`,
      "",
      `Claude Code session ${input.session_id ?? "?"} stopped on a usage limit at ${new Date().toISOString()}.`,
      `Limit message: ${said || "(none)"}`,
      `Base commit: ${head}`,
      `Work tree in this snapshot: ${changed.length} changed file(s)` +
        (skipped.length ? `; left out (large or secret): ${skipped.slice(0, 20).join(", ")}` : ""),
      `Session cwd: ${input.cwd ?? root}`,
      "",
      "Last request from the user:",
      clip(words.user || "(not found)", 4000),
      "",
      "Last thing Claude wrote before the limit:",
      clip(words.assistant || "(not found)", 4000),
      "",
    ].join("\n");
    const sha = git(root, ["commit-tree", tree, "-p", head, "-F", "-"], { input: message });
    git(root, ["push", "origin", `+${sha}:refs/heads/handover/${branch}`]);
    writeJson(flagPath, { branch, sha, base: head, at: new Date().toISOString(), remote: url });
  } finally {
    fs.rmSync(index, { force: true });
  }
}

function onResume(root, flagPath) {
  let flag;
  try {
    flag = JSON.parse(fs.readFileSync(flagPath, "utf8"));
  } catch {
    fs.rmSync(flagPath, { force: true });
    return;
  }
  const branch = flag.branch;
  const handover = `refs/heads/handover/${branch}`;
  const handback = `refs/heads/handback/${branch}`;
  if (!flag.reclaimed) {
    tryGit(root, ["push", "origin", `+${flag.sha}:refs/heads/reclaim/${branch}`]);
    flag.reclaimed = new Date().toISOString();
    writeJson(flagPath, flag);
  }
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    const refs = tryGit(root, ["ls-remote", "origin", handover, handback]);
    if (refs !== null && (refs.includes(handback) || !refs.includes(handover))) break;
    if (Date.now() > deadline) {
      block(
        `The backup Claude session took over ${branch} while you were at your usage limit and is still wrapping up. ` +
          "Don't edit anything yet: this hook waits for its handback again on your next tool call, so retry the same call.",
      );
    }
    sleep(POLL_MS);
  }

  const finish = () => {
    fs.rmSync(flagPath, { force: true });
    for (const ref of [handback, `refs/heads/reclaim/${branch}`]) tryGit(root, ["push", "origin", `:${ref}`]);
  };
  tryGit(root, ["fetch", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`]);
  const local = git(root, ["rev-parse", "HEAD"]);
  const remote = tryGit(root, ["rev-parse", "--verify", `refs/remotes/origin/${branch}`]);
  if (!remote || remote === local || tryGit(root, ["merge-base", "--is-ancestor", remote, local]) !== null) {
    finish(); // the backup added nothing: carry on as before
    return;
  }
  const current = tryGit(root, ["symbolic-ref", "--short", "HEAD"]);
  if (current !== branch) {
    finish();
    block(
      `While you were at your usage limit the backup Claude session pushed new commits to origin/${branch}, but this ` +
        `checkout is now on ${current ?? "a detached HEAD"}. Bring them in before working on ${branch} again ` +
        `(git switch ${branch} && git merge --ff-only origin/${branch}), then repeat the tool call this message stopped.`,
    );
  }
  let stash = "";
  if (git(root, ["status", "--porcelain"]) !== "") {
    stash = `zen-handover backup ${new Date().toISOString()}`;
    if (tryGit(root, ["stash", "push", "-u", "-m", stash]) === null) {
      finish();
      block(
        `The backup Claude session pushed new commits to origin/${branch} while you were at your usage limit, and your ` +
          `uncommitted changes could not be stashed. Its first commit holds the work tree it took over. Compare (git diff ` +
          `HEAD origin/${branch}), then git merge origin/${branch} (merge, no rebase) before editing anything.`,
      );
    }
  }
  const commits = tryGit(root, ["log", "--oneline", "--no-decorate", "-15", `${local}..${remote}`]) ?? "";
  const merged = tryGit(root, ["merge", "--ff-only", remote]) !== null;
  finish();
  const kept = stash
    ? `Your uncommitted changes were stashed as "${stash}". The backup's first commit already holds them, so check and drop that stash.`
    : "";
  if (!merged) {
    block(
      `The backup Claude session continued ${branch} while you were at your usage limit, but your branch could not be ` +
        `fast-forwarded to origin/${branch}. Run git merge origin/${branch} (merge, no rebase) before editing anything. ${kept}`,
    );
  }
  block(
    [
      `While you were at your usage limit, the backup Claude session continued your work on ${branch} and handed it back.`,
      `This checkout was fast-forwarded to origin/${branch}. New commits:`,
      commits,
      kept,
      `Read the backup's handback notes first: git log -1 --format=%B ${remote.slice(0, 12)} (in Zen-DS also the "Backup session" ` +
        "lines in today's docs/context/session-log-*.md). Re-read any file before editing it, then repeat the tool call this message stopped.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

function status() {
  const root = repoRoot(process.cwd());
  if (!root) return console.log("Not in a git checkout.");
  const flagPath = path.join(gitDirOf(root), FLAG);
  console.log(fs.existsSync(flagPath) ? `Handed over: ${fs.readFileSync(flagPath, "utf8")}` : "No pending handover here.");
  const refs = tryGit(root, ["ls-remote", "origin", "refs/heads/handover/*", "refs/heads/handback/*", "refs/heads/reclaim/*"]);
  console.log(refs || "No handover refs on origin.");
}

if (process.argv[2] === "status") {
  status();
} else {
  let input = null;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {}
  const root = input && repoRoot(input.cwd || process.cwd());
  if (root) {
    const flagPath = path.join(gitDirOf(root), FLAG);
    if (input.hook_event_name === "StopFailure") onLimit(input, root, flagPath);
    else if (input.hook_event_name === "PreToolUse" && fs.existsSync(flagPath)) onResume(root, flagPath);
  }
}
