import { useRef, useState, type RefObject } from "react";
import { AppShell, Heading, List, ListItem, Stack, Text, TopNavigation, plural } from "@zen-ds/react";

/* Ava Chen's print orders from the studio shop, newest first; today is Wednesday, Sep 30, 2026. */
const prints = {
  windmill: { name: "Windmill by the sea", price: 48 },
  rooftops: { name: "Old town rooftops", price: 42 },
  bridge: { name: "Bridge at dusk", price: 56 },
  college: { name: "College courtyard", price: 34 },
  hill: { name: "Old town from the hill", price: 42 },
  cafe: { name: "Morning café", price: 32 },
  sunset: { name: "Field at sunset", price: 56 },
  creek: { name: "Forest creek", price: 44 },
};
type Order = {
  id: string;
  /** The key status: the order screen's first line and the row caption. */
  status: string;
  /** One sentence under the status. */
  note: string;
  items: Array<{ print: keyof typeof prints; qty: number }>;
};
const delivered = "Signed for by Ava Chen.";
const orders: Order[] = [
  { id: "#1042", status: "Arriving Thursday", note: "Your order left the warehouse this morning.", items: [{ print: "windmill", qty: 1 }, { print: "rooftops", qty: 2 }] },
  { id: "#1041", status: "Ships by Friday", note: "We're packing your prints.", items: [{ print: "bridge", qty: 1 }] },
  { id: "#1040", status: "Arriving Friday", note: "Your order is with the courier.", items: [{ print: "cafe", qty: 2 }, { print: "college", qty: 1 }] },
  { id: "#1038", status: "Delivered Sep 22", note: delivered, items: [{ print: "sunset", qty: 1 }] },
  { id: "#1036", status: "Delivered Sep 19", note: delivered, items: [{ print: "creek", qty: 1 }, { print: "hill", qty: 1 }] },
  { id: "#1035", status: "Cancelled Sep 17", note: "Refunded to your card on Sep 18.", items: [{ print: "windmill", qty: 1 }] },
  { id: "#1033", status: "Delivered Sep 14", note: delivered, items: [{ print: "rooftops", qty: 1 }] },
  { id: "#1031", status: "Delivered Sep 9", note: delivered, items: [{ print: "college", qty: 2 }] },
  { id: "#1029", status: "Delivered Sep 4", note: delivered, items: [{ print: "bridge", qty: 1 }, { print: "cafe", qty: 1 }] },
  { id: "#1027", status: "Delivered Aug 28", note: delivered, items: [{ print: "hill", qty: 1 }] },
  { id: "#1024", status: "Delivered Aug 21", note: delivered, items: [{ print: "sunset", qty: 1 }, { print: "creek", qty: 1 }] },
  { id: "#1021", status: "Delivered Aug 12", note: delivered, items: [{ print: "windmill", qty: 2 }] },
  { id: "#1018", status: "Delivered Jul 30", note: delivered, items: [{ print: "cafe", qty: 1 }] },
  { id: "#1015", status: "Delivered Jul 18", note: delivered, items: [{ print: "rooftops", qty: 1 }, { print: "college", qty: 1 }] },
];
const address = "Ava Chen, 12 Nguyen Hue, District 1, Ho Chi Minh City";
const shipping = 8;
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const printCount = (order: Order) => order.items.reduce((sum, item) => sum + item.qty, 0);
const subtotal = (order: Order) => order.items.reduce((sum, item) => sum + item.qty * prints[item.print].price, 0);
const back = "icon-chevron-left-line-medium" as const;

/** Child screen on a phone (pushed): the compact bar title is the screen's h1 in its bar style (Body/Extra/Bold); the key
 *  status is a line of text, sections are h2 Heading/4 and the groups inside a section h3 Heading/Subheading. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function ChildScreen({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  // Opens on order #1042. Back goes up to a real Orders root, and every order opens its own screen; focus lands on the
  // opened screen's title, and Back returns it to the order's row.
  const [openId, setOpenId] = useState<string | null>("#1042");
  const [fromId, setFromId] = useState("#1042");
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const order = orders.find((item) => item.id === openId);

  if (order) {
    return (
      <AppShell key={order.id}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{`Order ${order.id}`}</span>}
          leading={{ icon: back, label: "Back", onClick: () => { setOpenId(null); setTimeout(() => rowRef.current?.focus()); } }} />}>
        {/* A key status is not a heading: Body/Extra/Bold in the strongest tone, right under the title. */}
        <Stack gap="2xs">
          <Text textStyle="Body/Extra/Bold">{order.status}</Text>
          <Text tone="base">{order.note}</Text>
        </Stack>
        <Stack as="section" gap="xs">
          <Heading level={2} textStyle="Heading/4">Items</Heading>
          {/* Rows have no side padding of their own: the screen pads them, so they line up with the headings. */}
          <List aria-label="Items">
            {order.items.map(({ print, qty }) => <ListItem key={print} title={prints[print].name} caption={`${qty} × ${money(prints[print].price)}`} />)}
          </List>
        </Stack>
        {/* Sibling sections share Heading/4; the groups inside one are a level deeper (h3 Heading/Subheading), set apart by spacing:
            heading to content 8 · group to group 16 · section to section 24. */}
        <Stack as="section" gap="xs">
          <Heading level={2} textStyle="Heading/4">Delivery</Heading>
          <Stack gap="md">
            <Stack gap="2xs">
              <Heading level={3} textStyle="Heading/Subheading">Address</Heading>
              <Text tone="base">{address}</Text>
            </Stack>
            <Stack gap="2xs">
              <Heading level={3} textStyle="Heading/Subheading">Courier</Heading>
              <Text tone="base">{`GHN · tracking GHN-88${order.id.slice(1)}`}</Text>
            </Stack>
          </Stack>
        </Stack>
      </AppShell>
    );
  }

  return (
    // The screen margin insets the rows; their fill (12px outside the content) stays 8px inside the screen.
    <AppShell key="orders" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Orders" largeTitle="Orders" />}>
      <List aria-label="Orders">
        {orders.map((item) => (
          <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
            title={`Order ${item.id}`} caption={`${item.status} · ${plural(printCount(item), "print")}`}
            trailing={<Text as="span" textStyle="Body/Base/Medium">{money(subtotal(item) + shipping)}</Text>}
            onClick={() => { setOpenId(item.id); setFromId(item.id); setTimeout(() => titleRef.current?.focus()); }} />
        ))}
      </List>
    </AppShell>
  );
}
