#!/usr/bin/env node
// Self-test of ./group-fit.mjs: a Box group hugs its layers again after one moved (Figma's Group), nothing moving on the
// canvas. Run: node tools/studio/group-fit.selftest.mjs
import { applyOps, sha1 } from "./jsx-source.mjs";
import { planGroups } from "./group-fit.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const components = new Set(["Box", "Shape"]);
const page = (group, a, b) => `// @zen-page {"format":1,"title":"G"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Box, Shape } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="G" device="phone">
        <Box width={300} height={200}>
          <Box ${group} group>
            <Shape type="rectangle" ${a} width={40} height={40} />
            <Shape type="ellipse" ${b} width={40} height={40} />
          </Box>
        </Box>
      </Screen>
    </Board>
  );
}
`;
const fits = page('position="absolute" insetLeft={20} insetTop={30} width={120} height={60}', 'position="absolute" insetLeft={0} insetTop={0}', 'position="absolute" insetLeft={80} insetTop={20}');
check("a group that hugs its layers: nothing to do", planGroups(fits, { components }), []);
// The Ellipse moved 30 px left past the group's edge (X -10) and 30 px down (Y 50, past the bottom).
const moved = page('position="absolute" insetLeft={20} insetTop={30} width={120} height={60}', 'position="absolute" insetLeft={0} insetTop={0}', 'position="absolute" insetLeft={-10} insetTop={50}');
const [plan] = planGroups(moved, { components });
check("the stale group, one op many on it and its layers", [plan?.loc, plan?.ops[0].action, plan?.ops[0].locs.length], ["12:10", "setProps", 3]);
const written = applyOps(moved, plan.loc, "Box", plan.ops, { file: "local:g.zen.tsx", hash: sha1(moved) });
check("fitted: the group at its layers' box, each layer from its new corner", [/<Box position="absolute" insetLeft=\{10\} insetTop=\{30\} width=\{50\} height=\{90\} group>/.test(written.code), /type="rectangle" position="absolute" insetLeft=\{10\} insetTop=\{0\}/.test(written.code), /type="ellipse" position="absolute" insetLeft=\{0\} insetTop=\{50\}/.test(written.code)], [true, true, true]);
check("fitted: nothing more to do", planGroups(written.code, { components }), []);
const tokens = page('position="absolute" insetLeft={20} insetTop={30} width={120} height={60}', 'position="absolute" insetLeft="md" insetTop={0}', 'position="absolute" insetLeft={200} insetTop={0}');
check("a layer at a token inset: left as it is", planGroups(tokens, { components }), []);
const turned = page('position="absolute" insetLeft={20} insetTop={30} width={120} height={60} rotation={30}', 'position="absolute" insetLeft={0} insetTop={0}', 'position="absolute" insetLeft={200} insetTop={0}');
check("a turned group: left as it is", planGroups(turned, { components }), []);

if (failures.length) {
  console.error(`✗ group-fit selftest: ${failures.length} failed, ${passed} passed\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`✓ group-fit selftest: ${passed} checks pass.`);
