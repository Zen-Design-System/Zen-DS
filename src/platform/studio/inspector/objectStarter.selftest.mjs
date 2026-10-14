#!/usr/bin/env node
// objectStarter.ts (imported directly: Node strips the types): the object a "+" writes for an unset object prop, read
// from the real API types. Run: node src/platform/studio/inspector/objectStarter.selftest.mjs
import fs from "node:fs";
import { namedTypeBody, objectStarter, objectTypeFields } from "./objectStarter.ts";

const failures = [];
let passed = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const api = JSON.parse(fs.readFileSync(new URL("../../api.generated.json", import.meta.url), "utf8"));
const typeOf = (component, prop) => Object.values(api).flat().find((item) => item?.name === component)?.props.find((item) => item.name === prop)?.type;

const secondary = typeOf("EmptyState", "secondaryAction");
check("EmptyState secondaryAction: a named type in the API", secondary, "EmptyStateAction");
const types = JSON.parse(fs.readFileSync(new URL("../../../../docs/api/empty-state.json", import.meta.url), "utf8")).types;
check("EmptyState secondaryAction: the label in the prop's words", objectStarter("secondaryAction", namedTypeBody(secondary, types) ?? ""), '{ label: "Secondary action" }');
check("an interface that extends another: no body", namedTypeBody("X", { X: "interface X extends Y { a: string }" }), null);
check("a type alias of an object", namedTypeBody("Y", { Y: "type Y = { a: string; b?: number }" }), "{ a: string; b?: number }");
const literalType = Object.values(api).flat().flatMap((item) => item?.props ?? []).find((prop) => /^\{ label: ReactNode; onClick\?: \(\) => void;/.test(prop.type))?.type;
check("a literal action type in the API (comments with ; and <form> inside)", objectStarter("secondaryAction", literalType ?? ""), '{ label: "Secondary action" }');
check("fields: comments and nested types kept whole", objectTypeFields("{ a: string; /** note; with a semicolon */ b?: () => void; c: { d: number } }")?.map((field) => [field.name, field.optional]), [["a", false], ["b", true], ["c", false]]);
check("a required handler: no starter", objectStarter("action", "{ label: string; onClick: () => void }"), null);
check("a named type: no starter", objectStarter("action", "ActionDef"), null);
check("numbers, booleans and a string literal", objectStarter("range", '{ min: number; open: boolean; kind: "a" | "b" }'), '{ min: 0, open: false, kind: "a" }');
check("only optional fields: an empty object", objectStarter("options", "{ dense?: boolean }"), "{}");

if (failures.length) {
  console.error(`✗ objectStarter selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ objectStarter selftest: ${passed} checks pass.`);
