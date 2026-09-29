#!/usr/bin/env node
// npm run ship: local gate -> push the current branch -> open (or print the link to) a pull request.
// It never merges and never touches main. CI (.github/workflows/ci.yml) runs the full gate on the PR.
//
//   npm run ship                          push the current branch, print / open the PR
//   npm run ship -- --title="..."         PR title (default: the last commit subject)
//   npm run ship -- --commit="msg" --include=src/a.ts,docs/b.md   commit exactly those paths first
//   npm run ship -- --skip-gate           skip the local gate (the PR body says so)
//   npm run ship -- --dry                 show what would happen, change nothing
//
// PR creation: `gh` if installed, else the GitHub API when GITHUB_TOKEN / GH_TOKEN is set, else it prints the
// prefilled "compare" link (one click on GitHub). Pushing uses the git credentials already set up on this machine.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY = !!args.dry;
const BASE = args.base || 'main';
const run = (cmd, a, o = {}) => spawnSync(cmd, a, { encoding: 'utf8', ...o });
const git = (...a) => run('git', a);
const out = (r) => (r.stdout || '').trim();
const say = (m) => console.log(m);
const die = (m) => { console.error('ship: ' + m); process.exit(1); };

if (git('rev-parse', '--git-dir').status !== 0) die('not inside a git repository');
const branch = out(git('branch', '--show-current'));
if (!branch) die('detached HEAD: check out a branch first');
if (branch === BASE) die(`you are on ${BASE}; ship works from a feature branch (git switch -c my-branch)`);

// 1. Optional commit of exactly the named paths (never `git add -A`: other sessions may have edits in the tree).
if (args.commit) {
  if (!args.include || args.include === true) die('--commit needs --include=path,path so only those files are committed');
  const paths = String(args.include).split(',').map((s) => s.trim()).filter(Boolean);
  say(`commit: ${paths.length} path(s) -> "${args.commit}"`);
  if (!DRY) {
    let r = git('add', '--', ...paths); if (r.status !== 0) die(r.stderr);
    r = git('commit', '-m', String(args.commit), '--', ...paths); if (r.status !== 0) die(r.stdout + r.stderr);
  }
}

// 2. What is being shipped.
git('fetch', 'origin', BASE, '--quiet');
const baseRef = git('rev-parse', '--verify', `origin/${BASE}`).status === 0 ? `origin/${BASE}` : BASE;
const commits = out(git('log', '--format=%h %s', `${baseRef}..HEAD`)).split('\n').filter(Boolean);
if (!commits.length) die(`nothing to ship: ${branch} has no commits beyond ${baseRef}`);
const files = out(git('diff', '--name-only', `${baseRef}...HEAD`)).split('\n').filter(Boolean);
const dirty = out(git('status', '--short')).split('\n').filter(Boolean);
say(`branch ${branch}: ${commits.length} commit(s), ${files.length} file(s) vs ${baseRef}`);
if (dirty.length) say(`note: ${dirty.length} uncommitted change(s) stay local and are NOT shipped`);

// 3. Local gate on the UI files this branch changed (CI still runs everything).
let gate = 'skipped (--skip-gate)';
const uiFiles = files.filter((f) => /^(src|tokens|scripts)\//.test(f));
const BROAD = 40; // a release-sized branch: the scoped local gate is the wrong tool, CI runs the whole thing
if (!args['skip-gate']) {
  if (!uiFiles.length) gate = 'not needed: no UI/source files changed';
  else if (uiFiles.length > BROAD) gate = `not run locally: ${uiFiles.length} source files changed, CI runs the full gate`;
  else {
    say(`gate: node tools/qa/run.mjs --files=… (${uiFiles.length} file(s))`);
    if (DRY) gate = 'dry run';
    else {
      const r = run('node', ['tools/qa/run.mjs', `--files=${uiFiles.join(',')}`], { stdio: 'inherit' });
      if (r.status !== 0) die('the local gate failed; fix it, or re-run with --skip-gate to let CI decide');
      gate = 'passed (tools/qa/run.mjs)';
    }
  }
}

// 4. Push.
say(`push: origin ${branch}`);
if (!DRY) { const r = run('git', ['push', '-u', 'origin', branch], { stdio: 'inherit' }); if (r.status !== 0) die('push failed (check the git credentials on this machine)'); }

// 5. Pull request.
const remote = out(git('remote', 'get-url', 'origin')).replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
const m = remote.match(/github\.com[/:]([^/]+)\/([^/]+)$/); if (!m) die('origin is not a GitHub remote: ' + remote);
const [, owner, repo] = m;
const title = String(args.title && args.title !== true ? args.title : commits[0].replace(/^\w+ /, ''));
const body = `## Changes\n${commits.map((c) => '- ' + c).join('\n')}\n\n## Files\n${files.length} changed (${files.slice(0, 15).join(', ')}${files.length > 15 ? ', …' : ''})\n\n## Local gate\n${gate}\n\nCI runs the full gate on this pull request. Merge when it is green.\n`;
const compare = `https://github.com/${owner}/${repo}/compare/${BASE}...${encodeURIComponent(branch)}?expand=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body).slice(0, 6000)}`;
if (DRY) { say('dry run: would open a PR titled "' + title + '"'); say(body); process.exit(0); }

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (run('which', ['gh']).status === 0) {
  const f = join(mkdtempSync(join(tmpdir(), 'ship-')), 'body.md'); writeFileSync(f, body);
  const r = run('gh', ['pr', 'create', '--base', BASE, '--head', branch, '--title', title, '--body-file', f]);
  if (r.status === 0) { say('pull request: ' + out(r)); process.exit(0); }
  say('gh could not create the PR (' + (r.stderr || '').trim().split('\n').pop() + '); falling back');
}
if (token) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ title, head: branch, base: BASE, body }) });
  const j = await res.json();
  if (res.ok) { say('pull request: ' + j.html_url); process.exit(0); }
  say('GitHub API refused: ' + (j.message || res.status) + (j.errors ? ' ' + JSON.stringify(j.errors) : '')); 
}
say('open the pull request (one click): ' + compare);
