#!/usr/bin/env node
// Self-test of the builder page dialect (tools/studio/dialect.mjs). Run: node tools/studio/dialect.selftest.mjs
import { boardFrames, boardSections, componentSets, jsxText, localComponents, newPageText, pageHeader, parsePage, resolveInstance, sectionCode, sliceCode, validateDialect } from "./dialect.mjs";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const components = new Set(["Button", "Dialog", "List", "ListItem", "Stack", "Text", "Icon", "Sidebar", "SidebarMenuItem", "PageHeader", "TopNavigation", "BottomNavigation"]);
const messages = (text) => validateDialect(text, { components }).map((error) => `${error.line}: ${error.message}`);

const blank = newPageText({ title: "Checkout", device: "phone" });
check("a new page is a valid page", messages(blank), []);
check("its header", pageHeader(blank), { format: 1, title: "Checkout" });

const page = `// @zen-page {"format":1,"title":"Checkout"}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, Dialog, List, ListItem, Stack, Text } from "@zen-ds/react";

export const mock = {
  items: [
    { name: "Linen shirt", price: "$48" },
    { name: "Canvas tote", price: "$22" },
  ],
};

export default function Page() {
  return (
    <Board>
      <Screen id="cart" title="Cart" device="phone">
        <Stack gap="md" padding="lg">
          <Text textStyle="Heading/3">
            Cart
            total
          </Text>
          <List>
            {mock.items.map((item) => <ListItem key={item.name} title={item.name} trailing={item.price} />)}
          </List>
          <Button level="primary" onClick={proto.open("confirm")}>Pay</Button>
        </Stack>
      </Screen>
      <Screen id="cart" state="empty" title="Cart · empty" device="phone"><Text>Nothing here</Text></Screen>
      <Overlay id="confirm">
        <Dialog title="Pay $70?" primaryAction={{ label: "Pay", onClick: proto.navigate("done") }} />
      </Overlay>
    </Board>
  );
}
`;
check("the spec's example is valid", messages(page), []);
const tree = parsePage(page, { components });
check("mock read as data", tree.mock.items[1], { name: "Canvas tote", price: "$22" });
const cart = tree.board.children[0];
check("screen loc and props", [cart.name, cart.loc, cart.props.id, cart.props.device.value], ["Screen", "15:6", { kind: "literal", value: "cart" }, "phone"]);
const stack = cart.children[0];
check("JSX text cleaned as Babel does", stack.children[0].children, [{ kind: "text", value: "Cart total" }]);
const list = stack.children[1].children[0];
check("a .map child", [list.kind, list.source, list.item, list.node.name, list.node.props.title], ["map", { root: "mock", path: ["items"] }, "item", "ListItem", { kind: "ref", root: "item", path: ["name"] }]);
check("a proto handler", stack.children[2].props.onClick, { kind: "proto", action: "open", args: ["confirm"] });
check("an object prop with a handler inside", tree.board.children[2].children[0].props.primaryAction.fields.onClick, { kind: "proto", action: "navigate", args: ["done"] });

const broken = (body, extraImport = "") => `// @zen-page {"format":1,"title":"x"}
import { Board, Screen } from "@zen-ds/react/builder";
import { Button, Stack, Text } from "@zen-ds/react";${extraImport}

export default function Page() {
  return (
    <Board>
      <Screen id="s">
        ${body}
      </Screen>
    </Board>
  );
}
`;
const first = (text) => messages(text)[0] ?? null;
check("HTML element", first(broken("<div>hi</div>")), "9: <div> is an HTML element: use a Zen component (Text, Stack, Box…)");
check("spread", first(broken("<Button {...props}>Go</Button>")), "9: Spread props ({...rest}) cannot be edited: write each prop");
check("className", /className is not part/.test(first(broken('<Text className="x">a</Text>'))), true);
check("a condition", /A child is text/.test(first(broken("{open ? <Text>a</Text> : null}"))), true);
check("a filtered list", /Lists come from the mock data/.test(first(broken("{mock.items.filter(Boolean).map((item) => <Text>{item}</Text>)}"))), true);
check("an inline handler", /proto/.test(first(broken("<Button onClick={() => alert(1)}>Go</Button>"))), true);
check("a foreign import", /Imports come from/.test(first(broken("<Text>a</Text>", '\nimport { useState } from "react";'))), true);
check("not a Zen component", /is not a Zen component/.test(first(broken("<Text>a</Text>", '\nimport { Fancy } from "@zen-ds/react";'))), true);
check("a hook in the page", /only returns its <Board>/.test(messages(page.replace("  return (\n    <Board>", "  const [a] = useState(0);\n  return (\n    <Board>")).join("|")), true);
check("no header", /page header/.test(messages(page.replace(/^.*\n/, "")).join("|")), true);
check("screen id", /needs an id/.test(messages(broken("<Text>a</Text>").replace('id="s"', 'id="Bad Id"')).join("|")), true);
// Option C (2026-10-23): any lowercase state names a frame Navigate to leads to; Filter table and Change step are actions.
const withProto = (body) => broken(body).replace("{ Board, Screen }", "{ Board, Screen, proto }");
check("a Screen state: any lowercase name, not a capital or a space", [messages(broken("<Text>a</Text>").replace('id="s"', 'id="s" state="step-2"')), messages(broken("<Text>a</Text>").replace('id="s"', 'id="s" state="Filtered"')).length, messages(broken("<Text>a</Text>").replace('id="s"', 'id="s" state="no match"')).length], [[], 1, 1]);
check("filter and step are interactions; another name is not", [messages(withProto('<Button onClick={proto.filter({ column: "status", value: "Paid" })}>Paid</Button><Button onClick={proto.step("next", { stepper: "Pay" })}>Next</Button>')), /not an interaction \(navigate, open, close, back, toast, link, filter, step\)/.test(first(withProto("<Button onClick={proto.shuffle()}>Go</Button>")))], [[], true]);
check("jsxText", [jsxText("\n   a  \n  b\n"), jsxText("  lead"), jsxText("a\tb")], ["a b", "  lead", "a b"]);

