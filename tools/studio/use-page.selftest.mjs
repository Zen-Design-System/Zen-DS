// Selftest for use-page.mjs (Libraries' project components): `node tools/studio/use-page.selftest.mjs`.
import assert from "node:assert/strict";
import { withUsePage } from "./use-page.mjs";

let passed = 0;
const ok = (fn, name) => { try { fn(); passed++; } catch (error) { console.error(`✗ ${name}\n${error.message}`); process.exit(1); } };

ok(() => assert.equal(withUsePage('<Stack><Use of="tag" /></Stack>', "pricing"), '<Stack><Use page="pricing" of="tag" /></Stack>'), "a nested instance names the page");
ok(() => assert.equal(withUsePage('<Use of="a" page="home" />', "pricing"), '<Use of="a" page="home" />'), "one that names a page keeps it");
ok(() => assert.equal(withUsePage('<Card slots={{ Body: <Use of="x" /> }}><Use of="y" /></Card>', "p"), '<Card slots={{ Body: <Use page="p" of="x" /> }}><Use page="p" of="y" /></Card>'), "inside props and children");
ok(() => assert.equal(withUsePage('<Stack>\n  <Text>Use of</Text>\n</Stack>', "p"), '<Stack>\n  <Text>Use of</Text>\n</Stack>'), "words are not instances");
ok(() => assert.equal(withUsePage('<Button>Go</Button>', "p"), '<Button>Go</Button>'), "nothing to name");
ok(() => assert.equal(withUsePage('<Stack><Use of="hero" page="a" /><Use of="x" /></Stack>', "b", { own: "a" }), '<Stack><Use of="hero" /><Use page="b" of="x" /></Stack>'), "a link to the page it lands on goes");
console.log(`✓ use-page selftest: ${passed} checks pass.`);
