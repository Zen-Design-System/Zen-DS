import { useId, useState } from "react";
import { Card, Heading, Slider, Stack, Text, Toggle } from "@zen-ds/react";

export default function SoundsTurnedOff() {
  const labelId = useId();
  const [sounds, setSounds] = useState(false);
  const [volume, setVolume] = useState(60);
  return (
    <Stack><Card theme="default" width="fill" maxWidth={440} alignSelf="center">
      {/* The card header and two settings of one group: md apart; each label sits xs from its control. */}
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">Notifications</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Zen for Mac on this computer</Text>
        </Stack>
        {/* A Toggle is 232px wide on its own (Figma); a setting row fills the card, so the switch sits on its edge. */}
        <Stack fillChildren align="stretch">
          <Toggle size="md" label="Notification sounds" caption="Mentions, replies and reminders play a sound."
            checked={sounds} onCheckedChange={setSounds} />
        </Stack>
        <Stack gap="xs">
          <Stack direction="row" justify="between" gap="xs">
            <Text as="span" id={labelId} textStyle="Body/Small/Bold">Volume</Text>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{sounds ? `${volume}%` : "Off"}</Text>
          </Stack>
          {/* Disabled while the master toggle is off; the line under it says why. */}
          <Slider aria-labelledby={labelId} value={volume} onValueChange={setVolume} disabled={!sounds}
            icon="icon-volume-max-solid" valueText={(value) => `${value}%`} />
          {sounds ? null : <Text textStyle="Caption/Regular" tone="light">Turn on notification sounds to set their volume.</Text>}
        </Stack>
      </Stack>
    </Card></Stack>
  );
}
