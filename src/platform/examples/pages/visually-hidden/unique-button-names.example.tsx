import { useId, useRef, useState } from "react";
import { Avatar, Badge, Button, Card, Heading, Stack, Text, VisuallyHidden, plural, useToast } from "@zen-ds/react";
import { formatRange, initials, leaveRequests, leaveStatusTheme, people, type LeaveRequest, type LeaveStatus, type PersonId } from "../../data";

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};
const pendingLeave = leaveRequests.filter((request) => request.status === "Pending");

export default function LeaveApprovals() {
  const { toast } = useToast();
  const [decided, setDecided] = useState<Record<string, LeaveStatus>>({});
  const headingId = useId();
  // Each card and its Approve button, by request id: focus has somewhere to go once a decision takes the buttons away.
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const approveRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const waiting = pendingLeave.filter((request) => !decided[request.id]).length;
  const decide = (request: LeaveRequest, status: "Approved" | "Declined") => {
    const name = people[request.person].name;
    const next = pendingLeave.find((item) => item.id !== request.id && !decided[item.id]);
    setDecided((map) => ({ ...map, [request.id]: status }));
    toast({ title: status === "Approved" ? "Request approved" : "Request declined", children: `${name} · ${formatRange(request.from, request.to)}`,
      action: { label: "Undo", onClick: () => setDecided((map) => { const rest = { ...map }; delete rest[request.id]; return rest; }) } });
    // The buttons leave with the decision: focus moves on to the next request still waiting, or stays on this card.
    setTimeout(() => (next ? approveRefs.current[next.id] : cardRefs.current[request.id])?.focus());
  };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Time off requests</Heading>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{waiting ? `${plural(waiting, "request")} waiting for you` : "All caught up"}</Text>
      </Stack>
      {pendingLeave.map((request) => {
        const person = people[request.person];
        const status = decided[request.id] ?? request.status;
        // "Approve" alone sounds the same on every card; the hidden words name whose request it is.
        const whose = ` ${person.name}'s request`;
        return (
          <Card key={request.id} ref={(card) => { cardRefs.current[request.id] = card; }} as="article" theme="default" tabIndex={-1} aria-label={`${person.name}, ${request.kind}`}>
            <Stack gap="md">
              <Stack direction="row" gap="md" align="center">
                {personAvatar(request.person)}
                <Stack gap="2xs" width="fill">
                  {/* The status Badge sits beside the name (2xs) and wraps under it on a narrow card instead of being cut. */}
                  <Stack direction="row" gap="2xs" align="center" wrap>
                    <Heading level={5} textStyle="Body/Base/Bold" width="fill">{person.name}</Heading>
                    <Badge theme={leaveStatusTheme[status]} background="subtle" size="sm">{status}</Badge>
                  </Stack>
                  <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${request.kind} · ${formatRange(request.from, request.to)} · ${plural(request.days, "day")}`}</Text>
                </Stack>
              </Stack>
              {request.note ? <Text tone="base">{request.note}</Text> : null}
              {status === "Pending" ? (
                <Stack direction="row" gap="sm" justify="end" wrap>
                  <Button level="tertiary" onClick={() => decide(request, "Declined")}>Decline<VisuallyHidden>{whose}</VisuallyHidden></Button>
                  <Button ref={(button) => { approveRefs.current[request.id] = button; }} level="primary" onClick={() => decide(request, "Approved")}>
                    Approve<VisuallyHidden>{whose}</VisuallyHidden>
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
