import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Avatar, Badge, Card, Heading, Link, List, ListItem, Stack, Text } from "@zen-ds/react";
import { formatRange, initials, leaveRequests, leaveStatusTheme, people, type PersonId } from "../../data";

const octoberLeave = leaveRequests.filter((request) => people[request.person].team === "Design" && request.from.getMonth() === 9);

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};

export default function LeaveHelp() {
  const [path, setPath] = useState("/time-off");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  // What your router's link does (React Router: <Link as={RouterLink} to="/calendar/design">): a plain click opens the
  // page in place and focus moves to its heading; Cmd/Ctrl-click and Copy link address keep using the real href.
  const go = (event: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setPath(to);
    setTimeout(() => titleRef.current?.focus());
  };
  const title = (text: string) => <Heading ref={titleRef} level={4} id={titleId} textStyle="Heading/Subheading" tabIndex={-1}>{text}</Heading>;
  const backLink = <Text textStyle="Body/Base/Medium"><Link href="/time-off" onClick={(event) => go(event, "/time-off")}>Back to annual leave</Link></Text>;

  let view: ReactNode;
  if (path === "/handbook/time-off") {
    view = (
      <Stack gap="md">
        <Stack gap="xs">
          {title("Time off policy")}
          <Text as="span" textStyle="Body/Small/Regular" tone="base">Studio handbook · Updated Jan 5, 2026</Text>
        </Stack>
        <Text tone="base">Everyone gets 18 days of annual leave and 12 days of sick leave a year, on top of public holidays.</Text>
        <Text tone="base">Ask at least 2 weeks ahead for more than 3 days in a row. Days you don't use carry over until Mar 31, 2027.</Text>
        {backLink}
      </Stack>
    );
  } else if (path === "/calendar/design") {
    view = (
      <Stack gap="md">
        <Stack gap="xs">
          {title("Design team calendar")}
          <Text as="span" textStyle="Body/Small/Regular" tone="base">October 2026</Text>
        </Stack>
        <List aria-labelledby={titleId}>
          {octoberLeave.map((request) => (
            <ListItem key={request.id} title={people[request.person].name} caption={`${formatRange(request.from, request.to)} · ${request.kind}`}
              leading={personAvatar(request.person)}
              trailing={<Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>} />
          ))}
        </List>
        {backLink}
      </Stack>
    );
  } else {
    view = (
      <Stack gap="md">
        <Stack gap="xs">
          {title("Annual leave")}
          <Text as="span" textStyle="Body/Small/Regular" tone="base">7 of 18 days left this year</Text>
        </Stack>
        {/* Inside a sentence the underline is always on, so the links never rely on colour alone. */}
        <Text tone="base">
          Requests longer than 3 days go to Minh Anh Vo for approval, so read the{" "}
          <Link href="/handbook/time-off" underline="always" onClick={(event) => go(event, "/handbook/time-off")}>time off policy</Link> before you book around Tết.
          The days your team already has off are on the{" "}
          <Link href="/calendar/design" underline="always" onClick={(event) => go(event, "/calendar/design")}>Design team calendar</Link>.
        </Text>
      </Stack>
    );
  }
  return <Card as="section" theme="default" aria-labelledby={titleId}>{view}</Card>;
}
