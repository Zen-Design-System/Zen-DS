#!/usr/bin/env node
// Self-test of the phone AppShell round trip (figma-push.mjs mobileShellNode → figma-pull.mjs mobileShellElement): a
// phone Screen's AppShell goes to Figma as Pattern/AppShell/Mobile and comes back as the same AppShell — its mobileTop,
// band and canvas, its TopNavigation (the bar's type left unsaid where AppShell gives it), its tabs or ActionBar, its
// hero or backdrop, its page. Run: node tools/studio/figma-mobile-shell.selftest.mjs
import fs from "node:fs";
import { validateDialect } from "./dialect.mjs";
import { figmaFromPage } from "./figma-push.mjs";
import { pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const mapping = await repoMapping();
const page = (shell) => `// @zen-page {"format":1,"title":"Shell bars"}
import { Board, Screen } from "@zen-ds/react/builder";
import { ActionBar, AppShell, BottomNavigation, Icon, Text, TopNavigation } from "@zen-ds/react";

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Shell bars" device="phone">
        ${shell}
      </Screen>
    </Board>
  );
}
`;
/** The page through Figma and back: the AppShell's opening tag (its props, in the order the pull prints them) and the page. */
const roundTrip = (shell) => {
  const { frame } = figmaFromPage(page(shell), { mapping, nestedLayers: NESTED_LAYERS });
  const back = pageFromFigma(frame, { mapping });
  return { text: back.text, notes: back.notes, shell: back.text.match(/<AppShell\b[^]*?>(?=\s*<Text)/)?.[0]?.replace(/\s+/g, " ") ?? null, body: back.text.match(/<Text>([^<]*)<\/Text>/)?.[1] ?? null };
};
const tabs = '<BottomNavigation items={[{ id: "home", label: "Home", icon: "icon-home-02-line" }, { id: "me", label: "Me", icon: "icon-user-circle-line", dot: true }]} value="home" showLabels />';

{
  const back = roundTrip(`<AppShell topNavigation={<TopNavigation title="Inbox" />} bottomNavigation={${tabs}}><Text>Body</Text></AppShell>`);
  check("Bar · Tab-Bar: the AppShell comes back with its TopNavigation (the canvas's Alt bar unsaid) and its tabs", back.shell, `<AppShell topNavigation={<TopNavigation title="Inbox" />} bottomNavigation={${tabs}}>`);
  check("Bar · Tab-Bar: the page in the AppShell", back.body, "Body");
  check("Bar · Tab-Bar: no AppShell Stack, no note about the pattern", [/name="AppShell"/.test(back.text), back.notes.filter((note) => /AppShell|Pattern/.test(note))], [false, []]);
  check("the pulled page passes the dialect check", validateDialect(back.text, { components: new Set(["ActionBar", "AppShell", "BottomNavigation", "Icon", "Text", "TopNavigation"]) }), []);
}
{
  const alt = roundTrip(`<AppShell canvas="alt" topNavigation={<TopNavigation title="Inbox" />}><Text>Body</Text></AppShell>`);
  check("canvas alt: canvas comes back, the Default bar unsaid", alt.shell, '<AppShell canvas="alt" topNavigation={<TopNavigation title="Inbox" />}>');
  const flat = roundTrip(`<AppShell canvas="flat" topNavigation={<TopNavigation title="Inbox" />}><Text>Body</Text></AppShell>`);
  check("canvas flat: canvas comes back, the repainted Default bar unsaid", flat.shell, '<AppShell canvas="flat" topNavigation={<TopNavigation title="Inbox" />}>');
  const own = roundTrip(`<AppShell topNavigation={<TopNavigation title="Inbox" type="compact" />}><Text>Body</Text></AppShell>`);
  check("a TopNavigation's own type comes back", own.shell, '<AppShell topNavigation={<TopNavigation type="compact" title="Inbox" />}>');
}
{
  const band = roundTrip(`<AppShell mobileTop="band" band="accent" topNavigation={<TopNavigation title="Wallet" />} hero={<Text>Hero</Text>}><Text>Body</Text></AppShell>`);
  check("band accent with a hero: mobileTop, band, the Transparent-On-Color bar unsaid, the hero", band.shell, '<AppShell mobileTop="band" band="accent" topNavigation={<TopNavigation title="Wallet" />} hero={<Text>Hero</Text>}>');
  const plain = roundTrip(`<AppShell mobileTop="band" topNavigation={<TopNavigation title="Wallet" />}><Text>Body</Text></AppShell>`);
  check("band without a hero: no hero comes back (the slot was hidden)", plain.shell, '<AppShell mobileTop="band" topNavigation={<TopNavigation title="Wallet" />}>');
  const sheet = roundTrip(`<AppShell mobileTop="band-sheet" band="soft" topNavigation={<TopNavigation title="Trip" />}><Text>Body</Text></AppShell>`);
  check("band-sheet soft: the page from Stage › Sheet", [sheet.shell, sheet.body], ['<AppShell mobileTop="band-sheet" band="soft" topNavigation={<TopNavigation title="Trip" />}>', "Body"]);
  const media = roundTrip(`<AppShell mobileTop="media" topNavigation={<TopNavigation title="Song" />} backdrop={<Text>Photo</Text>}><Text>Body</Text></AppShell>`);
  check("media: the Liquid-Overlay bar unsaid, the backdrop", media.shell, '<AppShell mobileTop="media" topNavigation={<TopNavigation title="Song" />} backdrop={<Text>Photo</Text>}>');
}
{
  const bar = '<ActionBar direction="horizontal" primaryAction={{ label: "Book", startIcon: <Icon name="icon-calendar-line" decorative /> }} secondaryAction={{ label: "Later" }} />';
  const back = roundTrip(`<AppShell topNavigation={<TopNavigation title="Room" />} actionBar={${bar}}><Text>Body</Text></AppShell>`);
  check("Actions: the horizontal ActionBar with its two actions and the primary's icon", back.shell, `<AppShell topNavigation={<TopNavigation title="Room" />} actionBar={${bar}}>`);
  const stacked = '<ActionBar surface="glass" primaryAction={{ label: "Pay" }} secondaryAction={{ label: "Cancel", level: "secondary" }} />';
  check("Actions: a vertical glass ActionBar, the secondary's level", roundTrip(`<AppShell actionBar={${stacked}}><Text>Body</Text></AppShell>`).shell, `<AppShell actionBar={${stacked}}>`);
}

{
  // The live read of a placed Pattern/AppShell/Mobile (figmaReadCode readMobileShell, 2026-10-23): Figma's own sample.
  const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/figma-mobile-shell-read.json", import.meta.url), "utf8"));
  const back = pageFromFigma(fixture.frame, { mapping });
  const shell = back.text.match(/<AppShell\b[^]*?>(?=\s*<EmptyState)/)?.[0] ?? "";
  check("live read: an AppShell holding the page (Empty-State), no Stack, no note", [/<AppShell /.test(back.text), /<EmptyState>Empty State Title<\/EmptyState>/.test(back.text), /name="AppShell"/.test(back.text), back.notes], [true, true, false, []]);
  check("live read: the Bar's TopNavigation (Alt on Canvas/Default unsaid) with Figma's sample title", /topNavigation=\{<TopNavigation title="Heading" largeTitle="Heading"/.test(shell) && !/type=/.test(shell.match(/<TopNavigation[^>]*>/)?.[0] ?? ""), true);
  check("live read: four tabs labelled by their Label-Text, the first selected", [(shell.match(/label: "Label"/g) ?? []).length, /value="label"/.test(shell)], [4, true]);
}

if (failures.length) {
  console.error(`✗ figma mobile shell selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma mobile shell selftest: ${passed} checks pass.`);