// Page-local components (Figma's main components and instances, 2026-10-17).
const withComponents = (body) => `// @zen-page {"format":1,"title":"x"}
import { Board, Component, ComponentSet, Screen, Use } from "@zen-ds/react/builder";
import { Button, Icon, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="s" title="x">
        <Stack>
          ${body}
        </Stack>
      </Screen>
    </Board>
  );
}
`;
const good = withComponents('<Component id="cta" name="Call to action"><Button>Buy</Button></Component>\n          <Use of="cta" />');
check("components: a main and its instance", messages(good), []);
check("components: localComponents", localComponents(parsePage(good, { components })).map((main) => [main.id, main.name, main.root?.name]), [["cta", "Call to action", "Button"]]);
check("components: an unknown instance", /names no component/.test(first(withComponents('<Use of="nope" />'))), true);
check("components: two layers in a main", /exactly one layer/.test(first(withComponents('<Component id="a" name="A"><Text>a</Text><Text>b</Text></Component>'))), true);
check("components: a repeated id", /share the id/.test(first(withComponents('<Component id="a" name="A"><Text>a</Text></Component><Component id="a" name="B"><Text>b</Text></Component>'))), true);
check("components: an instance inside its main", /inside its own component/.test(first(withComponents('<Component id="a" name="A"><Stack><Use of="a" /></Stack></Component>'))), true);
check("components: a bad id", /needs an id/.test(first(withComponents('<Component id="A b" name="A"><Text>a</Text></Component>'))), true);
// Libraries' project components (live): an instance of another page's component checks its shape only.
check("components: another page's component", messages(withComponents('<Use of="card-1" page="pricing" variant={{ Size: "Small" }} props={{ Label: "Go" }} overrides={{ Text: { children: "Hi" } }} />')), []);
check("components: page names a page id", /names a page of the project/.test(first(withComponents('<Use of="card-1" page="Bad Page" />'))), true);
check("components: of on another page is a component id", /names a component of page pricing/.test(first(withComponents('<Use of="Card 1" page="pricing" />'))), true);
check("components: overrides on another page's take literals", /literal values/.test(first(withComponents('<Use of="card-1" page="pricing" overrides={{ Text: { children: mock.x } }} />'))), true);
// F7: sets, variants, properties and their bindings, instances with variant and props (Figma's component sets).
{
  const set = `<ComponentSet id="chip" name="Chip" properties={{ Label: { type: "text", default: "Filter" }, "Show icon": { type: "boolean", default: true }, Icon: { type: "swap", default: "icon-star-line" } }}>
            <Component id="chip-small" variant={{ Size: "Small", State: "Default" }}><Stack direction="row"><Icon name="icon-star-line" data-prop-visible="Show icon" data-prop-swap="Icon" /><Text data-prop-text="Label">Filter</Text></Stack></Component>
            <Component id="chip-large" variant={{ Size: "Large", State: "Default" }}><Stack direction="row"><Text data-prop-text="Label">Filter</Text></Stack></Component>
          </ComponentSet>`;
  const page = withComponents(`${set}\n          <Use of="chip" variant={{ Size: "Large" }} props={{ Label: "Done", "Show icon": false }} />`);
  const tree = parsePage(page, { components });
  check("sets: a valid page", tree.errors.map((error) => error.message), []);
  const [chip] = componentSets(tree);
  check("sets: axes and variants", [chip.axes, chip.variants.map((main) => main.name)], [[{ name: "Size", values: ["Small", "Large"] }, { name: "State", values: ["Default"] }], ["Size=Small, State=Default", "Size=Large, State=Default"]]);
  check("sets: properties", chip.properties.map((property) => `${property.name}:${property.type}:${property.default}`), ["Label:text:Filter", "Show icon:boolean:true", "Icon:swap:icon-star-line"]);
  let use = null;
  (function find(node) { if (!node || node.kind !== "element") return; if (node.name === "Use") use = node; node.children.forEach(find); })(tree.board);
  const resolved = resolveInstance(tree, use);
  check("instance: its variant and values", [resolved.main.id, resolved.values], ["chip-large", { Label: "Done", "Show icon": false, Icon: "icon-star-line" }]);
  const errorOf = (body) => first(withComponents(body));
  check("sets: a bad binding", /names no property/.test(errorOf(set.replace('data-prop-text="Label"', 'data-prop-text="Title"'))), true);
  check("sets: a binding of the wrong kind", /is a text property/.test(errorOf(set.replace('data-prop-visible="Show icon"', 'data-prop-visible="Label"'))), true);
  check("sets: two equal variants", /are both/.test(errorOf(set.replace('variant={{ Size: "Large", State: "Default" }}', 'variant={{ Size: "Small", State: "Default" }}'))), true);
  check("instance: an unknown variant value", /not Huge/.test(errorOf(`${set}\n          <Use of="chip" variant={{ Size: "Huge" }} />`)), true);
  check("instance: an unknown property", /no property Title/.test(errorOf(`${set}\n          <Use of="chip" props={{ Title: "x" }} />`)), true);
  check("instance: a boolean takes true or false", /true or false/.test(errorOf(`${set}\n          <Use of="chip" props={{ "Show icon": "yes" }} />`)), true);
  check("sets: variants without values take Figma's defaults by place", componentSets(parsePage(withComponents('<ComponentSet id="tag" name="Tag"><Component id="tag-a"><Text>a</Text></Component><Component id="tag-b"><Text>b</Text></Component></ComponentSet>'), { components }))[0].variants.map((main) => main.name), ["Property 1=Default", "Property 1=Variant2"]);
  check("components: variant outside a set", /put the component in a <ComponentSet>/.test(errorOf('<Component id="a" name="A" variant={{ Size: "S" }}><Text>a</Text></Component>')), true);
  check("components: a lone main's properties", localComponents(parsePage(withComponents('<Component id="a" name="A" properties={{ On: { type: "boolean", default: false } }}><Text data-prop-visible="On">a</Text></Component>'), { components }))[0].properties, [{ name: "On", type: "boolean", default: false }]);
}

