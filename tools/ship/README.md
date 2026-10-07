# npm run ship

One command from a finished branch to a pull request. It never merges and never touches `main`.

    npm run ship                                   push the current branch, open / link the PR
    npm run ship -- --commit="msg" --include=a,b   commit exactly those paths first (never `git add -A`)
    npm run ship -- --title="..." --base=main      PR title / base
    npm run ship -- --skip-gate                    skip the local gate (the PR body records it)
    npm run ship -- --dry                          show the plan and the PR body, change nothing

Steps: commit (optional) -> list what is ahead of `origin/main` -> local gate (`tools/qa/run.mjs --files=…` for up to 40 changed
source files; a bigger branch is left to CI) -> `git push -u origin <branch>` -> pull request.

The PR is created with `gh` when installed, else with the GitHub API when `GITHUB_TOKEN` or `GH_TOKEN` is set, else the
command prints a prefilled compare link (one click). CI (`.github/workflows/ci.yml`) runs the full gate on the PR, so the
human step left is the merge.

Uncommitted changes stay local and are not shipped. Pushing needs the git credentials already set up on this machine.
