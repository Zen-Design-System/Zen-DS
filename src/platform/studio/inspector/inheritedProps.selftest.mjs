#!/usr/bin/env node
// Props a component takes from another Zen component's props type (./inheritedProps.ts, imported directly: Node strips
// the types): what each inheriting component gains, and every ALIAS_EXTENDS clause still written so in the source.
// Run: node src/platform/studio/inspector/inheritedProps.selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALIAS_EXTENDS, inheritedProps, omitOf, splitTopLevel } from "./inheritedProps.ts";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));
const entries = new Map();
for (const list of Object.values(api)) for (const entry of list) if (!entries.has(entry.name)) entries.set(entry.name, entry);
const lookup = (name) => entries.get(name) ?? null;
const names = (component) => inheritedProps(entries.get(component), lookup).map((prop) => prop.name);

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}
const has = (list, wanted) => wanted.filter((name) => !list.includes(name));
const lacks = (list, unwanted) => unwanted.filter((name) => list.includes(name));

// Parsing
check("splitTopLevel keeps generics whole", splitTopLevel('Omit<A<B, C>, "x">, DProps'), ['Omit<A<B, C>, "x">', "DProps"]);
check("omitOf: base and keys", (({ base, omitted }) => [base, [...omitted]])(omitOf('Omit<AvatarProps, "children" | "alt">')), ["AvatarProps", ["children", "alt"]]);
check("omitOf: a plain type omits nothing", omitOf("ToggleButtonProps").omitted.size, 0);

// What each component gains
// NumberField and TextAreaField document the field props themselves since 2026-10-07 (build-api reads their Omit base).
check("NumberField and TextAreaField inherit nothing more (their API lists the field props)", [names("NumberField"), names("TextAreaField")], [[], []]);
check("AvatarStack gets each avatar's props, not alt / src / children", [has(names("AvatarStack"), ["background", "theme", "status", "focus"]), lacks(names("AvatarStack"), ["alt", "src", "children", "size"])], [[], []]);
check("BadgeCounter gets theme and background, not leading or the leadingIcon it sets itself", [has(names("BadgeCounter"), ["theme", "background"]), lacks(names("BadgeCounter"), ["leading", "leadingIcon", "remove"])], [[], []]);
check("a component without a Zen parent gains nothing", [names("InputField"), names("Button")], [[], []]);

// ALIAS_EXTENDS is what the source writes: `export type <Name>Props = <clause> & …`.
const sources = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (/\.tsx?$/.test(entry.name) && !/\.(stories|test)\.tsx?$/.test(entry.name)) sources.push(target);
  }
};
walk(path.join(root, "src/components"));
for (const [component, clause] of Object.entries(ALIAS_EXTENDS)) {
  const declaration = sources.map((file) => fs.readFileSync(file, "utf8")).map((text) => new RegExp(`export type ${component}Props\\s*=([^{]*)\\{`).exec(text)?.[1] ?? null).find(Boolean);
  check(`${component}: ALIAS_EXTENDS matches the source`, Boolean(declaration && declaration.includes(clause)), true);
}

if (failures.length) {
  console.error(`inheritedProps selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ inherited props selftest: ${passed} checks pass.`);
