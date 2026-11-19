import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Box, Card, DescriptionList, DockIcon, EmptyState, Heading, IconButton, InlineMessage, List, ListBox, ListItem, Stack, Text, TopNavigation,
  VisuallyHidden, plural, useToast, type DockIconTheme, type IconName,
} from "@zen-ds/react";
import { daysFromToday, formatMoney, formatTime } from "../../data";

type Line = { id: string; name: string; detail: string; price: number; qty: number; icon: IconName; theme: DockIconTheme };
const usualOrder: Line[] = [
  { id: "l1", name: "Phin sữa đá", detail: "Medium · less sugar", price: 2.6, qty: 2, icon: "icon-coffee-cup-line", theme: "brown" },
  { id: "l2", name: "Golden lotus tea", detail: "Large · less ice", price: 3.2, qty: 1, icon: "icon-salad-leaf-line", theme: "green" },
  { id: "l3", name: "Bánh mì chả cá", detail: "No chili", price: 2.4, qty: 1, icon: "icon-bread-line", theme: "orange" },
];
const pointsLabel = (n: number) => plural(n, "point");
const back = "icon-chevron-left-line-medium" as const;

/** A Phin & Co checkout: the order's total rides in the Action bar's summary and follows every + and −. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneOrder({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const itemsId = useId();
  const pickupId = useId();
  const receiptId = useId();
  const payId = useId();
  const [lines, setLines] = useState(usualOrder);
  const [placing, setPlacing] = useState(false);
  /** The placed order: its number and what was in it (the confirmation lists it). */
  const [placed, setPlaced] = useState<{ code: string; lines: Line[]; total: number } | null>(null);
  // Focus has somewhere to go when the control that was used goes away: the screen's title, the total, the empty state.
  const titleRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLElement>(null);
  const emptyRef = useRef<HTMLSpanElement>(null);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const change = (line: Line, by: number) => {
    if (line.qty + by > 0) { setLines((all) => all.map((item) => (item.id === line.id ? { ...item, qty: item.qty + by } : item))); return; }
    // The last one out removes the line; the toast can bring it back where it was. Its buttons go with it, so focus
    // moves to the total beside Place order (or to the empty state once nothing is left).
    const before = lines;
    setLines((all) => all.filter((item) => item.id !== line.id));
    setTimeout(() => (lines.length > 1 ? totalRef : emptyRef).current?.focus());
    toast({ title: `${line.name} removed`, action: { label: "Undo", onClick: () => setLines(before) } });
  };
  const place = () => {
    setPlacing(true);
    setTimeout(() => {
      // The confirmation is a new screen: focus moves to its title. The screen's Inline Message confirms the order, so
      // no toast repeats it; the status region beside the screens tells screen readers.
      setPlacing(false);
      setPlaced({ code: "A-252", lines, total });
      setLines([]);
      setTimeout(() => titleRef.current?.focus());
    }, 900);
  };
  const startAgain = () => {
    setPlaced(null);
    setLines(usualOrder);
    setTimeout(() => titleRef.current?.focus());
  };
  const addUsual = () => {
    setLines(usualOrder);
    setTimeout(() => totalRef.current?.focus());
  };
  const kicker = (id: string, text: string) => <Box paddingX="lg"><Heading id={id} textStyle="Body/Small/Bold" tone="light" truncate={false}>{text}</Heading></Box>;
  const lineIcon = (line: Line) => <DockIcon icon={line.icon} theme={line.theme} background="subtle" />;

  return (
    <>
      {/* Outlives the screen change, so the confirmation is announced. */}
      <VisuallyHidden role="status">{placed ? `Order ${placed.code} placed. Pick it up at Phin Nguyen Hue in about 10 minutes.` : ""}</VisuallyHidden>
      {/* A checkout screen of the Phin & Co app, pushed from the menu: the compact bar with Back, the grouped order on
          Surface-Alt, and the bar on the same surface (surface="alt") with its Pale top rule. A task, so no tab bar. */}
      <AppShell key={placed ? "placed" : "order"}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title={<span ref={titleRef} tabIndex={-1}>{placed ? `Order ${placed.code}` : "Your order"}</span>}
          leading={{ icon: back, label: "Back", onClick: () => toast({ title: "Back to the menu", children: placed ? "Your order is being made." : "Your order is kept until you place it." }) }} />}
        actionBar={placed ? (
          <ActionBar surface="alt" primaryAction={{ label: "Start a new order", onClick: startAgain }} />
        ) : lines.length ? (
          <ActionBar surface="alt"
            summary={<Text ref={totalRef} tabIndex={-1} as="span" role="status" textStyle="Body/Base/Medium">{`${plural(count, "item")} · ${formatMoney(total, true)}`}</Text>}
            primaryAction={{ label: placing ? "Placing order…" : "Place order", disabled: placing, onClick: place }} />
        ) : undefined}
      >
        {placed ? (
          <>
            <InlineMessage theme="positive" title={`Order ${placed.code} is being made`}>Pick it up at Phin Nguyen Hue in about 10 minutes.</InlineMessage>
            <Stack as="section" gap="xs" aria-labelledby={receiptId}>
              {kicker(receiptId, "What you ordered")}
              <ListBox>
                <List aria-labelledby={receiptId}>
                  {placed.lines.map((line) => (
                    <ListItem key={line.id} as="li" title={`${line.qty} × ${line.name}`} caption={line.detail} leading={lineIcon(line)}
                      value={formatMoney(line.qty * line.price, true)} />
                  ))}
                </List>
              </ListBox>
            </Stack>
            <Card theme="default">
              <DescriptionList divider layout="inline" items={[
                { id: "total", term: "Total", description: formatMoney(placed.total, true) },
                { id: "paid", term: "Paid with", description: "Phin card" },
                { id: "where", term: "Pick up at", description: "Phin Nguyen Hue" },
                { id: "ready", term: "Ready at", description: formatTime(daysFromToday(0, 10, 40)) },
              ]} />
            </Card>
          </>
        ) : lines.length ? (
          <>
            <Stack as="section" gap="xs" aria-labelledby={itemsId}>
              {kicker(itemsId, "Drinks and food")}
              <ListBox>
                <List aria-labelledby={itemsId}>
                  {lines.map((line) => (
                    // The summary carries the money. Two title lines: beside the stepper a name would otherwise end in an ellipsis.
                    <ListItem key={line.id} title={line.name} titleLines={2} caption={line.detail}
                      leading={<DockIcon icon={line.icon} theme={line.theme} background="subtle" />}
                      trailing={(
                        <Stack direction="row" gap="2xs" align="center" role="group" aria-label={`${line.name} quantity`}>
                          <IconButton level="tertiary" size="md" icon="icon-minus-line" aria-label={`Remove one ${line.name}`} onClick={() => change(line, -1)} />
                          {/* Two digits of width (ch follows the typography mode), so the buttons don't move as the number changes. */}
                          <Text as="span" textStyle="Body/Base/Medium" width="hug" align="center" tabularNumbers style={{ minWidth: "2ch" }}>{line.qty}</Text>
                          <IconButton level="tertiary" size="md" icon="icon-plus-line" aria-label={`Add one ${line.name}`} onClick={() => change(line, 1)} />
                        </Stack>
                      )} />
                  ))}
                </List>
              </ListBox>
            </Stack>
            <Stack as="section" gap="xs" aria-labelledby={pickupId}>
              {kicker(pickupId, "Pick up at")}
              <ListBox>
                <List aria-labelledby={pickupId}>
                  <ListItem title="Phin Nguyen Hue" caption="42 Nguyen Hue, District 1 · ready in about 10 minutes"
                    leading={<DockIcon icon="icon-marker-pin-01-line" theme="neutral" background="subtle" />}
                    as="li"
                    titleLines={1} />
                </List>
              </ListBox>
            </Stack>
            <Stack as="section" gap="xs" aria-labelledby={payId}>
              {kicker(payId, "Pay with")}
              <ListBox>
                <List aria-labelledby={payId}>
                  {/* The points the order earns follow the total, as the summary does. */}
                  <ListItem as="li" title="Phin card" caption={`Balance $24.60 · earns ${pointsLabel(Math.round(total * 10))}`}
                    leading={<DockIcon icon="icon-credit-card-line" theme="neutral" background="subtle" />} />
                </List>
              </ListBox>
            </Stack>
          </>
        ) : (
          // With nothing to order there is nothing to place: the bar goes with the last line.
          <EmptyState headingLevel={2} icon="icon-shopping-bag-01-line" title={<span ref={emptyRef} tabIndex={-1}>Your order is empty</span>}
            primaryAction={{ label: "Add your usual", onClick: addUsual }}>
            Your usual is two Phin sữa đá, a lotus tea and a bánh mì.
          </EmptyState>
        )}
      </AppShell>
    </>
  );
}
