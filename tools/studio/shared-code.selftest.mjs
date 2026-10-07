#!/usr/bin/env node
// Self-test of tools/studio/shared-code.mjs. Run: node tools/studio/shared-code.selftest.mjs
import { importersOf, isPlaygroundFile } from "./shared-code.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const files = [
  ["src/platform/examples/pages/button.tsx", 'import { DemoActions } from "../../PlatformDemoActions";\nimport { x } from "../data";'],
  ["src/platform/examples/pages/card.tsx", "import { DemoActions, other } from '../../PlatformDemoActions.tsx';"],
  ["src/platform/PlatformExamples.tsx", 'export { DemoActions } from "./PlatformDemoActions";'],
  ["src/templates/hr/Home.tsx", 'const lazy = import("../../platform/PlatformDemoActions");'],
  ["src/platform/examples/pages/menu.tsx", 'import { DemoActionsX } from "../../PlatformDemoActionsX";\nimport { Button } from "../../../components/Button";'],
  ["src/platform/PlatformDemoActions.tsx", 'import "./PlatformDemoActions.css";'],
];
check("importers", importersOf("src/platform/PlatformDemoActions.tsx", files), ["src/platform/PlatformExamples.tsx", "src/platform/examples/pages/button.tsx", "src/platform/examples/pages/card.tsx", "src/templates/hr/Home.tsx"]);
check("folder index", importersOf("src/components/Button/index.ts", files), ["src/platform/examples/pages/menu.tsx"]);
check("nothing imports it", importersOf("src/platform/chatDemo.tsx", files), []);
check("playground files", ["src/platform/PlatformExamples.tsx", "src/platform/PlatformMobilePlaygrounds.tsx", "src/platform/chatDemo.tsx"].map(isPlaygroundFile), [true, true, false]);

if (failures.length) {
  console.error(`shared-code selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ shared-code selftest: ${passed} checks pass.`);
