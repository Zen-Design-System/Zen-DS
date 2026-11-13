import { useState, type RefObject } from "react";
import { AppShell, BottomSheet, Heading, InputField, List, ListItem, Stack, Text, TopNavigation } from "@zen-ds/react";

type Chat = [name: string, preview: string, time: string];
const chats: Chat[] = [
  ["Design team", "Chi: Standup moved to 10:30", "9:41 am"], ["Ava Chen", "Did you get the brand files?", "9:12 am"], ["Bao Nguyen", "Merged the token PR", "Yesterday"],
  ["Duy Le", "Can you review the icons?", "Mon"], ["Emi Sato", "Lunch at 12?", "Sun"], ["Finn Walker", "Slides are in the shared folder", "Sat"],
  ["Gia Pham", "Can we move the review?", "Fri"], ["Hana Kim", "Invoice sent", "Thu"], ["Ivy Tran", "See you at the launch", "Wed"], ["Khoa Vo", "The build is green", "Tue"],
  ["Linh Do", "Can you share the deck?", "Mon"], ["Minh Ho", "Booked the room", "Sep 12"], ["Nam Bui", "Thanks for the notes", "Sep 11"], ["Oanh Ly", "Photos from the event", "Sep 10"],
];

/** Master screen on a phone (a tab root): the TopNavigation large title is the h1 (Heading/1); once collapsed the
 *  Body/Extra/Bold bar title is the h1, so the screen has exactly one h1 before and after scrolling. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function MasterScreen({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  // New message opens a compose sheet; the new chat lands on top of All chats. TopNavigation's scrollRef (the screen's
  // scroller) folds the large title into the bar as the list scrolls.
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState("");
  const [started, setStarted] = useState<string[]>([]);
  return (
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Chats" largeTitle="Chats" trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: () => setComposing(true) }]} />}>
      {/* Static rows (no row opens a chat in this demo) sit in the screen margin; each kicker sits xs above its list. */}
      <Stack as="section" gap="xs">
        <Heading level={2} textStyle="Body/Small/Bold" tone="light">Pinned</Heading>
        <List aria-label="Pinned chats">
          <ListItem title={chats[0][0]} caption={chats[0][1]} trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{chats[0][2]}</Text>} />
        </List>
      </Stack>
      <Stack as="section" gap="xs">
        <Heading level={2} textStyle="Body/Small/Bold" tone="light">All chats</Heading>
        <List aria-label="All chats">
          {[...started.map((name): Chat => [name, "You: Hi!", "Now"]), ...chats.slice(1)].map(([name, preview, time]) => (
            <ListItem key={name} title={name} caption={preview} trailing={<Text as="span" textStyle="Caption/Regular" tone="light">{time}</Text>} />
          ))}
        </List>
      </Stack>
      <BottomSheet inline open={composing} onOpenChange={setComposing} title="New message"
        primaryAction={{ label: "Start chat", disabled: !to.trim() || started.includes(to.trim()), onClick: () => { setStarted((list) => [to.trim(), ...list]); setTo(""); setComposing(false); } }}
        secondaryAction={{ label: "Cancel" }}>
        <InputField label="To" placeholder="Name or email" value={to} onValueChange={setTo} data-autofocus="" />
      </BottomSheet>
    </AppShell>
  );
}
