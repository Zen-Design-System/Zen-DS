# Studio Variables: new collections — spec card (chunk 5 of Variables v2)

Session B, 2026-10-23. Tier M. BACKLOG P3 "Studio Variables: new collections". The user approved it through the progress
session: "Cho B làm 'tạo collection mới' trong Studio Variables theo đề xuất: chỉ một mode (:root)". The base is
`docs/research/studio-variables-v2-spec-2026-10-23.md` § Status.

## What Figma does

- **Create collection:** Figma UI3's Variables window has it in the collections list. The new collection has one mode,
  named "Mode 1", and is named in place.
- **Modes:** a collection with more modes is a paid-plan feature. Here more modes stay out: a Zen collection with modes
  is a ZenProvider axis, which is public API.

## Behaviour

- **Create:**
  - The Collections menu ends with **Create collection**. It swaps the collection button for a name field; Enter
    creates the collection and Esc cancels.
  - The name must not be empty, and must not be taken by another collection or by another collection's file slug.
  - The collection is `tokens/source/figma/<slug>.json`, where the slug is the name in kebab case:
    `{ "<Name>": { "modes": ["Mode 1"], "tokens": [] } }`.
  - It is a **draft of a file that does not exist yet**. ⌘Z removes the draft (no file), and Save writes the file.
    Its variables (Create variable) are drafts of it as well.
- **Modes:** a created collection keeps its one mode. Add / rename / delete mode stays with the ZenProvider axes
  (MODE_COLLECTIONS).
- **No rename or delete of a collection in this chunk.**
  - Before Save, undo removes the collection. After Save, deleting the file is a code change.
  - These two go to BACKLOG with the docs line below.

## Build

- `scripts/token-outputs.mjs` reads the collections it is given.
  - The 11 Figma exports come first, in their fixed order, under their slugs. Every other `*.json` in
    `tokens/source/figma` follows alphabetically, under its file name.
  - `SOURCE_FILES` stays the list of the 11; `sourceFiles(names)` orders a directory listing.
- A created collection's block is `:root`. A collection outside the 11 with more than one mode stops the build:
  "one mode only (:root)".
- **build-tokens** passes the directory listing. The dev server's draft CSS passes the disk listing plus created drafts.
- **check-token-coverage:**
  - The 11 must be there; any other collection must have one mode.
  - It prints `Collections: 11 + N created`, where it used to require exactly 11.
- **Native packages:** the generator works from the catalog, so a new slug gets its own `ZenCollection` key. This is
  checked with a scratch catalog.

## Studio dev server

- **variables-host:**
  - Token files are listed from the folder, plus created drafts.
  - `isTokenSource` is the path pattern (any `<slug>.json` there).
  - A created file's base for Figma is "no file". `pending()` then packs `createCollection`, then its variables.
- **vite-plugin-zen-studio:**
  - `/variable-edit` with `{ op: "createCollection", name }` on a missing token source starts a draft from an empty
    base marked `created`.
  - `resolveFile` lets a missing token source through when such a draft exists.
  - Save writes the new file (it is a conflict if a file of that name appeared meanwhile), and discard drops the draft.
- **drafts.mjs:** the `created` flag is kept in `nextDraft`, `planSave`, `followDisk` and in serialize / parse.

## Figma

- **Package:** `{ op: "createCollection", collection, modes: ["Mode 1"] }` comes before the creates.
- **Plugin `applyVariables`:** if the collection is missing, it calls `figma.variables.createVariableCollection(name)`
  and renames the default mode to the package's mode name. It is checked live on a throwaway collection in the Zen file.

## Rename, delete and the docs group (user, 2026-10-23 evening, through the progress session)

The user's answers to the two questions below:

1. "Rename and delete a collection, as in Figma: yes. Deleting a collection whose variables are in use asks first."
2. "A new collection shows on the docs Design Tokens page: yes. When a collection is created, Studio asks which group it
   belongs to (layer / purpose) and writes the manifest entry, so the page lists it."

**Create** is now a form: Name, Group (Primitive · Semantic · Component · Layout, the docs' layers) and Purpose
(optional). The collection file keeps `layer` and `purpose` beside its modes.

**Manifest:**
- `tokens:build` writes the made collections' entries into `tokens/source/figma.collections.json`, with
  `madeIn: "Zen Studio"`.
  - Each entry takes its counts from the collection; entries come by slug, after the 11 Figma ones.
  - With no made collections, the file is byte-identical: the manifest's own style is kept, plain arrays and objects on
    one line up to 160 columns.
- `tokens:check` fails when the manifest is stale.
- The Design Tokens page and the QA page list read the manifest, so a made collection appears in both.

**Rename collection** (⋯ › Rename collection, named in place):
- Only a collection made here can be renamed; its file keeps its name.
- The 11 Figma exports have the item off, because code reads them by name.
- The Figma package carries `renameCollection` first.

**Delete collection** (⋯ › Delete collection):
- Only a collection made here can be deleted.
- An alias from another collection refuses the delete: the build would lose the alias's target.
- Code that reads its variables asks first (a `confirm` answer, then a Dialog), and the delete is sent again with `force`.
- Before Save, the draft is `""` with `deleted: true`. Save removes the file, and ⌘Z writes the text back.
- The Figma package carries `deleteCollection` last.

**Plugin** (235d6e8 on `studio-import`): `renameCollection` sets the collection's name, and `deleteCollection` removes
the collection. Both were checked live on a throwaway collection in the Zen file, which was removed.

**E2E:** VA-08 now goes through the form. VA-09 covers rename → delete → ⌘Z three times, with the actions off on a
Figma export.

## Not in this chunk (BACKLOG)

- (Both items below were answered and built the same day; see the section above.)
- Rename and delete a collection.
- Docs: the Design Tokens pages list `tokens/source/figma.collections.json`, a hand-kept manifest (layer, purpose). A
  created collection is not listed there until someone gives it a layer and a purpose. That is a question for the user.

## Checks

- **Selftests:**
  - `variables.selftest`: the op, the name rules, the package;
  - drafts: a created draft through save / undo / restore;
  - tokens:build + tokens:check with a scratch collection, then removed;
  - native generator with a scratch catalog.
- **Plugin `npm test`** (createCollection), plus a live run in the Zen file.
- **E2E VA-08:**
  - Create collection "E2E Collection" → it is listed with 1 mode;
  - Create variable in it;
  - ⌘Z twice → the variable, then the collection, are gone, and no file is left on disk.
- **Scoped gate.**
