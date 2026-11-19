import { useId, useRef, useState, type RefObject } from "react";
import { ActionBar, AppShell, BottomSheet, DockIcon, Heading, Image, List, ListItem, Metric, Stack, Text, TopNavigation, type IconName } from "@zen-ds/react";
import { daysFromToday, formatDate, photos } from "../../data";

// Phin & Co's loyalty app (a studio client): joining needs the terms read and accepted.
const terms: { title: string; body: string }[] = [
  { title: "Earning points", body: "You earn 10 points for every $1 you spend at Phin & Co stores in Vietnam, in the app or at the counter. Points show up within 24 hours." },
  { title: "Using points", body: "Rewards start at 600 points. Pick a reward in the app before you pay; the points leave your balance when your order is ready." },
  { title: "Expiry", body: "Points expire 12 months after you earn them. We email you 30 days before any of your points expire." },
  { title: "Your data", body: "We keep your orders and points to run the programme and never sell them. You can download or delete your data in Account at any time." },
  { title: "Changes", body: "We give 30 days' notice in the app before we change a reward. If the programme closes, you have 90 days to use your points." },
  { title: "Leaving", body: "You can leave in Account at any time. Points you have not used are lost when you leave." },
];
const ways: { title: string; caption: string; icon: IconName }[] = [
  { title: "Order ahead in the app", caption: "10 points for every $1", icon: "icon-coffee-cup-line" },
  { title: "Bring your own cup", caption: "20 bonus points a visit", icon: "icon-heart-hand-line" },
  { title: "Invite a friend", caption: "150 points when they join", icon: "icon-users-plus-line" },
];
const cafe = photos.site[5];

/** Phin & Co's Rewards tab: joining opens the terms in a full-height Bottom Sheet. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function TermsToAccept({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState(false);
  const earnId = useId();
  const earnRef = useRef<HTMLHeadingElement>(null);
  // Joining removes the footer that opened the sheet, so focus moves to the member screen instead of <body>.
  const join = () => {
    setMember(true);
    setOpen(false);
    setTimeout(() => earnRef.current?.focus());
  };
  return (
    <>
      {/* A tab root: the large title folds as the screen runs under the bar. The screen's main action is one Large
          full-width Primary in the Action bar; members have none. */}
      <AppShell
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Rewards" largeTitle="Rewards" />}
        actionBar={member ? undefined : <ActionBar primaryAction={{ label: "Join Phin Rewards", onClick: () => setOpen(true) }} />}
      >
        {member ? (
          <Stack gap="lg">
            <Metric size="md" label="Your points" value="0" icon="icon-gift-01-line" iconTheme="pink" />
            <Stack as="section" gap="xs" aria-labelledby={earnId}>
              <Heading ref={earnRef} level={2} id={earnId} tabIndex={-1} textStyle="Body/Small/Bold" tone="light">Ways to earn</Heading>
              <List aria-labelledby={earnId}>
                {ways.map((way) => <ListItem key={way.title} title={way.title} caption={way.caption} leading={<DockIcon icon={way.icon} theme="orange" background="subtle" size="md" />} />)}
              </List>
            </Stack>
          </Stack>
        ) : (
          <Stack gap="md">
            <Image src={cafe.src} alt={cafe.alt} ratio="4:3" radius="lg" loading="eager" />
            <Stack gap="xs">
              <Heading level={2} textStyle="Heading/Subheading">A free drink every 1,500 points</Heading>
              <Text tone="base">Earn 10 points for every $1 at any Phin & Co. Members get a birthday drink and early access to new blends.</Text>
            </Stack>
          </Stack>
        )}
      </AppShell>
      {/* Long reading: full height, the body scrolls under the fixed header, the actions stay stacked at the bottom. */}
      <BottomSheet inline size="max" open={open} onOpenChange={setOpen} title="Phin Rewards terms" actionsDirection="vertical"
        primaryAction={{ label: "Agree and join", onClick: join }} secondaryAction={{ label: "Not now" }}>
        <Stack gap="lg">
          <Text textStyle="Body/Small/Regular" tone="base">{`Last updated ${formatDate(daysFromToday(-29))}`}</Text>
          {terms.map((section) => (
            <Stack key={section.title} gap="xs">
              <Heading level={3} textStyle="Heading/Subheading">{section.title}</Heading>
              <Text>{section.body}</Text>
            </Stack>
          ))}
        </Stack>
      </BottomSheet>
    </>
  );
}
