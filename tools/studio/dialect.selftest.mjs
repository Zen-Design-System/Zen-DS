#!/usr/bin/env node
// Self-test of the builder page dialect (tools/studio/dialect.mjs). Run: node tools/studio/dialect.selftest.mjs
import { jsxText, newPageText, pageHeader, parsePage, validateDialect } from "./dialect.mjs";

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
import { Board, Overlay, Screen, proto } from "@zen/design-system/builder";
import { Button, Dialog, List, ListItem, Stack, Text } from "@zen/design-system";

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
import { Board, Screen } from "@zen/design-system/builder";
import { Button, Stack, Text } from "@zen/design-system";${extraImport}

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
check("not a Zen component", /is not a Zen component/.test(first(broken("<Text>a</Text>", '\nimport { Fancy } from "@zen/design-system";'))), true);
check("a hook in the page", /only returns its <Board>/.test(messages(page.replace("  return (\n    <Board>", "  const [a] = useState(0);\n  return (\n    <Board>")).join("|")), true);
check("no header", /page header/.test(messages(page.replace(/^.*\n/, "")).join("|")), true);
check("screen id", /needs an id/.test(messages(broken("<Text>a</Text>").replace('id="s"', 'id="Bad Id"')).join("|")), true);
check("jsxText", [jsxText("\n   a  \n  b\n"), jsxText("  lead"), jsxText("a\tb")], ["a b", "  lead", "a b"]);

if (failures.length) {
  console.error(`dialect selftest: ${failures.length} failed, ${passed} passed\n  ✗ ${failures.join("\n  ✗ ")}`);
  process.exit(1);
}
console.log(`✓ dialect selftest: ${passed} checks pass.`);
