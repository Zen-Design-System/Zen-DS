import { Fragment, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Avatar, BottomNavigation, Box, Heading, IconButton, Image, List, ListItem, Stack, Text, TopNavigation, plural, useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, formatDate, formatRange, initials, people, photos, studio, type Person, type Photo } from "../../data";

/** Photo when the person has one, else initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
/** A row caption of whole values: it wraps between values, never inside a key or a name; each "· " stays with the value it introduces, so no line ends on a dot. */
const wholeValues = (...values: (string | false)[]) => values.filter((value): value is string => Boolean(value)).map((value, index) => (
  <Fragment key={`${index}:${value}`}>{index ? " " : null}{whole(`${index ? "· " : ""}${value}`)}</Fragment>
));
/** A run of words that never breaks: its spaces are no-break spaces. */
const whole = (text: string) => text.replace(/ /g, " ");

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "events", label: "Events", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** The bottom bar of a root screen, floating over the photos: the other roots are not drawn here, so a toast says so and
 *  the bar keeps this root. */
function PhoneRoots({ value }: { value: string }) {
  const { toast } = useToast();
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the layout." });
  return (
    <BottomNavigation type="floating-glass" aria-label={studio.name} showLabels={false} items={phoneRoots} value={value}
      onValueChange={(id) => { if (id !== value) notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />
  );
}

// The Events tab of the Đìzai app. Each photo in the feed is a frame its layers pin to: Save to the top-right corner and
// the caption bar to the bottom edge. An event opens on a media screen: its photo is background media under the whole
// screen, and the details sit in a sheet docked to the bottom.
type StudioEvent = { id: string; name: string; start: Date; end?: Date; going: number; photo: Photo; organiser: Person; about: string; join: string };
const studioEvents: StudioEvent[] = [
  { id: "hoi-an", name: "Sketch weekend in Hội An", start: daysFromToday(10), end: daysFromToday(11), going: 9, photo: photos.site[2], organiser: people.gia,
    about: "Two slow days in the old town: sketch the lanes and the river at dawn, then share the pages over coffee.", join: "Join the weekend" },
  { id: "vung-tau", name: "Coast ride to Vũng Tàu", start: daysFromToday(24), going: 14, photo: photos.feed[6], organiser: people.duy,
    about: "An early start on the coast road, breakfast by the sea and back in the city by lunch. The studio brings the bikes and helmets.", join: "Join the ride" },
  { id: "da-lat", name: "Studio retreat in Đà Lạt", start: daysFromToday(37), end: daysFromToday(39), going: 31, photo: photos.mountainRoad, organiser: people.minhAnh,
    about: "Three days in the pine hills with the whole studio: the 2027 roadmap, a design jam and the night market.", join: "Join the retreat" },
  { id: "year-end", name: "Year-end party by the river", start: daysFromToday(79), going: 44, photo: photos.site[4], organiser: people.minhAnh,
    about: "Dinner on the riverside with the whole studio and our clients: the year in pictures, the team awards and live music.", join: "Join the party" },
];
const eventDates = (event: StudioEvent) => (event.end ? formatRange(event.start, event.end) : formatDate(event.start));
/** Adds or removes one id, so a toast's Undo puts back exactly the state before the press. */
const withId = (list: string[], id: string, on: boolean) => (on ? [...list.filter((item) => item !== id), id] : list.filter((item) => item !== id));

// scrollRef: what scrolls the feed, so the large title folds into the bar as it scrolls. "window" in your app.
export default function StudioEvents({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [fromId, setFromId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [going, setGoing] = useState<string[]>([]);
  // Focus follows the screen: an event focuses its title, Back returns to the event it came from.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const back = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  const save = (event: StudioEvent) => {
    const next = !saved.includes(event.id);
    setSaved((list) => withId(list, event.id, next));
    toast({ title: next ? "Event saved" : "Event removed from saved", children: event.name, action: { label: "Undo", onClick: () => setSaved((list) => withId(list, event.id, !next)) } });
  };
  const rsvp = (event: StudioEvent, next: boolean) => {
    setGoing((list) => withId(list, event.id, next));
    toast({ title: next ? "RSVP sent" : "RSVP cancelled", children: event.name, action: { label: "Undo", onClick: () => setGoing((list) => withId(list, event.id, !next)) } });
  };
  const event = studioEvents.find((item) => item.id === openId);

  // Each screen is its own AppShell (key).
  if (event) {
    const isSaved = saved.includes(event.id);
    const isGoing = going.includes(event.id);
    return (
      // The AppShell's Media pattern (Figma Top=Media, Bottom=Actions): the photo is the backdrop behind the top of the
      // screen, the overlay bar keeps Back and Save readable on it, and the details rise over it as the shell's sheet,
      // only its top corners rounded. The RSVP sits in the Action bar, clear of the home indicator; its one Button changes
      // its label, so focus stays on it after each press.
      <AppShell key={event.id} mobileTop="media"
        backdrop={<Image src={event.photo.src} alt={event.photo.alt} radius="none" loading="eager" />}
        topNavigation={<TopNavigation aria-label={event.name}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
          trailing={[{ icon: isSaved ? "icon-bookmark-solid" : "icon-bookmark-line", label: isSaved ? "Remove from saved" : "Save event", onClick: () => save(event) }]} />}
        actionBar={<ActionBar
          summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{isGoing ? `You and ${plural(event.going, "other")} are going` : `${plural(event.going, "person", "people")} going`}</Text>}
          primaryAction={isGoing ? { label: "Cancel RSVP", level: "tertiary", onClick: () => rsvp(event, false) } : { label: event.join, onClick: () => rsvp(event, true) }} />}
      >
        <Stack gap="md">
          <Stack gap="xs">
            {/* The bar carries no title over the photo, so this heading is the screen's h1. */}
            <Heading ref={titleRef} level={1} tabIndex={-1}>{event.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{eventDates(event)}</Text>
          </Stack>
          <Text>{event.about}</Text>
          <List aria-label="Organiser">
            <ListItem title={event.organiser.name} caption={`Organiser · ${event.organiser.role}`}
              leading={<Avatar size="md" {...avatarOf(event.organiser)} />} />
          </List>
        </Stack>
      </AppShell>
    );
  }

  return (
    // The tab root: the large title folds as the feed scrolls under the bar; the floating glass bar rides over the photos.
    <AppShell key="events"
      topNavigation={<TopNavigation title="Events" largeTitle="Events" scrollRef={scrollRef} />}
      bottomNavigation={<PhoneRoots value="events" />}
    >
      <Stack as="ul" gap="md" aria-label="Upcoming events">
        {studioEvents.map((item) => {
          const isSaved = saved.includes(item.id);
          return (
            // The frame owns the radius and clips the photo to it (Clip content), so the photo takes none.
            <Box as="li" key={item.id} radius="3xl" clip>
              <Image src={item.photo.src} alt={item.photo.alt} ratio="4:3" radius="none" loading="eager" />
              {/* Right / Top, sm in from both edges. */}
              <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">
                <IconButton appearance="overlay" level="black-overlay" icon={isSaved ? "icon-bookmark-solid" : "icon-bookmark-line"}
                  aria-label={`Save ${item.name}`} aria-pressed={isSaved} onClick={() => save(item)} />
              </Box>
              {/* Left & right / Bottom: the bar stretches between its sm insets at any width. Its radius (lg) plus the
                  inset is the frame's 3xl, so the corners stay concentric. The whole row opens the event and pads 12px above
                  and below: the bar pads md sideways and 2xs above and below, so the row's fill (its height, 12px past it
                  sideways) sits 4px inside the bar on every side (lg 16px = Base 12px + 4px). */}
              <Box position="absolute" constraintX="left-right" constraintY="bottom" insetLeft="sm" insetRight="sm" insetBottom="sm"
                surface="surface" radius="lg" paddingX="md" paddingY="2xs">
                <ListItem as="div" ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
                  title={item.name} caption={wholeValues(eventDates(item), `${item.going + (going.includes(item.id) ? 1 : 0)} going`)}
                  leading={<Avatar size="md" {...avatarOf(item.organiser)} />}
                  onClick={() => open(item.id)} />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </AppShell>
  );
}
