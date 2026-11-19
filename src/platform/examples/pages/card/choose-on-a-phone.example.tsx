import { useId, useRef, useState, type RefObject } from "react";
import { ActionBar, AppShell, Card, DescriptionList, DockIcon, Heading, List, ListItem, Stack, Text, TopNavigation, type IconName } from "@zen-ds/react";
import { formatMoney } from "../../data";

type OrderType = { id: "pickup" | "delivery"; name: string; detail: string; icon: IconName; fee: number };
const orderTypes: OrderType[] = [
  { id: "pickup", name: "Pick up", detail: "Phin Nguyen Hue · ready in about 10 minutes", icon: "icon-shopping-bag-01-line", fee: 0 },
  { id: "delivery", name: "Delivery", detail: "To 18 Ly Tu Trong, District 1 · 25–35 minutes", icon: "icon-truck-line", fee: 1.5 },
];
type CartLine = { id: string; name: string; detail: string; quantity: number; price: number; icon: IconName };
const cart: CartLine[] = [
  { id: "c1", name: "Phin sữa đá", detail: "Medium · less sugar", quantity: 2, price: 5.2, icon: "icon-coffee-cup-line" },
  { id: "c2", name: "Bánh mì chả cá", detail: "No chili", quantity: 1, price: 2.4, icon: "icon-bread-line" },
];
const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
const back = "icon-chevron-left-line-medium" as const;
type Step = "cart" | "checkout" | "placed";

/** On a phone: selectable cards for one choice, at checkout in the Phin & Co app. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneOrderType({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  // The example opens on checkout (the screen it teaches); Back leads to the cart, Place order to the confirmation.
  const [step, setStep] = useState<Step>("checkout");
  const [type, setType] = useState<OrderType["id"]>("pickup");
  const kickerId = useId();
  const orderId = useId();
  // Focus follows the screen: the screen that opens focuses its title.
  const titleRef = useRef<HTMLSpanElement>(null);
  const chosen = orderTypes.find((option) => option.id === type)!;
  const total = subtotal + chosen.fee;
  const go = (next: Step) => {
    setStep(next);
    setTimeout(() => titleRef.current?.focus());
  };
  const title = (text: string) => <span ref={titleRef} tabIndex={-1}>{text}</span>;
  const summary = (
    <DescriptionList items={[
      ...cart.map((item) => ({ id: item.id, term: `${item.name} × ${item.quantity}`, description: formatMoney(item.price, true) })),
      { id: "fee", term: "Delivery fee", description: chosen.fee ? formatMoney(chosen.fee, true) : "Free" },
      { id: "total", term: "Total", description: formatMoney(total, true), emphasis: true },
    ]} />
  );

  if (step === "cart") {
    return (
      // One key per screen: each screen's Top Navigation measures its own fold.
      <AppShell key="cart"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Cart" largeTitle={title("Cart")} />}
        actionBar={<ActionBar
          summary={<Text as="span" textStyle="Body/Base/Medium">{`Subtotal ${formatMoney(subtotal, true)}`}</Text>}
          primaryAction={{ label: "Go to checkout", onClick: () => go("checkout") }} />}>
        {/* Static rows pad 0 at the sides: the screen margin insets them. */}
        <List aria-label="Cart">
          {cart.map((item) => (
            <ListItem key={item.id} title={`${item.name} × ${item.quantity}`} caption={item.detail}
              leading={<DockIcon icon={item.icon} theme="brown" background="subtle" size="md" />}
              trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(item.price, true)}</Text>} />
          ))}
        </List>
      </AppShell>
    );
  }

  if (step === "placed") {
    // An end state keeps a way out: Done starts again from the cart.
    return (
      <AppShell key="placed"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={title("Order placed")} />}
        actionBar={<ActionBar primaryAction={{ label: "Done", onClick: () => go("cart") }} />}>
        <Stack gap="lg">
          <Stack gap="xs" role="status">
            <Heading level={2}>{`Order A-251 · ${chosen.name}`}</Heading>
            <Text tone="base">{type === "pickup" ? "Pick it up at Phin Nguyen Hue in about 10 minutes." : "It reaches 18 Ly Tu Trong in 25–35 minutes."}</Text>
          </Stack>
          {summary}
        </Stack>
      </AppShell>
    );
  }

  return (
    <AppShell key="checkout"
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={title("Checkout")}
        leading={{ icon: back, label: "Back", onClick: () => go("cart") }} />}
      actionBar={<ActionBar
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{`Total ${formatMoney(total, true)}`}</Text>}
        primaryAction={{ label: "Place order", onClick: () => go("placed") }} />}>
      <Stack gap="lg">
        <Stack as="section" gap="xs" aria-labelledby={kickerId}>
          <Heading level={2} id={kickerId} textStyle="Body/Small/Bold" tone="light">Order type</Heading>
          {/* The choices are one group (sm); the whole card is the target. */}
          <Stack gap="sm">
            {orderTypes.map((option) => (
              <Card key={option.id} theme="border" selected={type === option.id} aria-pressed={type === option.id}
                onClick={() => setType(option.id)}>
                <Stack direction="row" gap="md" align="center">
                  <DockIcon icon={option.icon} theme="neutral" background="subtle" />
                  <Stack gap="2xs" width="fill">
                    <Text as="span" textStyle="Body/Base/Bold">{option.name}</Text>
                    <Text as="span" textStyle="Body/Small/Regular" tone="base">{option.detail}</Text>
                  </Stack>
                  <Text as="span" textStyle="Body/Base/Medium">{option.fee ? formatMoney(option.fee, true) : "Free"}</Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={orderId}>
          <Heading level={2} id={orderId} textStyle="Body/Small/Bold" tone="light">Your order</Heading>
          {summary}
        </Stack>
      </Stack>
    </AppShell>
  );
}
