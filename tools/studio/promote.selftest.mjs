#!/usr/bin/env node
// Promote (promote.mjs, Studio builder GĐ5 M5): the template a page becomes (its name, its code, the photos it brings),
// written into a scratch folder of the repo, a second promotion (unchanged, changed: a conflict unless replacing), and
// TypeScript on the result. Run: node tools/studio/promote.selftest.mjs   (--no-tsc skips TypeScript, ~20 s)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planPromotion, typecheck, writePromotion } from "./promote.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  // ✗ on each line: the gate lists only such lines of a failing self-test.
  else failures.push(`✗ ${label}\n  ✗ expected ${e}\n  ✗ actual   ${a}`);
}
const ok = (label, value) => check(label, Boolean(value), true);

const page = (title, image) => `// @zen-page {"format":1,"title":${JSON.stringify(title)}}
import { Board, Screen } from "@zen/design-system/builder";
import { Image, Stack, Text } from "@zen/design-system";

export default function Page() {
  return (
    <Board>
      <Screen id="home" title="Home" device="phone">
        <Stack gap="md" padding="lg">
          <Text textStyle="Body/Base/Regular">Welcome</Text>
          ${image}
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const dir = "node_modules/.cache/zen-studio/promote-selftest/src/templates/studio";
fs.rmSync(path.join(root, "node_modules/.cache/zen-studio/promote-selftest"), { recursive: true, force: true });

const text = page("Café home", '<Image src="zen-media:site-cafe" alt="Café" />\n          <Image src="zen-asset:team-1a2b3c4d.png" alt="Team" />');
const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const missingUpload = planPromotion(text, { file: "cafe-home.zen.tsx", dir });
check("plan: an upload the request lacks is missing", missingUpload.missing, ["team-1a2b3c4d.png"]);
const plan = planPromotion(text, { file: "cafe-home.zen.tsx", dir, uploads: { "team-1a2b3c4d.png": png } });
check("plan: the template's name and file", [plan.component, plan.file], ["CafeHomeTemplate", `${dir}/CafeHomeTemplate.tsx`]);
ok("plan: the component and its header", plan.code.startsWith("// Promoted by Zen Studio from cafe-home.zen.tsx. Edit the design, then promote again (it replaces this file).") && plan.code.includes("export function CafeHomeTemplate("));
check("plan: the photos it brings", plan.assets.map((asset) => [asset.path, asset.source ?? `${asset.data.length} bytes`]), [[`${dir}/assets/site-cafe.webp`, "src/assets/media/site-cafe.webp"], [`${dir}/assets/team-1a2b3c4d.png`, `${png.length} bytes`]]);
check("plan: a page that does not compile", planPromotion("export default 1;\n", { dir }).error !== undefined, true);

const first = await writePromotion(root, plan);
check("write: the template and both photos", first.written, [`${dir}/assets/site-cafe.webp`, `${dir}/assets/team-1a2b3c4d.png`, `${dir}/CafeHomeTemplate.tsx`]);
ok("write: the library photo copied byte for byte", fs.readFileSync(path.join(root, dir, "assets/site-cafe.webp")).equals(fs.readFileSync(path.join(root, "src/assets/media/site-cafe.webp"))));
check("write again, unchanged: nothing written", (await writePromotion(root, plan)).written, []);
const changed = planPromotion(page("Café home", '<Image src="zen-media:site-cafe" alt="Café table" />'), { file: "cafe-home.zen.tsx", dir });
check("write a changed page: a conflict", await writePromotion(root, changed), { conflict: `${dir}/CafeHomeTemplate.tsx` });
check("write a changed page, replacing: the template only", (await writePromotion(root, changed, { overwrite: true })).written, [`${dir}/CafeHomeTemplate.tsx`]);

if (!process.argv.includes("--no-tsc")) {
  const result = await typecheck(root, [`${dir}/CafeHomeTemplate.tsx`], { cacheDir: "node_modules/.cache/zen-studio/promote-selftest/check" });
  check("tsc: the template type-checks", result, { ok: true, errors: [] });
  fs.writeFileSync(path.join(root, dir, "Broken.tsx"), 'export const broken: number = "text";\n');
  const broken = await typecheck(root, [`${dir}/Broken.tsx`], { cacheDir: "node_modules/.cache/zen-studio/promote-selftest/check" });
  ok("tsc: an error in the file is reported", !broken.ok && broken.errors.length === 1 && broken.errors[0].startsWith(`${dir}/Broken.tsx(1,14): error TS2322`));
}
fs.rmSync(path.join(root, "node_modules/.cache/zen-studio/promote-selftest"), { recursive: true, force: true });

if (failures.length) {
  console.error(`✗ promote selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ promote selftest: ${passed} checks pass.`);
