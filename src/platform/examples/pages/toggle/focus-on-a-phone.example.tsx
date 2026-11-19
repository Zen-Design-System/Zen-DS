import { useId, useState, type RefObject } from "react";
import { AppShell, Avatar, Box, Button, Card, FormFieldset, Heading, IconButton, List, ListBox, ListItem, Stack, Text, Toggle, TopNavigation, plural, useToast, type AvatarSize } from "@zen-ds/react";
import { daysFromToday, formatTime, initials, people, type Person } from "../../data";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page).
 *  Beside a written name the Avatar is decorative (alt=""). */
function PersonAvatar({ person, size }: { person: Person; size: AvatarSize }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

/** People whose calls and messages still come through while Focus is on. */
const firstAllowed: Person[] = [people.duy, people.mai, people.hana];

// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function FocusMode({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const autoId = useId();
  const allowedId = useId();
  const [quiet, setQuiet] = useState(false);
  const [weeknights, setWeeknights] = useState(true);
  const [workshops, setWorkshops] = useState(false);
  const [allowed, setAllowed] = useState(firstAllowed);
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Toggle." });
  const remove = (person: Person) => {
    const index = allowed.indexOf(person);
    setAllowed((list) => list.filter((item) => item.id !== person.id));
    toast({ title: `${person.name} removed`, children: "Their calls and messages wait while Focus is on.",
      action: { label: "Undo", onClick: () => setAllowed((list) => [...list.slice(0, index), person, ...list.slice(index)]) } });
  };
  return (
    // A pushed screen of Settings: the compact bar with Back, no bottom bar, so the blocks are flat white on the grey
    // Canvas. One setting leads the screen, so it takes the XLarge switch (48px) with an icon in its dot; the caption
    // says what the switch does right now.
    <AppShell
      topNavigation={<TopNavigation type="compact-alt" title="Focus" scrollRef={scrollRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => notHere("Settings") }} />}
    >
      <Card theme="default">
        <FormFieldset kind="toggle" legend="Focus" hideLegend>
          <Toggle size="xl" icon="icon-moon-01-line" label="Do not disturb" bold
            caption={quiet
              ? `Calls and alerts stay silent until ${formatTime(daysFromToday(1, 7, 0))}, except from ${plural(allowed.length, "person", "people")}`
              : "Calls and alerts come through"}
            checked={quiet} onCheckedChange={setQuiet} />
        </FormFieldset>
      </Card>
      <Stack as="section" gap="xs" aria-labelledby={autoId}>
        <Box paddingX="lg"><Heading level={2} id={autoId} textStyle="Body/Small/Bold" tone="light">Turn on automatically</Heading></Box>
        <Card theme="default">
          <FormFieldset kind="toggle" legend="Turn on automatically" hideLegend>
            <Toggle size="lg" label="Weeknights" caption="10:00 pm – 7:00 am, Monday to Friday" checked={weeknights} onCheckedChange={setWeeknights} />
            <Toggle size="lg" label="During client workshops" caption="Calendar events with “Workshop” in the title" checked={workshops} onCheckedChange={setWorkshops} />
          </FormFieldset>
        </Card>
      </Stack>
      <Stack as="section" gap="xs" aria-labelledby={allowedId}>
        <Box paddingX="lg"><Heading level={2} id={allowedId} textStyle="Body/Small/Bold" tone="light">Allowed while on</Heading></Box>
        <ListBox footer={<Button level="tertiary" startIcon="icon-user-plus-line" onClick={() => toast({ title: "Add people", children: "Pick teammates whose calls still come through." })}>Add people</Button>}>
          {allowed.length ? (
            <List aria-labelledby={allowedId}>
              {allowed.map((person) => (
                <ListItem key={person.id} title={person.name} caption={person.role} leading={<PersonAvatar person={person} size="medium" />}
                  trailing={<IconButton appearance="flat" level="secondary" icon="icon-x-medium-line" aria-label={`Remove ${person.name}`} onClick={() => remove(person)} />} />
              ))}
            </List>
          ) : (
            <Text textStyle="Body/Small/Regular" tone="base">Nobody gets through while Focus is on.</Text>
          )}
        </ListBox>
      </Stack>
    </AppShell>
  );
}
