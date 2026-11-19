import { useState, type RefObject } from "react";
import { ActionBar, AppShell, DateField, DatePickerSheet, DockIcon, Icon, List, ListBox, ListItem, Stack, Text, TopNavigation, plural, useToast, type DatePickerRange } from "@zen-ds/react";
import { TODAY, formatMoney, formatRange } from "../../data";

const NIGHTLY = 86.5;
const nightsOf = (range: DatePickerRange | null) => (range?.start && range.end ? Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) : 0);

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function StayOnPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [stay, setStay] = useState<DatePickerRange | null>(null);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<DatePickerRange | null>(null);
  const [pickup, setPickup] = useState("");
  const nights = nightsOf(stay);
  const draftNights = nightsOf(draft);
  // Figma Footer-Actions Content: the price in Body/Extra/Bold over the rating line, or a hint before a range is picked.
  const summary = (count: number) => (
    <>
      <Text as="span" textStyle="Body/Extra/Bold" tone={count ? "strongest" : "light"}>{count ? formatMoney(count * NIGHTLY) : "Add dates for prices"}</Text>
      <Stack direction="row" gap="3xs" align="center">
        <Icon name="icon-star-01-solid" size="sm" decorative />
        <Text as="span" textStyle="Body/Small/Bold" tone="strongest">4.9</Text>
        {count ? <Text as="span" textStyle="Body/Small/Regular" tone="light">· {plural(count, "night")}</Text> : null}
      </Stack>
    </>
  );
  return (
    <>
      <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title="Saola Lodge" />}
        actionBar={<ActionBar summary={summary(nights)}
          primaryAction={{ label: "Reserve", disabled: !nights, onClick: () => { if (stay?.start && stay.end) toast({ type: "positive", title: "Stay reserved", children: `${formatRange(stay.start, stay.end)} · ${plural(nights, "night")}` }); } }} />}>
        <Stack gap="lg">
          <ListBox>
            <List aria-label="Your stay">
              <ListItem title="Dates" caption={stay?.start && stay.end ? `${formatRange(stay.start, stay.end)} · ${plural(nights, "night")}` : "Add your check-in and check-out"}
                leading={<DockIcon icon="icon-calendar-line" size="md" background="subtle" />} trailing={<Icon name="icon-chevron-right-line-small" decorative />} onClick={() => { setDraft(stay); setPicking(true); }} />
            </List>
          </ListBox>
          {/* On a phone a DateField opens the same sheet (Variant=Single) instead of the desktop popover. */}
          <DateField size="lg" label="Airport pickup" today={TODAY} minDate={TODAY} value={pickup} onValueChange={setPickup} helpText="Optional. We meet you at arrivals." />
        </Stack>
      </AppShell>
      {/* header="selection": the picked nights and Clear dates lead the sheet; the footer prices the nights as you pick. */}
      <DatePickerSheet open={picking} onOpenChange={setPicking} selectionMode="range" header="selection" title="Your stay" today={TODAY} minDate={TODAY} monthCount={6}
        range={stay} onRangeChange={setDraft} onClear={() => setDraft(null)} onApply={(_, range) => setStay(range)} summary={summary(draftNights)} />
    </>
  );
}
