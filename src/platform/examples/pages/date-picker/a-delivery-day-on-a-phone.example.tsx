import { useState, type RefObject } from "react";
import { AppShell, Button, DateField, DatePickerSheet, DockIcon, Form, FormActions, Icon, List, ListBox, ListItem, Stack, TopNavigation, useToast } from "@zen-ds/react";
import { TODAY, daysFromToday, formatDate } from "../../data";

/** "10/05/2026", the DateField's typed format, → a Date; null while the text is incomplete or not a real day. */
function parseTyped(text: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [month, day, year] = [Number(match[1]) - 1, Number(match[2]), Number(match[3])];
  const date = new Date(year, month, day);
  return date.getMonth() === month && date.getDate() === day ? date : null;
}

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function DeliveryDay({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [delivery, setDelivery] = useState<Date>(daysFromToday(3));
  const [picking, setPicking] = useState(false);
  // The header's edit action trades the calendar for typing the date.
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const typedDate = parseTyped(typed);
  const move = (date: Date) => { setDelivery(date); setTyping(false); toast({ type: "positive", title: "Delivery moved", children: formatDate(date) }); };
  return (
    <>
      <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title="Order 4821" />}>
        <Stack gap="lg">
          <ListBox>
            <List aria-label="Delivery">
              <ListItem title="Delivery day" caption={formatDate(delivery)} leading={<DockIcon icon="icon-package-line" size="md" background="subtle" />}
                trailing={<Icon name="icon-chevron-right-line-small" decorative />} onClick={() => setPicking(true)} />
            </List>
          </ListBox>
          {typing ? (
            <Form onSubmit={() => { if (typedDate) move(typedDate); }} gap="md">
              <DateField size="lg" label="Delivery day" today={TODAY} minDate={TODAY} value={typed} onValueChange={setTyped} autoFocus
                error={typed && !typedDate ? "Type the day as MM/DD/YYYY." : undefined} />
              <FormActions>
                <Button level="tertiary" onClick={() => setTyping(false)}>Cancel</Button>
                <Button level="primary" type="submit" disabled={!typedDate}>Move delivery</Button>
              </FormActions>
            </Form>
          ) : null}
        </Stack>
      </AppShell>
      {/* header="selection": the picked day leads the sheet; the pencil (onEdit) trades the calendar for typing. */}
      <DatePickerSheet open={picking} onOpenChange={setPicking} header="selection" title="Select a date" today={TODAY} minDate={TODAY}
        value={delivery} onApply={(date) => { if (date) move(date); }} onEdit={() => { setPicking(false); setTyped(""); setTyping(true); }} />
    </>
  );
}
