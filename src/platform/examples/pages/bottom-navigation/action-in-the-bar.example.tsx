import { useRef, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, BottomSheet, DockIcon, InputField, List, ListItem, Metric, NumberField, SelectField, Stack, Text, TopNavigation,
  useFormState, useToast,
  type BottomNavigationItem, type DockIconTheme, type IconName,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatMoney, formatRange, formatRelative, initials, people, projectById, type Person, type PersonId } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

// Đìzai Studio's expenses app: three destinations, and the app's one create action as the last cell of the bar.
type ExpenseCategory = "Transport" | "Meals" | "Flights" | "Software" | "Office";
const categoryLook: Record<ExpenseCategory, { icon: IconName; theme: DockIconTheme }> = {
  Transport: { icon: "icon-car-01-line", theme: "blue" },
  Meals: { icon: "icon-coffee-cup-line", theme: "orange" },
  Flights: { icon: "icon-plane-line", theme: "teal" },
  Software: { icon: "icon-laptop-line", theme: "purple" },
  Office: { icon: "icon-book-open-line", theme: "green" },
};
const categoryOptions = (Object.keys(categoryLook) as ExpenseCategory[]).map((category) => ({ value: category, label: category }));
type Expense = { id: string; merchant: string; category: ExpenseCategory; amount: number; at: Date };
// Alex's September, newest first.
const myExpenses: Expense[] = [
  { id: "x1", merchant: "Grab", category: "Transport", amount: 6.4, at: daysFromToday(0, 8, 50) },
  { id: "x2", merchant: "Phin & Co Lê Lợi", category: "Meals", amount: 18.6, at: daysFromToday(-1, 12, 30) },
  { id: "x3", merchant: "Figma", category: "Software", amount: 45, at: daysFromToday(-2, 9, 0) },
  { id: "x4", merchant: "Xanh SM", category: "Transport", amount: 5.2, at: daysFromToday(-3, 19, 10) },
  { id: "x5", merchant: "Pizza 4P's", category: "Meals", amount: 64, at: daysFromToday(-4, 12, 15) },
  { id: "x6", merchant: "Vietnam Airlines", category: "Flights", amount: 212.8, at: daysFromToday(-6, 15, 10) },
  { id: "x7", merchant: "Grab", category: "Transport", amount: 9.1, at: daysFromToday(-7, 7, 45) },
  { id: "x8", merchant: "Fahasa", category: "Office", amount: 23.5, at: daysFromToday(-9, 17, 20) },
  { id: "x9", merchant: "Adobe", category: "Software", amount: 59.99, at: daysFromToday(-11, 9, 0) },
  { id: "x10", merchant: "Highlands Coffee", category: "Meals", amount: 12.4, at: daysFromToday(-13, 15, 30) },
  { id: "x11", merchant: "Tiki", category: "Office", amount: 31.8, at: daysFromToday(-16, 10, 5) },
  { id: "x12", merchant: "Vietjet Air", category: "Flights", amount: 96.5, at: daysFromToday(-20, 20, 30) },
  { id: "x13", merchant: "Notion", category: "Software", amount: 10, at: daysFromToday(-27, 9, 0) },
];
const trips = [
  // After Alex's leave (Oct 12 – Oct 14), soonest first.
  { id: "tr1", name: "Lumen Bank workshop", city: "Singapore", project: "lumen-banking", start: daysFromToday(19), end: daysFromToday(21) },
  { id: "tr2", name: "Phin & Co store visits", city: "Hanoi", project: "phin-loyalty", start: daysFromToday(26), end: daysFromToday(27) },
  { id: "tr3", name: "Book Fair wrap-up", city: "Hanoi", project: "bookfair-site", start: daysFromToday(-13), end: daysFromToday(-12) },
];
// The Design team's expenses that wait for Alex, their approver.
const waiting: { id: string; person: PersonId; what: string; amount: number }[] = [
  { id: "ap1", person: "chi", what: "Usability lab snacks", amount: 32 },
  { id: "ap2", person: "emi", what: "Font licence", amount: 120 },
  { id: "ap3", person: "ava", what: "Taxi to Lumen Bank", amount: 14.2 },
];
const expenseTabs: BottomNavigationItem[] = [
  { id: "expenses", label: "Expenses", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
  { id: "trips", label: "Trips", icon: "icon-plane-line", selectedIcon: "icon-plane-solid" },
  { id: "approvals", label: "Approvals", icon: "icon-receipt-check-line", selectedIcon: "icon-receipt-check-solid" },
];
type ExpenseDraft = { merchant: string; amount: number | null; category: string };

/** The studio's expenses app: New expense, its one create action, is the last cell of the Default tab bar. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function ActionInTheBar({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const shellRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("expenses");
  const [list, setList] = useState(myExpenses);
  const [creating, setCreating] = useState(false);
  const total = list.reduce((sum, expense) => sum + expense.amount, 0);
  // Tapping the current destination again scrolls it back to the top; another destination opens at its top. What
  // scrolls is the scroller passed as scrollRef, or the page itself in your app.
  const open = (id: string) => {
    const behavior = id === tab ? "smooth" : "auto";
    if (scrollRef === "window") shellRef.current?.scrollIntoView({ behavior });
    else scrollRef.current?.scrollTo({ top: 0, behavior });
    setTab(id);
  };
  // Add expense always submits: a missing value gets its error and focus, the sheet stays open.
  const form = useFormState<ExpenseDraft>({
    initialValues: { merchant: "", amount: null, category: "Meals" },
    validate: (v) => ({
      merchant: v.merchant.trim() ? undefined : "Enter where you paid, like Grab",
      amount: v.amount ? undefined : "Enter the amount you paid",
    }),
    onSubmit: (v, { reset }) => {
      const expense: Expense = { id: `new-${Date.now()}`, merchant: v.merchant.trim(), category: v.category as ExpenseCategory, amount: v.amount!, at: TODAY };
      setList((all) => [expense, ...all]);
      setCreating(false);
      reset();
      // The new expense lands on top of Expenses, whichever destination was open.
      open("expenses");
      toast({ title: "Expense added", action: { label: "Undo", onClick: () => setList((all) => all.filter((item) => item.id !== expense.id)) } });
    },
  });
  const start = () => { form.reset(); setCreating(true); };
  const title = expenseTabs.find((item) => item.id === tab)!.label;
  return (
    <>
      <AppShell ref={shellRef}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title={title} largeTitle={title} />}
        // Default bar: the action is one more cell after the destinations, a 48px Primary button that opens a task.
        bottomNavigation={<BottomNavigation items={expenseTabs} value={tab} onValueChange={open}
          action={{ icon: "icon-plus-line", label: "New expense", onClick: start }} />}>
        {tab === "expenses" ? (
          <Stack gap="md">
            <Metric size="xl" label="September" value={formatMoney(total, true)} icon="icon-receipt-line" iconTheme="blue" iconBackground="solid" />
            <List aria-label="Expenses">
              {list.map((expense) => (
                <ListItem key={expense.id} title={expense.merchant} caption={`${expense.category} · ${formatRelative(expense.at)}`}
                  leading={<DockIcon icon={categoryLook[expense.category].icon} theme={categoryLook[expense.category].theme} background="subtle" size="md" />}
                  trailing={<Text as="span" textStyle="Body/Base/Medium" wrap={false} tabularNumbers>{formatMoney(expense.amount, true)}</Text>} />
              ))}
            </List>
          </Stack>
        ) : null}
        {tab === "trips" ? (
          <List aria-label="Trips">
            {trips.map((trip) => {
              const project = projectById(trip.project);
              return <ListItem key={trip.id} title={trip.name} caption={`${trip.city} · ${formatRange(trip.start, trip.end)}`} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="md" />} />;
            })}
          </List>
        ) : null}
        {tab === "approvals" ? (
          <List aria-label="Waiting for your approval">
            {waiting.map((item) => (
              <ListItem key={item.id} title={people[item.person].name} caption={item.what} leading={<Avatar size="md" {...avatarOf(people[item.person])} />}
                trailing={<Text as="span" textStyle="Body/Base/Medium" wrap={false} tabularNumbers>{formatMoney(item.amount, true)}</Text>} />
            ))}
          </List>
        ) : null}
      </AppShell>
      {/* A form sheet: Enter in a field or Add expense submits it. */}
      <BottomSheet inline open={creating} onOpenChange={setCreating} title="New expense" onSubmit={form.handleSubmit}
        primaryAction={{ label: "Add expense" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Merchant" placeholder="e.g. Grab" {...form.field("merchant")} data-autofocus="" />
        {/* min 0.01 keeps the cents a person types; the steppers still move by $1. */}
        <NumberField label="Amount (USD)" min={0.01} step={1} {...form.numberField("amount")} />
        <SelectField label="Category" options={categoryOptions} {...form.selectField("category")} />
      </BottomSheet>
    </>
  );
}
