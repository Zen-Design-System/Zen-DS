import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Chip, DockIcon, Form, FormFieldset, Heading, List, ListItem, Rating, RatingDisplay, Stack, Text, TextAreaField, TopNavigation, plural,
  useToast,
} from "@zen-ds/react";
import { daysFromToday, formatRelative } from "../../data";

// Phin & Co's loyalty app: Alex's pick-ups, newest first. This morning's order waits for a rating, as does one from
// last Saturday; the rest already have one.
type Review = { stars: number; problems: string[]; note: string };
type PhinOrder = { id: string; store: string; picked: Date; items: number };
const phinOrders: PhinOrder[] = [
  { id: "A-247", store: "Phin Nguyễn Huệ", picked: daysFromToday(0, 8, 5), items: 2 },
  { id: "A-239", store: "Phin Lê Lợi", picked: daysFromToday(-1, 8, 12), items: 1 },
  { id: "A-236", store: "Phin Thảo Điền", picked: daysFromToday(-2, 15, 40), items: 3 },
  { id: "A-231", store: "Phin Nguyễn Huệ", picked: daysFromToday(-4, 9, 20), items: 2 },
  { id: "A-228", store: "Phin Đa Kao", picked: daysFromToday(-5, 8, 2), items: 1 },
  { id: "A-224", store: "Phin Lê Lợi", picked: daysFromToday(-6, 12, 45), items: 4 },
  { id: "A-219", store: "Phin Nguyễn Huệ", picked: daysFromToday(-8, 8, 10), items: 1 },
  { id: "A-215", store: "Phin Bến Thành", picked: daysFromToday(-9, 17, 30), items: 2 },
  { id: "A-209", store: "Phin Thảo Điền", picked: daysFromToday(-11, 9, 0), items: 2 },
  { id: "A-204", store: "Phin Nguyễn Huệ", picked: daysFromToday(-12, 8, 15), items: 1 },
  { id: "A-198", store: "Phin Phú Mỹ Hưng", picked: daysFromToday(-15, 14, 5), items: 3 },
  { id: "A-193", store: "Phin Lê Lợi", picked: daysFromToday(-16, 8, 20), items: 1 },
  { id: "A-187", store: "Phin Nguyễn Huệ", picked: daysFromToday(-19, 8, 0), items: 2 },
  { id: "A-182", store: "Phin Đa Kao", picked: daysFromToday(-20, 10, 40), items: 1 },
  { id: "A-176", store: "Phin Nguyễn Huệ", picked: daysFromToday(-22, 8, 25), items: 2 },
];
const sentReviews: Record<string, Review> = Object.fromEntries(
  ([["A-239", 5], ["A-236", 4], ["A-228", 5], ["A-224", 3], ["A-219", 5], ["A-215", 4], ["A-209", 5], ["A-204", 5], ["A-198", 2], ["A-193", 5], ["A-187", 4], ["A-182", 5], ["A-176", 4]] as const)
    .map(([id, stars]) => [id, { stars, problems: stars <= 3 ? ["Long wait"] : [], note: "" }]),
);
const orderWords = ["", "Poor", "Not great", "Okay", "Good", "Great"];
const problems = ["Drink was cold", "Wrong item", "Long wait", "Missing item", "Spilled in the bag"];
const orderIcon = <DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" />;

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function RateYourOrder({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const formId = useId();
  const [sent, setSent] = useState(sentReviews);
  // Unsent answers stay as a draft per order, so Back never throws them away.
  const [drafts, setDrafts] = useState<Record<string, Review>>({});
  const [view, setView] = useState<"orders" | "order">("order");
  const [orderId, setOrderId] = useState("A-247");
  const [error, setError] = useState(false);
  // Focus follows the screen: an order's screen focuses its title, Back returns to the Orders title.
  const titleRef = useRef<HTMLSpanElement>(null);
  const ordersRef = useRef<HTMLSpanElement>(null);
  const order = view === "order" ? phinOrders.find((item) => item.id === orderId) : undefined;
  const review = drafts[orderId] ?? sent[orderId] ?? { stars: 0, problems: [], note: "" };
  const edit = (patch: Partial<Review>) => setDrafts({ ...drafts, [orderId]: { ...review, ...patch } });
  const open = (id: string) => {
    setOrderId(id);
    setError(false);
    setView("order");
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setView("orders");
    setTimeout(() => ordersRef.current?.focus());
  };
  const send = () => {
    // Send without a star: the line under the stars says so, and the stars are marked invalid, so Form moves focus to
    // the first star.
    if (!review.stars) { setError(true); return; }
    setSent({ ...sent, [orderId]: review });
    setDrafts(Object.fromEntries(Object.entries(drafts).filter(([id]) => id !== orderId)));
    toast({ title: "Rating sent" });
    back();
  };

  if (!order) {
    return (
      // The Orders root: a large title over the 15 orders.
      <AppShell key="orders" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Orders" largeTitle={<span ref={ordersRef} tabIndex={-1}>Orders</span>} />}>
        {/* Rows pad 12px above and below only, so their content sits at the page margin and the interactive fill (12px
            past the row sideways) stays 8px inside the screen. */}
        <List aria-label="Orders">
          {phinOrders.map((item) => (
            <ListItem key={item.id} title={item.store} onClick={() => open(item.id)} leading={orderIcon}
              caption={`${item.id} · ${drafts[item.id] ? "Rating not sent" : formatRelative(item.picked)}`}
              trailing={sent[item.id] ? <RatingDisplay value={sent[item.id].stars} size="sm" label={`You rated ${plural(sent[item.id].stars, "star")}`} />
                : <Text as="span" textStyle="Body/Small/Regular" tone="base">Not rated</Text>} />
          ))}
        </List>
      </AppShell>
    );
  }
  const low = review.stars > 0 && review.stars <= 3;
  const toggle = (problem: string) => edit({ problems: review.problems.includes(problem) ? review.problems.filter((item) => item !== problem) : [...review.problems, problem] });
  return (
    // The order's rating screen: a child, compact with Back, and Send rating in the Action bar.
    <AppShell key={order.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>Rate your order</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      actionBar={<ActionBar primaryAction={{ label: "Send rating", type: "submit", form: formId }} />}>
      <Form id={formId} onSubmit={send}>
        <List aria-label="Order">
          <ListItem leading={orderIcon} title={`${order.id} · ${order.store}`} caption={`${plural(order.items, "item")} · ${formatRelative(order.picked)}`} />
        </List>
        <Stack gap="xs" align="center">
          <Heading level={2} textStyle="Heading/Subheading" align="center">How was your order?</Heading>
          <Rating aria-label="How was your order?" size="xl" value={review.stars} data-zen-invalid={error ? "true" : undefined}
            onValueChange={(stars) => { edit({ stars }); setError(false); }} />
          <Text role="status" tone={error ? "negative" : "base"} align="center">{error ? "Choose from 1 to 5 stars" : orderWords[review.stars]}</Text>
        </Stack>
        {/* A low score asks what went wrong; both answers stay optional. */}
        {low ? (
          <>
            <FormFieldset legend="What went wrong?" optional>
              <Stack direction="row" gap="xs" wrap>
                {problems.map((problem) => (
                  <Chip key={problem} variant="normal" level="secondary"
                    selected={review.problems.includes(problem)} onClick={() => toggle(problem)}>
                    {problem}
                  </Chip>
                ))}
              </Stack>
            </FormFieldset>
            <TextAreaField size="lg" label="Anything else" labelOptional rows={3} value={review.note} onValueChange={(note) => edit({ note })} placeholder="Tell the store team" />
          </>
        ) : null}
      </Form>
    </AppShell>
  );
}
