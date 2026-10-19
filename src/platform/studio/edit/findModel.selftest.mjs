#!/usr/bin/env node
// Find and replace selftest (F10, findModel.ts): matches ignore case, replacements are literal, hits in page order.
//   node src/platform/studio/edit/findModel.selftest.mjs   summary; exit 1 on any failure
import assert from "node:assert/strict";
import { countMatches, findTexts, replaceMatches } from "./findModel.ts";
import { parsePage } from "../../../../tools/studio/dialect.mjs";

let count = 0;
const test = (name, run) => { run(); count += 1; };
const page = `// @zen-page {"format":1,"title":"Find"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, Stack, Text, TextRun } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Find" device="desktop">
        <Stack>
          <Text>Invoice due</Text>
          <Text>Two invoices: <TextRun bold>invoice 12</TextRun></Text>
          <Button>Pay</Button>
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const { board } = parsePage(page);

test("matches ignore case", () => assert.equal(countMatches("Invoice, invoice, INVOICE", "invoice"), 3));
test("a replacement is literal", () => assert.equal(replaceMatches("a.b a.b", ".", "$&!"), "a$&!b a$&!b"));
test("an empty query finds nothing", () => assert.deepEqual(findTexts(board, "  "), []));
test("hits in page order: a Text and the TextRun holding the words", () => {
  const hits = findTexts(board, "invoice");
  assert.deepEqual(hits.map((hit) => [hit.name, hit.text, hit.count]), [["Text", "Invoice due", 1], ["Text", "Two invoices: ", 1], ["TextRun", "invoice 12", 1]]);
  assert.ok(hits.every((hit) => /^\d+:\d+$/.test(hit.loc)));
});

console.log(`findModel selftest: ${count} passed`);
