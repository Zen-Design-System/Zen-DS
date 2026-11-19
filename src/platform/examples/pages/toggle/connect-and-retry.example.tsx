import { useState } from "react";
import { Card, Divider, DockIcon, InlineMessage, Stack, Toggle } from "@zen-ds/react";
import { me } from "../../data";

type SyncState = "off" | "connecting" | "on" | "failed";

export default function Integrations() {
  const [calendar, setCalendar] = useState<SyncState>("off");
  const [slack, setSlack] = useState(true);
  const [attempts, setAttempts] = useState(0);
  // Demo: the first connection times out, the retry goes through.
  const connect = () => {
    const attempt = attempts + 1;
    setAttempts(attempt);
    setCalendar("connecting");
    setTimeout(() => setCalendar(attempt === 1 ? "failed" : "on"), 1400);
  };
  const calendarCaption = calendar === "connecting" ? "Connecting to Google Calendar…" : calendar === "on" ? `Due dates go to ${me.email}` : "Due dates of your tasks show up in your calendar";
  return (
    <Card theme="default">
      <Stack gap="md">
        {/* Beside its Dock Icon each switch takes the rest of the row (a toggle group fills; a Toggle alone is 232px), so
            both switches line up on the right edge. */}
        <Stack direction="row" gap="md" align="center">
          <DockIcon icon="icon-calendar-line" theme="blue" background="subtle" size="medium" />
          <Stack align="stretch" fillChildren style={{ flex: "1 1 auto", minWidth: 0 }}>
            <Toggle size="md" label="Sync due dates to Google Calendar" caption={calendarCaption}
              checked={calendar === "on" || calendar === "connecting"} disabled={calendar === "connecting"}
              onCheckedChange={(on) => (on ? connect() : setCalendar("off"))}
              bold />
          </Stack>
        </Stack>
        {calendar === "failed" ? (
          <InlineMessage theme="negative" title="Couldn't connect Google Calendar" action={{ label: "Try again", onClick: connect }}>
            Google didn't answer in time, so nothing was synced.
          </InlineMessage>
        ) : null}
        <Divider />
        <Stack direction="row" gap="md" align="center">
          <DockIcon icon="icon-hash-01-line" theme="purple" background="subtle" size="medium" />
          <Stack align="stretch" fillChildren style={{ flex: "1 1 auto", minWidth: 0 }}>
            <Toggle size="md" label="Post task updates to Slack"
              caption={slack ? "Status changes go to #studio-updates" : "Nothing from Zen is posted to Slack"} checked={slack} onCheckedChange={setSlack} bold />
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
