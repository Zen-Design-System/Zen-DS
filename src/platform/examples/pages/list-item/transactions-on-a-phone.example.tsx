import { useId, useState, type RefObject } from "react";
import { AppShell, DockIcon, Heading, Link, List, ListItem, Stack, Text, TopNavigation } from "@zen-ds/react";

/** VND per USD for the second line of each amount. */
const usdRate = 26_350;
/** The studio's VND account; positive = money in. Hanoi Book Fair paid INV-2026-0138 ($9,140.50) on Sep 10. */
const transactions = [
  { id: "t1", party: "Saola Outdoor", vnd: 94_860_000, when: "Today" },
  { id: "t2", party: "Phúc Long Coffee & Tea, 3 Tháng 2", vnd: -1_240_000, when: "Today" },
  { id: "t3", party: "Grab for Business", vnd: -386_000, when: "Yesterday" },
  { id: "t4", party: "Viettel Telecom", vnd: -1_650_000, when: "Sep 28" },
  { id: "t5", party: "Hanoi Book Fair", vnd: 240_852_175, when: "Sep 10" },
  { id: "t6", party: "Tiki Corporation", vnd: -2_150_000, when: "Sep 9" },
];
const SHOWN_TRANSACTIONS = 4;
/** The sign stays in the text (− U+2212 for money out), so the colour never carries it alone. */
const formatVnd = (vnd: number) => `${vnd > 0 ? "+" : "−"}${Math.abs(vnd).toLocaleString("en-US")} VND`;
const formatUsd = (vnd: number) => `${(Math.abs(vnd) / usdRate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

/** Transactions on a phone: a two-line value that is never cut. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneTransactions({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const titleId = useId();
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? transactions : transactions.slice(0, SHOWN_TRANSACTIONS);
  return (
    // A full-bleed list, as a banking app lays it out: static rows with no side padding of their own, inset by the
    // screen's margin, the section title and its underlined See all above them. The amount is the row's value, Bold level
    // with the title and never cut, its USD line level with the caption; a long payee truncates instead. The title is the
    // payee alone: the arrow, "Received" / "Sent" and the sign already say which way the money went.
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Account" largeTitle="Account" />}>
      <Stack as="section" gap="xs" aria-labelledby={titleId}>
        <Stack direction="row" justify="between" align="center" gap="md">
          <Heading level={2} id={titleId} textStyle="Heading/Subheading">Transactions</Heading>
          {/* A section head's See all is underlined text, not a button: it takes no more room than its words. It expands
              the list in place, so the Link renders a button element (it takes href when it opens a full page). */}
          <Text as="span" textStyle="Body/Base/Medium">
            <Link as="button" tone="inherit" aria-expanded={showAll} onClick={() => setShowAll((all) => !all)}>{showAll ? "Show fewer" : "See all"}</Link>
          </Text>
        </Stack>
        <List aria-labelledby={titleId}>
          {rows.map((entry) => {
            const received = entry.vnd > 0;
            return (
              <ListItem key={entry.id} title={entry.party} caption={`${received ? "Received" : "Sent"} · ${entry.when}`}
                leading={<DockIcon size="md" icon={received ? "icon-arrow-down-line" : "icon-arrow-up-line"} theme="neutral" background="subtle" />}
                value={formatVnd(entry.vnd)} valueCaption={formatUsd(entry.vnd)} valueTone={received ? "positive-light" : "strongest"} />
            );
          })}
        </List>
      </Stack>
    </AppShell>
  );
}
