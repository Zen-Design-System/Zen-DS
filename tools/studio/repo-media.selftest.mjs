#!/usr/bin/env node
// Self-test of tools/studio/repo-media.mjs (a picture from the computer saved in the repo): names, the WebP check and the
// CREDITS.md row. No server, no disk.
import assert from "node:assert/strict";
import { MEDIA_DIR, isWebp, mediaFileName, withCredits } from "./repo-media.mjs";

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}\n  ${error.message}`);
    process.exitCode = 1;
  }
};

const webp = (body) => new Uint8Array([...Buffer.from("RIFF"), 4, 0, 0, 0, ...Buffer.from("WEBP"), ...body]);

test("mediaFileName: the name as a slug, a hash of the bytes, .webp; the same bytes give the same name", () => {
  const bytes = webp([1, 2, 3]);
  const name = mediaFileName("Ảnh đội ngũ (final).PNG", bytes);
  assert.match(name, /^anh-doi-ngu-final-[0-9a-f]{8}\.webp$/);
  assert.equal(mediaFileName("Ảnh đội ngũ (final).PNG", webp([1, 2, 3])), name);
  assert.notEqual(mediaFileName("Ảnh đội ngũ (final).PNG", webp([1, 2, 4])), name);
  assert.match(mediaFileName("....png", bytes), /^photo-[0-9a-f]{8}\.webp$/);
  assert.equal(MEDIA_DIR, "src/assets/media");
});

test("isWebp: RIFF … WEBP only", () => {
  assert.equal(isWebp(webp([0])), true);
  assert.equal(isWebp(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0])), false);
  assert.equal(isWebp(new Uint8Array([])), false);
});

test("withCredits: one row per file, the original name kept readable, the table's pipes escaped", () => {
  const text = "# Platform sample media\n\n| File | Source | Author | License |\n|---|---|---|---|\n| a.webp | x | y | z |\n";
  const next = withCredits(text, "team-1a2b3c4d.webp", "Team | final.png", "2026-10-23");
  assert.match(next, /\n\| team-1a2b3c4d\.webp \| Dropped in Zen Studio from "Team final\.png" \(2026-10-23\) \| Zen Studio user \| To confirm before publishing \|\n$/);
  assert.equal(withCredits(next, "team-1a2b3c4d.webp", "Team | final.png", "2026-10-24"), next);
  assert.ok(next.startsWith(text.trimEnd()));
});

if (process.exitCode) console.log(`repo-media self-test: failures above (${passed} passed)`);
else console.log(`✓ repo-media self-test: ${passed} cases`);
