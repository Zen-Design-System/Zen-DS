import { useRef, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BadgeCounter, BottomNavigation, Heading, List, ListItem, Stack, Text, TopNavigation, VisuallyHidden, plural, useToast,
  type BottomNavigationItem,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, initials, people, projectById, studio, type PersonId } from "../../data";

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};
const minutesAgo = (m: number) => new Date(TODAY.getTime() - m * 60_000);

type Thread = { id: string; key: string; title: string; project: string; comments: { by: PersonId; text: string; at: Date }[]; unread: number };
const thread = (id: string, key: string, title: string, project: string, unread: number, comments: Thread["comments"]): Thread => ({ id, key, title, project, unread, comments });
const firstThreads: Thread[] = [
  thread("t1", "PHIN-214", "Design the points history screen", "phin-loyalty", 3, [
    { by: "chi", text: "Moved the store name above the amount, as Trang asked.", at: minutesAgo(0.5) },
    { by: "bao", text: "The API sends the store name already, no change on my side.", at: minutesAgo(9) },
    { by: "chi", text: "Can you check the empty month state before Friday?", at: minutesAgo(22) },
  ]),
  thread("t2", "PHIN-219", "Connect the rewards API to checkout", "phin-loyalty", 1, [{ by: "bao", text: "Ready for your review: points now apply before tax.", at: minutesAgo(13) }]),
  thread("t4", "LUM-088", "Run five usability sessions on transfers", "lumen-banking", 2, [
    { by: "ava", text: "Session 3 is booked for Thursday at 2:00 pm.", at: daysFromToday(0, 9, 50) },
    { by: "hana", text: "Lumen Bank wants two of the five on Android.", at: daysFromToday(0, 9, 12) },
  ]),
  thread("t5", "LUM-091", "Audit the account overview for WCAG 2.2", "lumen-banking", 1, [{ by: "finn", text: "The balance chart has no text alternative yet.", at: daysFromToday(-1, 17, 40) }]),
  thread("t8", "ZEN-405", "Write guidelines for the Metric card", "zen-ds", 0, [{ by: "chi", text: "First draft is in the doc, Do and Don't still missing.", at: daysFromToday(-1, 15, 5) }]),
  thread("t9", "MEK-031", "Map the customs hold states", "mekong-tracking", 0, [{ by: "duy", text: "On hold until Mekong Freight signs the change request.", at: daysFromToday(-1, 11, 30) }]),
  thread("t10", "SAO-004", "Moodboard for the outdoor range", "saola-brand", 2, [
    { by: "gia", text: "Added the river and forest boards.", at: daysFromToday(-2, 16, 20) },
    { by: "emi", text: "Motion references are in the second frame.", at: daysFromToday(-2, 14, 0) },
  ]),
  thread("t3", "PHIN-223", "Regression test for the Android build", "phin-loyalty", 0, [{ by: "em", text: "Build 1.4.2 passes on the Pixel 7 and the Galaxy A54.", at: daysFromToday(-2, 10, 15) }]),
  thread("t6", "LUM-095", "Spike: passkey sign-in on iOS", "lumen-banking", 0, [{ by: "finn", text: "Write-up is attached; passkeys work on iOS 17 and later.", at: daysFromToday(-3, 18, 0) }]),
  thread("t7", "ZEN-402", "Add Disabled back to Input and Search", "zen-ds", 0, [{ by: "bao", text: "Merged, with the Figma states for Field-Only.", at: daysFromToday(-3, 12, 45) }]),
  thread("t13", "PHIN-208", "Points balance widget", "phin-loyalty", 0, [{ by: "chi", text: "Signed off by Trang Le.", at: daysFromToday(-4, 15, 30) }]),
  thread("t14", "MEK-027", "Driver app sign-in", "mekong-tracking", 0, [{ by: "khoa", text: "SMS codes arrive in under 10 seconds now.", at: daysFromToday(-5, 10, 10) }]),
  thread("t15", "SAO-002", "Brand refresh kickoff agenda", "saola-brand", 0, [{ by: "linh", text: "Agenda sent to Saola Outdoor for Oct 12.", at: daysFromToday(-6, 9, 0) }]),
  thread("t16", "BOOK-118", "Book Fair launch video", "bookfair-site", 0, [{ by: "emi", text: "Final cut is in Files, 1080p and 4K.", at: daysFromToday(-20, 17, 45) }]),
];
const back = "icon-chevron-left-line-medium" as const;

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneInbox({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [threads, setThreads] = useState(firstThreads);
  const [openId, setOpenId] = useState<string | null>(null);
  // The row the last thread was opened from: Back returns focus to it.
  const [fromId, setFromId] = useState<string | null>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const opened = threads.find((item) => item.id === openId);
  const unread = threads.reduce((sum, item) => sum + item.unread, 0);
  const waiting = threads.filter((item) => item.unread).length;
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setThreads((list) => list.map((item) => (item.id === id ? { ...item, unread: 0 } : item)));
    setTimeout(() => titleRef.current?.focus());
  };
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows Visually Hidden." });

  if (opened) {
    const markUnread = () => {
      setThreads((list) => list.map((item) => (item.id === opened.id ? { ...item, unread: item.comments.length } : item)));
      toast({ title: "Marked as unread", children: `${opened.key} · ${plural(opened.comments.length, "unread comment")}` });
    };
    return (
      // A pushed screen: the compact bar with Back and the task's key, this thread's one action in its trailing slot, no
      // bottom bar. The Body pads the screen.
      <AppShell key={opened.id}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{opened.key}</span>}
          leading={{ icon: back, label: "Back", onClick: () => { setOpenId(null); setTimeout(() => rowRef.current?.focus()); } }}
          trailing={[{ icon: "icon-mail-01-line", label: "Mark as unread", onClick: markUnread }]} />}
      >
        <Stack gap="lg">
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/Subheading">{opened.title}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${projectById(opened.project).name} · ${plural(opened.comments.length, "comment")}`}</Text>
          </Stack>
          {/* Static rows (comments are read, not opened) take the same screen margin as the title above. */}
          <List aria-label="Comments">
            {opened.comments.map((comment) => (
              // The comment is what the thread is read for: it takes the body text; name and time are the line above it,
              // pieces of one inline item (Gap/2XSmall) on one baseline.
              <ListItem key={comment.text} title={people[comment.by].name} leading={personAvatar(comment.by)}>
                <Stack direction="row" gap="2xs" align="baseline" wrap>
                  <Text as="span" textStyle="Body/Base/Bold">{people[comment.by].name}</Text>
                  <Text as="span" textStyle="Body/Small/Regular" tone="light">{formatRelative(comment.at)}</Text>
                </Stack>
                <Text as="span" tone="base">{comment.text}</Text>
              </ListItem>
            ))}
          </List>
        </Stack>
      </AppShell>
    );
  }

  return (
    // The Inbox root: the large title (the bar title once it folds), the app's roots in the bottom bar. The threads are
    // the list that closes the phone screen, so they sit open on the Canvas, not in a box (usage rules §19).
    <AppShell key="inbox"
      topNavigation={<TopNavigation scrollRef={scrollRef} title="Inbox" largeTitle="Inbox"
        largeTitleSubheading={waiting ? `New comments in ${plural(waiting, "thread")}` : "You’re all caught up"} />}
      bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="inbox"
        onValueChange={(id) => { if (id !== "inbox") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
    >
      {/* The list's name carries the total; each counter is aria-hidden and its hidden text says what it counts. */}
      <List aria-label={unread ? `Inbox, ${plural(unread, "unread comment")}` : "Inbox"}>
        {threads.map((item) => {
          const last = item.comments[0];
          return (
            <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
              title={item.title} titleLines={2} caption={`${item.key} · ${people[last.by].name} · ${formatRelative(last.at)}`}
              leading={personAvatar(last.by)} onClick={() => open(item.id)}
              trailing={item.unread ? <>
                <BadgeCounter value={item.unread} theme="red" aria-hidden="true" />
                <VisuallyHidden>{plural(item.unread, "unread comment")}</VisuallyHidden>
              </> : undefined} />
          );
        })}
      </List>
    </AppShell>
  );
}
