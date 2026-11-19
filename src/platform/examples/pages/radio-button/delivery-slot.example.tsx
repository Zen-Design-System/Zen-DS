import { useId, useRef, useState, type RefObject } from "react";
import { ActionBar, AppShell, BottomSheet, DockIcon, FormFieldset, Icon, List, ListItem, RadioButton, Stack, Text, TopNavigation, useToast } from "@zen-ds/react";
import { daysFromToday, formatRelative } from "../../data";

const deliverySlots = [
  { id: "thu-am", label: "Thursday, Oct 1 · Morning", caption: "8:00 am – 12:00 pm · Free" },
  { id: "thu-pm", label: "Thursday, Oct 1 · Afternoon", caption: "1:00 pm – 5:00 pm · Free" },
  { id: "fri-am", label: "Friday, Oct 2 · Morning", caption: "Fully booked", disabled: true },
  { id: "fri-pm", label: "Friday, Oct 2 · Afternoon", caption: "1:00 pm – 5:00 pm · Free" },
  { id: "sat-am", label: "Saturday, Oct 3 · Morning", caption: "8:00 am – 12:00 pm · $15.00 weekend fee" },
];

/** A Mekong Freight delivery on a phone: the slot screen with full-width rows, and the shipment it belongs to. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function DeliverySlot({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const name = useId();
  const [slot, setSlot] = useState("thu-am");
  // The demo opens on the slot screen; Back shows the shipment it belongs to.
  const [draft, setDraft] = useState<string | null>(slot);
  const [asking, setAsking] = useState(false);
  // Focus follows the screen: the slot screen focuses its title, Back returns to the Delivery slot row.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const current = deliverySlots.find((item) => item.id === slot) ?? deliverySlots[0];
  const open = () => {
    setDraft(slot);
    setTimeout(() => titleRef.current?.focus());
  };
  const leave = () => {
    setAsking(false);
    setDraft(null);
    setTimeout(() => rowRef.current?.focus());
  };
  // Back with a new, unconfirmed slot asks first instead of dropping it.
  const back = () => (draft !== slot ? setAsking(true) : leave());
  const confirm = () => {
    if (draft && draft !== slot) toast({ title: "Delivery slot updated" });
    if (draft) setSlot(draft);
    leave();
  };

  if (draft !== null) {
    return (
      // One key per screen: each screen opens at the top.
      <AppShell key="slot"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>Delivery slot</span>}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
        actionBar={<ActionBar primaryAction={{ label: "Confirm slot", onClick: confirm }} />}>
        <Stack gap="md">
          <Text tone="base">Someone at the studio signs for the 2 pallets when they arrive.</Text>
          <FormFieldset kind="radio" legend="Delivery slot" hideLegend>
            {/* The rows fill the width (a Stack stretches them), so the right-hand marks line up and the whole row is the tap target. */}
            <Stack gap="sm">
              {deliverySlots.map((item) => (
                <RadioButton key={item.id} name={name} value={item.id} radioSide="right" label={item.label} caption={item.caption} disabled={item.disabled}
                  checked={draft === item.id} onCheckedChange={(checked) => { if (checked) setDraft(item.id); }} bold />
              ))}
            </Stack>
          </FormFieldset>
        </Stack>
        <BottomSheet inline open={asking} onOpenChange={setAsking} title="Discard the new slot?"
          primaryAction={{ label: "Discard slot", level: "danger", onClick: leave }} secondaryAction={{ label: "Keep choosing" }}>
          <Text tone="base">{current.label} stays booked for MF-20931.</Text>
        </BottomSheet>
      </AppShell>
    );
  }
  return (
    // A tab root: the large title folds into the bar as the shipment scrolls under it.
    <AppShell key="root" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Delivery" largeTitle="Delivery" />}>
      <List aria-label="Shipment MF-20931">
        <ListItem title="In transit to Ho Chi Minh City" caption={`MF-20931 · Left Hai Phong ${formatRelative(daysFromToday(-1, 18, 10)).toLowerCase()}`}
          leading={<DockIcon icon="icon-truck-line" theme="teal" background="subtle" size="medium" />} />
        <ListItem title="Deliver to" caption="Đìzai Studio, 12 Ton Duc Thang, District 1"
          leading={<DockIcon icon="icon-building-01-line" theme="neutral" background="subtle" size="medium" />} />
        <ListItem ref={rowRef} tabIndex={-1} title="Delivery slot" caption={`${current.label} · ${current.caption.split(" · ")[0]}`} onClick={open}
          leading={<DockIcon icon="icon-calendar-line" theme="blue" background="subtle" size="medium" />}
          trailing={<Icon name="icon-chevron-right-line-small" size="base" decorative />} />
      </List>
    </AppShell>
  );
}
