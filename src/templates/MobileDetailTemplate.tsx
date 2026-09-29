/**
 * Template: phone detail screen (an order). Copy it into your app and replace the sample data and handlers.
 * Render it inside <ZenProvider typography="mobile" density="comfortable">. Uses only @zen/design-system components.
 * Mobile patterns: a sticky compact TopNavigation with a Back chevron (its title is the screen's h1; sections are h2
 * Heading/4), a vertical Stepper for progress, a List with
 * Thumbnails, DescriptionLists for the totals and details, and an ActionBar footer (Large, Primary on top) whose
 * "Get help" opens an Action BottomSheet.
 */
import { useState } from "react";
import {
  ActionBar,
  BottomSheet,
  DescriptionList,
  Heading,
  Icon,
  List,
  ListItem,
  Stack,
  Stepper,
  Text,
  Thumbnail,
  TopNavigation,
  plural,
  useToast,
  type BottomSheetItem,
} from "@zen/design-system";

/* ── Sample data: replace with your own ─────────────────────────────── */
/** Sample product pictures drawn inline, so the template runs offline. Use your image URLs instead. */
const picture = (from: string, to: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><linearGradient id="g" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient><rect width="1" height="1" fill="url(#g)"/></svg>`)}`;
const items = [
  { id: "dusk", name: "Dusk gradient print", detail: "40 × 50 cm · Matte", qty: 1, price: 64, picture: picture("hsl(18 90% 72%)", "hsl(268 45% 42%)") },
  { id: "sea", name: "Sea glass print", detail: "30 × 40 cm · Matte", qty: 2, price: 42, picture: picture("hsl(172 50% 78%)", "hsl(205 60% 40%)") },
  { id: "meadow", name: "Meadow print", detail: "21 × 30 cm · Gloss", qty: 1, price: 28, picture: picture("hsl(88 45% 75%)", "hsl(140 40% 32%)") },
];
const SHIPPING = 0;
const TAX_RATE = 0.08;
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const steps = [
  { id: "placed", title: "Order placed", caption: "Mon 21 Sep, 09:12" },
  { id: "packed", title: "Packed", caption: "Tue 22 Sep" },
  { id: "shipped", title: "Shipped", caption: "Wed 23 Sep · GHN" },
  { id: "delivered", title: "Delivered", caption: "Expected Fri 25 Sep" },
];
const helpOptions = [
  { id: "return", label: "Return an item", icon: "icon-reverse-left-line" },
  { id: "problem", label: "Report a problem", icon: "icon-alert-circle-line" },
  { id: "contact", label: "Contact support", icon: "icon-message-chat-circle-line" },
  // A disabled option says why in its trailing hint.
  { id: "cancel", label: "Cancel order", icon: "icon-x-circle-line", disabled: true, trailing: <Text as="span" textStyle="Caption/Regular" tone="light">Already shipped</Text> },
] satisfies BottomSheetItem[];

export function MobileDetailTemplate() {
  const { toast } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;

  return (
    <Stack gap="none">
      {/* Detail screens have Back: a left chevron, labelled "Back" (it is icon-only). The compact bar title is the
          screen's h1 (it keeps the bar style, Body/Extra/Bold), so the content starts at h2. Your router also sets
          document.title to it: "Order #1042 · Your app". */}
      <TopNavigation type="compact" sticky title="Order #1042"
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Orders" }) /* your router: navigate(-1) */ }}
        trailing={[{ icon: "icon-share-01-line", label: "Share order", onClick: () => toast({ title: "Order link copied" }) }]} />

      <Stack gap="xl" padding="md">
        <Stack gap="md">
          <Stack gap="2xs">
            {/* A key status line is text in the Strongest tone, not a heading. */}
            <Text textStyle="Body/Extra/Bold">Arriving Friday</Text>
            <Text tone="base">Shipped with GHN · tracking GHN-88213</Text>
          </Stack>
          <Stepper orientation="vertical" aria-label="Delivery progress" current={2} steps={steps} />
        </Stack>

        <Stack gap="xs">
          <Heading level={2} textStyle="Heading/4">{plural(count, "item")}</Heading>
          <List aria-label="Items in this order">
            {items.map((item) => (
              <ListItem key={item.id} title={item.name} caption={`${item.detail} · Qty ${item.qty}`}
                leading={<Thumbnail src={item.picture} alt="" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{money(item.qty * item.price)}</Text>} />
            ))}
          </List>
        </Stack>

        <Stack gap="xs">
          <Heading level={2} textStyle="Heading/4">Payment</Heading>
          <DescriptionList items={[
            { term: "Subtotal", description: money(subtotal) },
            { term: "Shipping", description: SHIPPING ? money(SHIPPING) : "Free" },
            { term: `Tax (${TAX_RATE * 100}%)`, description: money(tax) },
            { term: "Total", description: money(subtotal + SHIPPING + tax), emphasis: true },
          ]} />
        </Stack>

        <DescriptionList layout="stacked" items={[
          { term: "Delivery address", description: "Ava Chen, 12 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City" },
          { term: "Paid with", description: "Visa ending 4242" },
        ]} />
      </Stack>

      {/* Footer CTA: sticky at the bottom, Large and full width, Primary on top; it clears the home indicator. */}
      <ActionBar
        primaryAction={{ label: "Track package", startIcon: <Icon name="icon-truck-line" decorative />, onClick: () => toast({ title: "Opening tracking for GHN-88213" }) }}
        secondaryAction={{ label: "Get help", onClick: () => setHelpOpen(true) }} />

      <BottomSheet type="action" title="Get help with this order" open={helpOpen} onOpenChange={setHelpOpen} items={helpOptions}
        onSelect={(item) => toast(item.id === "return"
          ? { title: "Return started", children: "We emailed you a prepaid label." }
          : { title: item.id === "problem" ? "Tell us what went wrong in the chat" : "Connecting you with support…" })} />
    </Stack>
  );
}
