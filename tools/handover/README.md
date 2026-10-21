# zen-handover

Hands a Claude Code session's branch to the backup cloud session when the session stops on a usage limit, and takes
it back when the session resumes. It covers checkouts of Zen-DS and UIUX-Starter (worktrees included) and leaves other
repos alone.

## How it works

| Moment | Who | What happens |
| --- | --- | --- |
| A turn stops on a usage limit | `StopFailure` hook (matcher `rate_limit`) | Snapshots the work tree on top of HEAD: tracked changes, staged files, untracked files up to 5 MB, no `.env` / `.npmrc` / keys. Pushes the snapshot to `refs/heads/handover/<branch>`. The commit message carries the limit text with its reset time, the user's last request and Claude's last words. Marks the checkout. A passing 429 that is not a usage limit is ignored. |
| While the session is limited | backup session | Polls origin for `handover/*`. It continues the branch from the snapshot, pushes after each passing gate, and writes its notes in the last commit (`docs(handback): …`). |
| The session works again | `PreToolUse` hook, marked checkout only | Pushes `refs/heads/reclaim/<branch>` and waits, up to 15 minutes per tool call, for the backup's `refs/heads/handback/<branch>`. It stashes the local changes, which are already in the backup's first commit, and fast-forwards to the backup's commits. Then it stops that one tool call with a message telling Claude what changed and where the notes are. The next tool call runs normally. |

In a checkout without a pending handover the `PreToolUse` hook returns in tens of milliseconds.

## Install on the Team machine (once)

1. Copy the script:

   ```bash
   mkdir -p ~/.claude/hooks
   git -C <Zen-DS checkout> fetch origin claude/vibrant-einstein-22wmwz
   git -C <Zen-DS checkout> show origin/claude/vibrant-einstein-22wmwz:tools/handover/zen-handover.mjs > ~/.claude/hooks/zen-handover.mjs
   ```

2. Add the two hooks to `~/.claude/settings.json`. Keep what is there; if `StopFailure` or `PreToolUse` already
   exist, append these entries to their arrays:

   ```json
   {
     "hooks": {
       "StopFailure": [
         {
           "matcher": "rate_limit",
           "hooks": [{ "type": "command", "command": "node \"$HOME/.claude/hooks/zen-handover.mjs\"", "timeout": 90 }]
         }
       ],
       "PreToolUse": [
         {
           "matcher": "*",
           "hooks": [{ "type": "command", "command": "node \"$HOME/.claude/hooks/zen-handover.mjs\"", "timeout": 1020 }]
         }
       ]
     }
   }
   ```

3. Sessions that are already running pick the hooks up after `/hooks` or a restart.

4. Check a checkout: `node ~/.claude/hooks/zen-handover.mjs status` (pending handover, and the signal refs on origin).

To remove it, delete the two entries and the script.

## Signal refs on origin

| Ref | Pushed by | Meaning |
| --- | --- | --- |
| `handover/<branch>` | the Team session's hook | Limited; the commit is its work-tree snapshot |
| `reclaim/<branch>` | the Team session's hook | Back from the limit; the backup wraps up now |
| `handback/<branch>` | the backup session | Done; points at the final head of `<branch>` |

The backup deletes `handover/` and `reclaim/`; the Team hook deletes `handback/` once it has fast-forwarded.

A handover can also be signalled by hand from the session's checkout:

```bash
s=$(git stash create); git push origin ${s:-HEAD}:refs/heads/handover/$(git branch --show-current)
```

## Notes

- The commit message holds the user's last request and Claude's last words, so they are stored on GitHub with the
  snapshot.
- Untracked files over 5 MB and secret-looking files are left out of the snapshot; the message lists them.
- If the Team session switched branches meanwhile, or the fast-forward fails, the hook does not merge on its own: it
  tells Claude to merge `origin/<branch>` (merge, no rebase).
