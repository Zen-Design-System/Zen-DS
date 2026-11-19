import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, Badge, Box, DescriptionList, Dialog, DockIcon, Heading, List, ListBox, ListItem, Stack, TopNavigation, plural, useToast, type IconName,
} from "@zen-ds/react";
import {
  TODAY, formatDate, formatDay, formatRange, leaveBalance, leaveHistory, leaveRequests, leaveStatusTheme, people, type LeaveKind, type LeaveRequest, type LeaveStatus,
} from "../../data";

type Leave = Pick<LeaveRequest, "id" | "kind" | "from" | "to" | "days" | "status" | "note">;
const leaveIcon: Record<LeaveKind, IconName> = { "Annual leave": "icon-plane-line", "Sick leave": "icon-thermometer-01-line", "Unpaid leave": "icon-calendar-line" };
/** Alex's time off over the last two years, newest first: his request in the studio's leave data (Oct 12 – Oct 14,
 *  approved), then his history. */
const myLeave: Leave[] = [...leaveRequests.filter((request) => request.person === "alex"), ...leaveHistory];
const leaveDates = (item: Pick<Leave, "from" | "to">) => item.from.getTime() === item.to.getTime() ? formatDate(item.from) : formatRange(item.from, item.to);
/** The same dates under a year header, which already names the year: "Oct 12 – Oct 14", "Sep 8". */
const leaveDays = (item: Pick<Leave, "from" | "to">) => item.from.getTime() === item.to.getTime() ? formatDay(item.from) : `${formatDay(item.from)} – ${formatDay(item.to)}`;
const back = "icon-chevron-left-line-medium" as const;

/** The Time off app: a request's screen offers Withdraw request, which a negative Dialog confirms. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneWithdraw({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const yearId = useId();
  const [requests, setRequests] = useState(myLeave);
  const [openId, setOpenId] = useState<string | null>("l1");
  const [fromId, setFromId] = useState("l1");
  const [confirming, setConfirming] = useState(false);
  // Focus follows the screen: a request focuses its title, Back returns to the row it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const request = requests.find((item) => item.id === openId);
  const setStatus = (id: string, status: LeaveStatus) => setRequests((list) => list.map((item) => item.id === id ? { ...item, status } : item));
  const upcoming = (item: Leave) => item.from > TODAY;
  const open = (item: Leave) => {
    setOpenId(item.id);
    setFromId(item.id);
    setTimeout(() => titleRef.current?.focus());
  };
  const goBack = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };
  // The footer keeps its button while its label changes (Withdraw request ↔ Request again), so focus stays on it: the
  // Dialog hands focus back to the button that opened it.
  const withdraw = () => {
    if (!request) return;
    setStatus(request.id, "Cancelled");
    setConfirming(false);
    toast({ title: "Request withdrawn" });
  };
  const requestAgain = () => {
    if (!request) return;
    setStatus(request.id, "Pending");
    toast({ title: "Request sent" });
  };

  // Each screen is its own AppShell (key).
  if (!request) {
    const years = [...new Set(requests.map((item) => item.from.getFullYear()))];
    return (
      // The requests are grouped by year: a grouped list, so each year is a white ListBox on the Canvas, under its
      // kicker, with the Alt bar. Each row opens its request and has no side padding of its own: the ListBox pads it
      // 20px on a phone, so the hover (12px outside the row) sits 8px from every edge, concentric with its 2XLarge
      // corners (24px = the fill's Large 16px + 8px), and the kicker lines up with the row content (lg, 20px).
      <AppShell key="root" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Time off" largeTitle="Time off" />}>
        {years.map((year) => (
          <Stack as="section" key={year} gap="xs" aria-labelledby={`${yearId}-${year}`}>
            <Box paddingX="lg"><Heading id={`${yearId}-${year}`} level={2} textStyle="Body/Small/Bold" tone="light">{String(year)}</Heading></Box>
            <ListBox>
              <List aria-labelledby={`${yearId}-${year}`}>
                {/* The caption is the dates only, so it stays on one line beside the status Badge inside the box; the
                    request's length is on its own screen. */}
                {requests.filter((item) => item.from.getFullYear() === year).map((item) => (
                  <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
                    title={item.kind} caption={leaveDays(item)}
                    leading={<DockIcon icon={leaveIcon[item.kind]} theme="neutral" background="subtle" />}
                    trailing={<Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge>}
                    onClick={() => open(item)} />
                ))}
              </List>
            </ListBox>
          </Stack>
        ))}
      </AppShell>
    );
  }

  const canWithdraw = upcoming(request) && request.status !== "Cancelled";
  const balance = leaveBalance[request.kind]?.left ?? null;
  return (
    <AppShell key={request.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{request.kind}</span>}
        leading={{ icon: back, label: "Back", onClick: goBack }} />}
      actionBar={upcoming(request) ? (
        <ActionBar primaryAction={canWithdraw
          ? { label: "Withdraw request", level: "danger-subtle", onClick: () => setConfirming(true) }
          : { label: "Request again", onClick: requestAgain }} />
      ) : undefined}>
      <Stack gap="md">
        <Stack direction="row" align="center" justify="between" gap="md">
          <Heading level={2} textStyle="Heading/Subheading">{leaveDates(request)}</Heading>
          <Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>
        </Stack>
        <DescriptionList divider items={[
          { term: "Length", description: plural(request.days, "working day") },
          { term: "Approver", description: people.minhAnh.name },
          // This year's balance; a withdrawn (Cancelled) request gives its days back.
          ...(request.from.getFullYear() === TODAY.getFullYear() && balance !== null
            ? [{ term: "Days left", description: plural(balance + (request.status === "Cancelled" ? request.days : 0), "day") }] : []),
          ...(request.note ? [{ term: "Note", description: request.note }] : []),
        ]} />
      </Stack>
      {/* An irreversible change on a phone: the actions stack full width within thumb reach, Primary first. */}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Withdraw leave request?"
        description={`Your leave for ${leaveDates(request)} is cancelled and ${people.minhAnh.name} is told. Taking it later needs a new approval.`}
        actionsDirection="vertical"
        primaryAction={{ label: "Withdraw request", level: "danger", onClick: withdraw }}
        secondaryAction={{ label: "Keep request", autoFocus: true }} />
    </AppShell>
  );
}
