import { useId, useState, type RefObject } from "react";
import { ActionBar, AppShell, Card, DockIcon, Heading, List, ListItem, ProgressBar, Stack, Text, TopNavigation, plural } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative } from "../../data";

const STAMPS_FOR_REWARD = 10;
type Visit = { id: string; title: string; at: Date; change: string };
// Newest first: 8 stamps since the last free drink, then the visits that filled the card before it.
const recentVisits: Visit[] = [
  { id: "v12", title: "Phin sữa đá · Nguyen Hue", at: daysFromToday(-1, 8, 12), change: "+1 stamp" },
  { id: "v11", title: "Bạc xỉu · Thao Dien", at: daysFromToday(-3, 7, 48), change: "+1 stamp" },
  { id: "v10", title: "Cold brew · Nguyen Hue", at: daysFromToday(-6, 15, 30), change: "+1 stamp" },
  { id: "v9", title: "Cà phê muối · Ben Thanh", at: daysFromToday(-8, 9, 5), change: "+1 stamp" },
  { id: "v8", title: "Phin sữa đá · Nguyen Hue", at: daysFromToday(-10, 8, 20), change: "+1 stamp" },
  { id: "v7", title: "Trà đào cam sả · Thao Dien", at: daysFromToday(-13, 16, 10), change: "+1 stamp" },
  { id: "v6", title: "Bạc xỉu · Nguyen Hue", at: daysFromToday(-15, 8, 5), change: "+1 stamp" },
  { id: "v5", title: "Cà phê dừa · Ben Thanh", at: daysFromToday(-17, 14, 40), change: "+1 stamp" },
  { id: "r1", title: "Free drink redeemed · Nguyen Hue", at: daysFromToday(-20, 8, 30), change: `−${STAMPS_FOR_REWARD} stamps` },
  { id: "v3", title: "Phin sữa đá · Nguyen Hue", at: daysFromToday(-22, 8, 15), change: "+1 stamp" },
  { id: "v2", title: "Cold brew · Thao Dien", at: daysFromToday(-24, 15, 0), change: "+1 stamp" },
  { id: "v1", title: "Bạc xỉu · Nguyen Hue", at: daysFromToday(-27, 7, 55), change: "+1 stamp" },
];

/** The Phin & Co loyalty app's Rewards tab: a bar towards the next free drink. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function LoyaltyStamps({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const cardTitleId = useId();
  const visitsId = useId();
  const [stamps, setStamps] = useState(8);
  const [visits, setVisits] = useState(recentVisits);
  const full = stamps >= STAMPS_FOR_REWARD;
  const scan = () => {
    setStamps((n) => Math.min(STAMPS_FOR_REWARD, n + 1));
    setVisits((list) => [{ id: `v${Date.now()}`, title: "Phin sữa đá · Nguyen Hue", at: TODAY, change: "+1 stamp" }, ...list]);
  };
  const redeem = () => {
    setStamps(0);
    setVisits((list) => [{ id: `r${Date.now()}`, title: "Free drink redeemed · Nguyen Hue", at: TODAY, change: `−${STAMPS_FOR_REWARD} stamps` }, ...list]);
  };
  return (
    // A tab root: the large title folds into the bar as the visits scroll under it.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Rewards" largeTitle="Rewards" />}
      actionBar={<ActionBar primaryAction={full
        ? { label: "Redeem free drink", onClick: redeem }
        : { label: "Scan receipt", startIcon: "icon-scan-line", onClick: scan }} />}
    >
      {/* The reward card and the visits are sections of the screen (lg). */}
      <Stack gap="lg">
        <Card theme="default" as="section" aria-labelledby={cardTitleId}>
          <Stack gap="md">
            <Stack gap="xs">
              <Heading level={2} id={cardTitleId} textStyle="Heading/Subheading">Free drink</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">Any drink, any size</Text>
            </Stack>
            {/* Accent while collecting; Status (green) once the reward is ready. */}
            <ProgressBar value={(stamps / STAMPS_FOR_REWARD) * 100} theme={full ? "status" : "accent"} label={`${stamps} of ${STAMPS_FOR_REWARD} stamps`} aria-label="Stamps collected" />
            <Text role="status" textStyle="Body/Small/Regular" tone="base">
              {full ? "Your free drink is ready. Show this screen at the counter." : `${plural(STAMPS_FOR_REWARD - stamps, "more stamp")} for a free drink.`}
            </Text>
          </Stack>
        </Card>
        <Stack gap="xs">
          <Heading level={2} id={visitsId} textStyle="Body/Small/Bold" tone="light">Recent visits</Heading>
          <List aria-labelledby={visitsId}>
            {visits.map((visit) => (
              <ListItem key={visit.id} title={visit.title} caption={formatRelative(visit.at)}
                leading={<DockIcon icon={visit.change.startsWith("+") ? "icon-coffee-cup-line" : "icon-gift-01-line"} theme="orange" background="subtle" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{visit.change}</Text>} />
            ))}
          </List>
        </Stack>
      </Stack>
    </AppShell>
  );
}
