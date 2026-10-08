// Collect ZCAP|file|i|n|hash|data chunks from this session's transcripts, rebuild each contract and write it.
const fs = require("fs"), path = require("path"), { createRequire } = require("module");
const root = path.resolve(__dirname, "../../..");
const LZ = createRequire(path.join(root, "package.json"))("lz-string");
const proj = process.env.ZEN_TRANSCRIPTS ?? "/root/.claude/projects/-home-user-Zen-DS";
const session = process.env.ZEN_SESSION; // the transcript id of the session that made the calls
const files = [path.join(proj, `${session}.jsonl`)];
const sub = path.join(proj, session, "subagents");
if (fs.existsSync(sub)) for (const f of fs.readdirSync(sub)) if (f.endsWith(".jsonl")) files.push(path.join(sub, f));
const chunks = {}; // file -> hash -> { n, parts: {} }
const re = /ZCAP\|([\w.-]+)\|(\d+)\|(\d+)\|([0-9a-f]{8})\|([A-Za-z0-9+/=]+)/g;
for (const f of files) {
  const text = fs.readFileSync(f, "utf8").replace(/\\n/g, "\n");
  for (const m of text.matchAll(re)) {
    const [, file, i, n, h, data] = m;
    const byHash = ((chunks[file] ??= {})[h] ??= { n: +n, parts: {} });
    if (!byHash.parts[i] || data.length > byHash.parts[i].length) byHash.parts[i] = data;
  }
}
const unpack = (s) => { const { t, b } = JSON.parse(s); const dec = (x) => { if (!x || typeof x !== "object") return x; if (!Array.isArray(x) && Object.keys(x).length === 1 && "§" in x) return dec(t[x["§"]]); return Array.isArray(x) ? x.map(dec) : Object.fromEntries(Object.entries(x).map(([k, v]) => [k, dec(v)])); }; return dec(b); };
const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
const result = {};
for (const [file, hashes] of Object.entries(chunks)) {
  for (const [h, { n, parts }] of Object.entries(hashes)) {
    const have = Object.keys(parts).length;
    if (have < n) { console.log(`${file} ${h}: ${have}/${n} chunks`); continue; }
    const z = Array.from({ length: n }, (_, i) => parts[i]).join("");
    if (fnv(z) !== h) { console.log(`${file} ${h}: hash mismatch after join`); continue; }
    result[file] = unpack(LZ.decompressFromBase64(z));
    console.log(`${file} ${h}: complete, ${result[file].length} sets`);
  }
}
fs.writeFileSync(process.argv[2] ?? path.join(__dirname, "captured.json"), JSON.stringify(result));
