import { useId, useRef, useState, type RefObject } from "react";
import { AppShell, DescriptionList, DockIcon, Heading, List, ListItem, Metric, Stack, Text, TopNavigation, type DockIconTheme, type IconName } from "@zen-ds/react";
import { daysFromToday, formatDate, formatMoney, formatTime } from "../../data";

type Category = { name: string; icon: IconName; theme: DockIconTheme };
const categories = {
  coffee: { name: "Coffee", icon: "icon-coffee-cup-line", theme: "orange" },
  transport: { name: "Transport", icon: "icon-train-01-line", theme: "blue" },
  income: { name: "Income", icon: "icon-bank-note-01-line", theme: "green" },
  shopping: { name: "Shopping", icon: "icon-shopping-bag-01-line", theme: "purple" },
  bills: { name: "Bills", icon: "icon-lightning-01-line", theme: "yellow" },
  tickets: { name: "Tickets", icon: "icon-ticket-01-line", theme: "pink" },
} satisfies Record<string, Category>;
type Payment = { id: string; merchant: string; category: keyof typeof categories; amount: number; at: Date; reference: string };
/** A customer's last five days on the Everyday account, newest first. */
const payments: Payment[] = [
  { id: "p1", merchant: "Phin & Co – Thao Dien", category: "coffee", amount: -4.8, at: daysFromToday(0, 8, 12), reference: "LB-7730-1942" },
  { id: "p2", merchant: "Metro Line 1", category: "transport", amount: -0.6, at: daysFromToday(0, 7, 45), reference: "LB-7730-1938" },
  { id: "p3", merchant: "Saola Outdoor", category: "shopping", amount: -129, at: daysFromToday(-1, 18, 20), reference: "LB-7729-0588" },
  { id: "p4", merchant: "Mobile plan", category: "bills", amount: -9.5, at: daysFromToday(-1, 12, 40), reference: "LB-7729-0466" },
  { id: "p5", merchant: "Đìzai Studio", category: "income", amount: 3850, at: daysFromToday(-1, 9, 0), reference: "LB-7729-0417" },
  { id: "p6", merchant: "Phin & Co – District 3", category: "coffee", amount: -3.9, at: daysFromToday(-1, 8, 30), reference: "LB-7729-0391" },
  { id: "p7", merchant: "Hanoi Book Fair", category: "tickets", amount: -12, at: daysFromToday(-2, 19, 30), reference: "LB-7728-2291" },
  { id: "p8", merchant: "Electricity bill", category: "bills", amount: -38.2, at: daysFromToday(-2, 12, 0), reference: "LB-7728-2210" },
  { id: "p9", merchant: "Metro Line 1", category: "transport", amount: -0.6, at: daysFromToday(-2, 8, 5), reference: "LB-7728-2034" },
  { id: "p10", merchant: "Book Street", category: "shopping", amount: -16.4, at: daysFromToday(-3, 16, 30), reference: "LB-7727-1206" },
  { id: "p11", merchant: "Saola Outdoor refund", category: "income", amount: 24, at: daysFromToday(-3, 15, 10), reference: "LB-7727-1180" },
  { id: "p12", merchant: "Phin & Co – Thao Dien", category: "coffee", amount: -5.2, at: daysFromToday(-3, 10, 20), reference: "LB-7727-1022" },
  { id: "p13", merchant: "Riverside Cinema", category: "tickets", amount: -9, at: daysFromToday(-4, 19, 40), reference: "LB-7726-0988" },
  { id: "p14", merchant: "Water bill", category: "bills", amount: -11.6, at: daysFromToday(-4, 18, 0), reference: "LB-7726-0960" },
  { id: "p15", merchant: "Transfer from Linh Vo", category: "income", amount: 25, at: daysFromToday(-4, 13, 15), reference: "LB-7726-0874" },
];
/** "−$4.80" · "+$3,850.00": the sign is in the text, so colour is never the only signal. */
const signed = (n: number) => `${n < 0 ? "−" : "+"}${formatMoney(Math.abs(n), true)}`;
/** "Today" · "Yesterday" · "Monday": the day a group of payments belongs to. */
const dayLabel = (d: Date) => {
  const days = Math.round((daysFromToday(0, 0, 0).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleString("en-US", { weekday: "long" });
};
const groups = payments.reduce<{ day: string; items: Payment[] }[]>((list, p) => {
  const day = dayLabel(p.at);
  const group = list.find((g) => g.day === day);
  if (group) group.items.push(p); else list.push({ day, items: [p] });
  return list;
}, []);

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneSpending({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  // The day of the payment last opened: Back returns focus to that day's heading, above the row you opened.
  const [fromDay, setFromDay] = useState<string | null>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const dayRef = useRef<HTMLHeadingElement>(null);
  const payment = payments.find((p) => p.id === openId);
  const open = (p: Payment) => {
    setOpenId(p.id);
    setFromDay(dayLabel(p.at));
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setOpenId(null);
    setTimeout(() => dayRef.current?.focus());
  };
  if (!payment) {
    return (
      // Spending is a tab root: its large title folds into the bar as the list scrolls under it.
      <AppShell key="spending" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Spending" largeTitle="Spending" />}>
        {/* The day groups sit in the screen margin (Margin/Comfortable, 20px): rows and kickers share one start edge and
            the fills stay 8px off the screen edge. Kicker → rows xs (the rows pad 12px above themselves). */}
        <Stack gap="lg">
          {groups.map((group, index) => (
            <Stack key={group.day} as="section" gap="xs" aria-labelledby={`${baseId}-${index}`}>
              <Heading ref={group.day === fromDay ? dayRef : undefined} level={2} id={`${baseId}-${index}`} textStyle="Body/Small/Bold" tone="light" tabIndex={-1}>{group.day}</Heading>
              <List aria-labelledby={`${baseId}-${index}`}>
                {group.items.map((p) => {
                  const category = categories[p.category];
                  return (
                    <ListItem key={p.id} title={p.merchant} caption={`${category.name} · ${formatTime(p.at)}`}
                      leading={<DockIcon icon={category.icon} theme={category.theme} background="subtle" size="md" />}
                      trailing={<Text as="span" textStyle="Body/Base/Bold" tone={p.amount > 0 ? "positive" : "strongest"}>{signed(p.amount)}</Text>}
                      onClick={() => open(p)} />
                  );
                })}
              </List>
            </Stack>
          ))}
        </Stack>
      </AppShell>
    );
  }
  const category = categories[payment.category];
  return (
    // A pushed screen: compact bar with Back, which returns focus to the day the payment came from.
    <AppShell key={payment.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>Payment</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}>
      <Stack gap="lg">
        {/* The detail repeats the list's mark, Large and Solid: same icon, same colour. */}
        <Metric size="xl" label={payment.merchant} value={signed(payment.amount)} icon={category.icon} iconTheme={category.theme} iconBackground="solid" />
        <DescriptionList divider items={[
          { term: "Category", description: category.name },
          { term: "Date", description: `${formatDate(payment.at)} at ${formatTime(payment.at)}` },
          { term: "Account", description: "Everyday account ··4821" },
          { term: "Reference", description: payment.reference },
        ]} />
      </Stack>
    </AppShell>
  );
}
