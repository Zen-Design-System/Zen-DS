import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Badge, BottomNavigation, Box, DateField, Dialog, DockIcon, Form, FormFieldset, Heading, InputField, List, ListBox, ListItem, NumberField, RadioButton,
  SelectField, Stack, Text, TextAreaField, TopNavigation, plural, useFormState, useToast, type BadgeTheme, type BottomNavigationItem,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDay, formatMoney } from "../../data";

/** A network round trip in the demo. */
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
/** "10/14/2026" (the DateField's typed format) → a Date, or null while it is incomplete or not a real day. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const d = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return d && d.getDate() === Number(m?.[2]) ? d : null;
};
const startOfToday = daysFromToday(0, 0, 0);

// The Mekong Freight app, signed in as Phin & Co's roastery, which ships beans to its stores.
type ShipmentStatus = "Booked" | "In transit" | "Customs hold" | "Delivered";
const shipmentTheme: Record<ShipmentStatus, BadgeTheme> = { Booked: "neutral", "In transit": "blue", "Customs hold": "orange", Delivered: "green" };
type Shipment = { id: string; to: string; parcels: number; status: ShipmentStatus; day: Date };
const stores = ["Phin Da Nang", "Phin Hanoi Old Quarter", "Phin Can Tho", "Phin Nha Trang", "Phin Hue", "Phin Vientiane"];
const shipments: Shipment[] = ([
  ["48231", "Phin Da Nang", 3, "Booked", 1], ["48220", "Phin Hanoi Old Quarter", 6, "In transit", 0], ["48214", "Phin Vientiane", 2, "Customs hold", -1],
  ["48207", "Phin Can Tho", 4, "In transit", -1], ["48195", "Phin Nha Trang", 2, "Delivered", -2], ["48188", "Phin Hue", 3, "Delivered", -3],
  ["48172", "Phin Da Nang", 5, "Delivered", -5], ["48166", "Phin Hanoi Old Quarter", 8, "Delivered", -6], ["48151", "Phin Vientiane", 2, "Delivered", -8],
  ["48143", "Phin Can Tho", 3, "Delivered", -9], ["48130", "Phin Nha Trang", 1, "Delivered", -12], ["48122", "Phin Hue", 4, "Delivered", -13],
  ["48109", "Phin Da Nang", 6, "Delivered", -15], ["48097", "Phin Hanoi Old Quarter", 7, "Delivered", -16],
] as const).map(([code, to, parcels, status, days]) => ({ id: `MKF-${code}`, to, parcels, status, day: daysFromToday(days) }));
type PickupValues = { to: string; day: string; window: "" | "morning" | "afternoon"; parcels: number | null; note: string };
/** The store the last pickup went to starts selected: most pickups repeat it. */
const blankPickup: PickupValues = { to: "Phin Da Nang", day: "", window: "", parcels: 1, note: "" };
/** $4 for the first parcel, $1.50 for each one after it. */
const pickupFee = (parcels: number) => 4 + 1.5 * Math.max(parcels - 1, 0);
/** The Mekong Freight app's roots. */
const mekongRoots: BottomNavigationItem[] = [
  { id: "shipments", label: "Shipments", icon: "icon-package-line", selectedIcon: "icon-package-solid" },
  { id: "track", label: "Track", icon: "icon-marker-pin-01-line", selectedIcon: "icon-marker-pin-01-solid" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line", selectedIcon: "icon-receipt-solid" },
  { id: "account", label: "Account", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** The tab bar on the Shipments root: the other roots are not drawn here, so a toast says so and the bar keeps Shipments. */
function MekongRoots() {
  const { toast } = useToast();
  return (
    <BottomNavigation aria-label="Mekong Freight" showLabels items={mekongRoots} value="shipments"
      onValueChange={(id) => { if (id !== "shipments") toast({ title: `${mekongRoots.find((item) => item.id === id)?.label} isn't part of this example`, children: "This screen shows the form." }); }} />
  );
}

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhonePickup({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const formId = useId();
  const wayId = useId();
  const deliveredId = useId();
  const [list, setList] = useState(shipments);
  // The example opens on the form, the screen it teaches; Close leads to the shipments, New pickup back here.
  const [creating, setCreating] = useState(true);
  const [confirming, setConfirming] = useState(false);
  // Focus follows the screen: the form focuses its title, the shipments the group a booked pickup joins.
  const titleRef = useRef<HTMLSpanElement>(null);
  const wayRef = useRef<HTMLHeadingElement>(null);
  const showShipments = () => {
    setCreating(false);
    setTimeout(() => wayRef.current?.focus());
  };
  const form = useFormState<PickupValues>({
    initialValues: blankPickup,
    validate: (values) => {
      const day = parseDay(values.day);
      return {
        to: values.to ? undefined : "Choose the store it goes to",
        day: !day ? "Enter the pickup day, like 10/02/2026" : day < startOfToday ? "Choose today or a later day" : day.getDay() === 0 ? "Drivers don't pick up on Sundays" : undefined,
        window: values.window ? undefined : "Choose a pickup time",
        parcels: values.parcels && values.parcels >= 1 && values.parcels <= 20 ? undefined : "Book 1 to 20 parcels",
      };
    },
    onSubmit: async (values, { reset }) => {
      await wait(800);
      setList((rows) => [{ id: `MKF-${48232 + rows.length - shipments.length}`, to: values.to, parcels: values.parcels ?? 1, status: "Booked", day: parseDay(values.day)! }, ...rows]);
      reset();
      // Back on the shipments the new pickup is the first row of On the way.
      showShipments();
      toast({ type: "positive", title: "Pickup booked" });
    },
  });
  const leave = () => { setConfirming(false); form.reset(); showShipments(); };
  // Close asks before it drops what was entered.
  const close = () => (form.isDirty ? setConfirming(true) : leave());
  const newPickup = () => {
    setCreating(true);
    setTimeout(() => titleRef.current?.focus());
  };
  const parcels = form.values.parcels ?? 0;

  // Each screen is its own AppShell (key).
  if (!creating) {
    const groups = [
      { id: wayId, title: "On the way", rows: list.filter((shipment) => shipment.status !== "Delivered") },
      { id: deliveredId, title: "Delivered", rows: list.filter((shipment) => shipment.status === "Delivered") },
    ].filter((group) => group.rows.length);
    return (
      // A tab root of the Mekong Freight app: the large title folds as the shipments scroll under the bar, New pickup is
      // its one action, and the tab bar holds the app's roots. The tab bar casts a shadow, so the lists take the same
      // Shadow elevation.
      <AppShell key="root"
        topNavigation={<TopNavigation title="Shipments" largeTitle="Shipments" largeTitleSubheading="Phin roastery · Thu Duc" scrollRef={scrollRef}
          trailing={[{ icon: "icon-plus-line", label: "New pickup", onClick: newPickup }]} />}
        bottomNavigation={<MekongRoots />}
      >
        {groups.map((group) => (
          // The shipments only show their status (Interactive=No rows); the group title lines up with the row text.
          <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
            <Box paddingX="lg">
              <Heading ref={group.id === wayId ? wayRef : undefined} tabIndex={-1} level={2} id={group.id} textStyle="Body/Small/Bold" tone="light">{group.title}</Heading>
            </Box>
            <ListBox theme="shadow">
              <List aria-labelledby={group.id}>
                {group.rows.map((shipment) => (
                  <ListItem key={shipment.id} title={`To ${shipment.to}`} caption={`${shipment.id} · ${plural(shipment.parcels, "parcel")} · ${formatDay(shipment.day)}`}
                    leading={<DockIcon icon="icon-package-line" theme="neutral" background="subtle" />}
                    trailing={<Badge theme={shipmentTheme[shipment.status]} background="subtle">{shipment.status}</Badge>} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }
  return (
    // A task screen: the compact bar with Close (it asks before dropping what was entered) and the booking's one action
    // in the Action bar the shell pins to the bottom (Figma Bottom=Actions), no tab bar.
    <AppShell key="new"
      topNavigation={<TopNavigation type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>New pickup</span>} scrollRef={scrollRef}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
      // The bar sits outside the form, so its submit names the form by id. The summary follows the parcel count.
      actionBar={<ActionBar
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{`${plural(parcels, "parcel")} · ${formatMoney(pickupFee(parcels), true)}`}</Text>}
        primaryAction={{ label: form.isSubmitting ? "Booking…" : "Book pickup", type: "submit", form: formId }} />}
    >
      {/* Stacked fields are md apart, every one of them: the day and its time slot read as neighbours. Most fields are
          required, so only the optional note is marked. The Body pads the screen, so the form needs no padding. */}
      <Form id={formId} form={form} gap="md" aria-label="New pickup">
        <InputField label="Pick up from" readOnly value="Phin roastery · 12 Le Van Viet, Thu Duc" />
        <SelectField label="Deliver to" helpText="Your last pickup went here" options={stores.map((store) => ({ value: store, label: store }))} {...form.selectField("to")} />
        <DateField label="Pickup day" today={TODAY} minDate={startOfToday} {...form.dateField("day")} />
        <FormFieldset kind="radio" legend="Pickup time" error={form.fieldError("window")}>
          <Stack gap="sm" direction="row">
            <RadioButton label="Morning" caption="8:00 am – 12:00 pm" {...form.radioField("window", "morning")} />
            <RadioButton label="Afternoon" caption="1:00 pm – 5:00 pm" {...form.radioField("window", "afternoon")} />
          </Stack>
        </FormFieldset>
        <NumberField label="Parcels" min={1} max={20} helpText="Up to 25 kg each" align="center" {...form.numberField("parcels")} />
        <TextAreaField label="Note for the driver" labelOptional rows={3} placeholder="Ring the bell at the side gate" {...form.field("note")} />
      </Form>
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard this pickup?"
        description="What you entered is lost." actionsDirection="vertical"
        primaryAction={{ label: "Discard pickup", level: "danger", onClick: leave }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </AppShell>
  );
}
