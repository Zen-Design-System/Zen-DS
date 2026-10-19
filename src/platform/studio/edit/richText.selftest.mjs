#!/usr/bin/env node
// Zen Studio rich text selftest (F6b): runs, toggling a style over a range, merging, the JSX a Text is written with.
//   node src/platform/studio/edit/richText.selftest.mjs   summary; exit 1 on any failure
import { isPlainText, mergeRuns, runsCode, textOf, toggleStyle } from "./richText.ts";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n      got      ${a}\n      expected ${e}`);
}

const plain = [{ text: "Your plan renews on Nov 2" }];
const bolded = toggleStyle(plain, 20, 25, "bold");
check("⌘B on a range makes a bold run", bolded, [{ text: "Your plan renews on " }, { bold: true, text: "Nov 2" }]);
check("⌘B again takes it off", toggleStyle(bolded, 20, 25, "bold"), plain);
check("⌘B over a range partly bold makes all of it bold", toggleStyle(bolded, 15, 25, "bold"), [{ text: "Your plan renew" }, { bold: true, text: "s on Nov 2" }]);
check("⌘I inside a bold run keeps the bold", toggleStyle(bolded, 20, 23, "italic"), [{ text: "Your plan renews on " }, { bold: true, italic: true, text: "Nov" }, { bold: true, text: " 2" }]);
check("an empty range changes nothing", toggleStyle(plain, 4, 4, "bold"), plain);
check("neighbours with one style merge", mergeRuns([{ text: "a", bold: true }, { text: "b", bold: true }, { text: "" }, { text: "c" }]), [{ bold: true, text: "ab" }, { text: "c" }]);
check("the words stay the same", textOf(toggleStyle(bolded, 3, 22, "underline")), "Your plan renews on Nov 2");
check("plain text", [isPlainText(plain), isPlainText(bolded)], [true, false]);
check("code: words and runs", runsCode([{ text: "Renews on " }, { bold: true, text: "Nov 2" }, { text: ". " }, { tone: "negative-base", text: "2 seats" }, { text: " are unpaid." }]),
  'Renews on <TextRun bold>Nov 2</TextRun>. <TextRun tone="negative-base">2 seats</TextRun> are unpaid.');
check("code: every style prop", runsCode([{ bold: true, italic: true, underline: true, strikethrough: true, textStyle: "Body/Small/Bold", text: "x" }]), '<TextRun bold italic underline strikethrough textStyle="Body/Small/Bold">x</TextRun>');
check("code: a line break is a string", runsCode([{ text: "First\nSecond" }]), '{"First\\nSecond"}');
check("code: braces and quotes are strings", runsCode([{ text: 'Say "hi" {now}' }]), '{"Say \\"hi\\" {now}"}');

if (failures.length) {
  console.error(`✗ rich text selftest: ${failures.length} of ${passed + failures.length} failed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ rich text selftest: ${passed} checks pass.`);
