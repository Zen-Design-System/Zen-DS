# Figma kit

Finds out which Figma component sets changed since their contracts were captured, fetches only those variants, and
patches `docs/figma-contracts/*.json`, so a Figma re-sync costs one hash call instead of a re-read of every set.
Pure node, no dependencies. It reads `tools/figma-contract/figma-console-extract.js` and adds `digest-norm.js` on top.

```bash
node tools/figma-kit/figma-call.mjs lock [--check]      # build / verify contracts.lock.json (id → per-variant hashes)
node tools/figma-kit/figma-call.mjs code hashes --file=breadcrumbs.json   # or --all, --sets=id,id, --full, --chunk=20 --call=2
#   paste the printed code into use_figma (file 9nZv4uW2LT21yuHabMTCh1); save the returned array to a file
node tools/figma-kit/figma-call.mjs status <result.json>  # ✓ / ✗ per set; names the changed, added, removed variants
node tools/figma-kit/figma-call.mjs code fetch --set=<id> --keys="Size=Small;Size=Medium"   # only the changed variants
node tools/figma-kit/figma-call.mjs patch --set=<id> [--remove="k1;k2"] part0.txt part1.txt  # merge, refresh the lock
node tools/figma-kit/figma-call.mjs code hashes --sets=<id>  →  status     # must show ✓ after a patch
node tools/figma-kit/selftest.mjs                        # 13 checks, on copies, never on the repo
```

## What the hash covers

- **Mode-independent.** A paint, effect or gradient stop that has a bound variable drops its resolved colour, so moving a
  set into another mode frame or changing a token *value* never changes a hash. A re-binding, a geometry change, a new
  layer or a changed text style does. Token values are `zen-ds-token-sync`'s job.
- **Order-independent.** `h` covers the set's own fields plus its variants sorted by key.
- `contracts.lock.json` is generated: run `lock` after editing a contract by hand (`lock --check` fails when stale).
  `button.json` is superseded by `button-text.json` / `button-icon.json` and is not locked.

## Gotchas (found while checking against the live file)

- **`use_figma` skips the children of invisible instances by default; the desktop console does not.** The stored
  contracts came from the console, so a hidden `Dash` instance lost its `Vector` and a hidden nested instance vanished:
  two of the three Breadcrumbs sets hashed differently for no real reason. `digest-norm.js` sets
  `figma.skipInvisibleInstanceChildren = false`. Any other hash or extract call made through `use_figma` with the bare
  extractor has the same divergence: always use `code hashes` / `code fetch`.
- One `use_figma` result is capped near 20 KB, so `fetch` returns 15,000 characters per part (`--part=1`, …). Changed
  variants must be saved to a file to be patched: fetch few variants, and use the desktop console + clipboard
  (`tools/figma-contract/README.md`) when a whole large set changed.
- `patch` writes a contract back in the layout it had (JS compact, Python default, 1/2/4-space indent) and refuses any
  other layout instead of reformatting a 2 MB file.
- A variant key ending in ` #2` marks a duplicate variant name in Figma; select those with `--all-variants`.

## Not done yet

Suites for the 69 sets that have none, `check.mjs` flags (`--contract`, `--mode`, `--json`), `measure.mjs`, live token
reads. See `docs/context/process-audit-2026-09-29.md` §C.

## Why a set can differ from the lock (found on the first live run, 89 sets)

Kit v2 already ignores the first three; the last one is real information, not noise.

1. Set descriptions come back HTML-escaped from `use_figma` (`&quot;`): decoded before hashing.
2. Older contract captures kept typography variable bindings on text layers that have a text style, and some captures dropped hidden layers inside instances while others kept them: text-style bindings and hidden layers under an instance are ignored (hidden layers of the component itself still count).
3. Colours behind a bound variable never count (mode independent).
4. The hash is **transitive**: a set that contains instances is hashed with the instances' expanded children, so one edit to a master (Button/Icon-Main, Input Field-Only, Avatar/Single ...) changes every set that nests it. A long list of "changed" sets is normally a few root edits. Start from the sets that contain no other instance and work outwards.

Sample of 12 sets after v2: 8 matched the lock, the other 4 (Popover/Default, Badge XSmall, Input Small/XLarge/Hover/Disabled/Error states) differ in real variants. `compare-hashes.mjs <live-map.json…>` compares a `{id: hash}` map from a live run with the lock.