// Sections (Figma's, F4): a named board area beside the frames.
const withSection = (section) => `// @zen-page {"format":1,"title":"Sections"}
import { Board, Screen, Section } from "@zen-ds/react/builder";

export const mock = {};

export default function Page() {
  return (
    <Board>
      ${section}
      <Screen id="home" title="Home" x={100} y={100} />
    </Board>
  );
}
`;
const sectionPage = withSection('<Section id="section-1" title="Onboarding" x={0} y={0} width={1200} height={1000} />');
check("sections: a Section on the Board", messages(sectionPage), []);
check("sections: boardSections reads it", boardSections(parsePage(sectionPage)), [{ id: "section-1", title: "Onboarding", x: 0, y: 0, width: 1200, height: 1000, loc: "9:6" }]);
check("sections: not a frame", boardFrames(parsePage(sectionPage)).map((frame) => frame.id), ["home"]);
check("sections: needs its size", /<Section> needs width/.test(first(withSection('<Section id="s" title="S" x={0} y={0} height={100} />'))), true);
check("sections: holds no layers", /holds no layers/.test(first(withSection('<Section id="s" title="S" x={0} y={0} width={400} height={400}><Screen id="x" /></Section>'))), true);
check("sections: sectionCode", sectionCode({ id: "section-2", title: "Flow <A>", x: -40.4, y: 10, width: 470, height: 925 }), '<Section id="section-2" title="Flow A" x={-40} y={10} width={470} height={925} />');
check("sections: the code is a valid Section", messages(withSection(sectionCode({ id: "section-2", title: "Flow", x: 0, y: 0, width: 470, height: 925 }))), []);
// Slices (Figma's): an export area of the board, above the frames, no layers; not one of the board's frames.
const withSlice = (slice) => withSection(slice).replace("import { Board, Screen, Section }", "import { Board, Screen, Slice }");
const slicePage = withSlice('<Slice id="slice-1" title="Hero" x={0} y={0} width={1} height={240} />');
check("slices: a Slice on the Board (as small as 1 px)", messages(slicePage), []);
check("slices: not one of the board's frames", boardFrames(parsePage(slicePage)).map((frame) => frame.id), ["home"]);
check("slices: needs its size", /<Slice> needs height/.test(first(withSlice('<Slice id="s" title="S" x={0} y={0} width={100} />'))), true);
check("slices: holds no layers", /A Slice holds no layers/.test(first(withSlice('<Slice id="s" title="S" x={0} y={0} width={40} height={40}><Screen id="x" /></Slice>'))), true);
check("slices: sliceCode", sliceCode({ id: "slice-2", title: "Hero <A>", x: 10.4, y: -5, width: 320, height: 200 }), '<Slice id="slice-2" title="Hero A" x={10} y={-5} width={320} height={200} />');
check("slices: the code is a valid Slice", messages(withSlice(sliceCode({ id: "slice-2", title: "Hero", x: 0, y: 0, width: 320, height: 200 }))), []);

if (failures.length) {
  console.error(`dialect selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ dialect selftest: ${passed} checks pass.`);
