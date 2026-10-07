#!/usr/bin/env node
// The zip writer (zip.mjs, Studio builder GĐ5): CRC-32, a round trip, and the files `unzip -t` and Python's zipfile read
// (independent readers). Run: node tools/studio/zip.selftest.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32, unzipFiles, zipFiles } from "./zip.mjs";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

check("crc32 of the check string", crc32(new TextEncoder().encode("123456789")).toString(16), "cbf43926");
check("crc32 of nothing", crc32(new Uint8Array()), 0);

const photo = new Uint8Array(70_000).map((_, index) => (index * 31) & 0xff);
const files = [
  { path: "index.html", data: "<!doctype html>\n<title>Đặt hàng</title>\n" },
  { path: "screens/people.html", data: "<p>People · Người</p>\n" },
  { path: "assets/site-cafe.webp", data: photo },
  { path: "styles.css", data: "" },
];
const bytes = zipFiles(files, { date: new Date(2026, 9, 7, 13, 45, 30) });
const back = unzipFiles(bytes);
check("round trip: paths", back.map((file) => file.path), files.map((file) => file.path));
check("round trip: text", new TextDecoder().decode(back[0].data), files[0].data);
check("round trip: bytes", Buffer.from(back[2].data).equals(Buffer.from(photo)), true);
check("a repeated path keeps the last", unzipFiles(zipFiles([{ path: "a.txt", data: "1" }, { path: "a.txt", data: "2" }])).map((file) => new TextDecoder().decode(file.data)), ["2"]);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zen-zip-"));
const file = path.join(dir, "export.zip");
fs.writeFileSync(file, bytes);
const unzip = spawnSync("unzip", ["-t", file], { encoding: "utf8" });
if (unzip.error) console.log("  (unzip not installed: skipped)");
else check("unzip -t reads it", [unzip.status, /No errors detected/.test(unzip.stdout)], [0, true]);
const python = spawnSync("python3", ["-c", "import sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\nprint('|'.join(i.filename + ':' + str(i.file_size) + ':' + '%d-%02d-%02d %02d:%02d' % i.date_time[:5] for i in z.infolist()))", file], { encoding: "utf8" });
if (python.error) console.log("  (python3 not installed: skipped)");
else check("Python zipfile reads it (names, sizes, dates)", python.stdout.trim(), `index.html:${new TextEncoder().encode(files[0].data).length}:2026-10-07 13:45|screens/people.html:${new TextEncoder().encode(files[1].data).length}:2026-10-07 13:45|assets/site-cafe.webp:70000:2026-10-07 13:45|styles.css:0:2026-10-07 13:45`);
fs.rmSync(dir, { recursive: true, force: true });

if (failures.length) {
  console.error(`✗ zip selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ zip selftest: ${passed} checks pass.`);
