import { useId, useState, type RefObject } from "react";
import {
  AppShell, Box, Button, Card, DockIcon, Heading, IconButton, Stack, Text, ToggleButton, TopNavigation, useToast,
  type IconName,
} from "@zen-ds/react";

const tvInputs = ["HDMI 1", "HDMI 2", "TV"];
const tvApps: { id: string; label: string; icon: IconName }[] = [
  { id: "netflix", label: "Netflix", icon: "icon-film-01-line" },
  { id: "youtube", label: "YouTube", icon: "icon-play-solid" },
  { id: "spotify", label: "Spotify", icon: "icon-music-note-01-line" },
  { id: "live-tv", label: "Live TV", icon: "icon-tv-02-line" },
];

/** Figma VOL / CH: a 56-wide Surface capsule (Corner-Radius/Rounded) with two Large Icon-Flat buttons and its Caption/Bold name. */
function RockerControl({ name, upLabel, downLabel, upIcon, downIcon, disabled, onStep }: { name: string; upLabel: string; downLabel: string; upIcon: IconName; downIcon: IconName; disabled: boolean; onStep: (step: 1 | -1) => void }) {
  return (
    <Box surface="surface" radius="full" width={56}>
      <Stack gap="xs" align="center">
        <IconButton appearance="flat" level="primary" size="lg" icon={upIcon} aria-label={upLabel} disabled={disabled} onClick={() => onStep(1)} />
        <Text as="span" textStyle="Caption/Bold" tone="base" aria-hidden="true">{name}</Text>
        <IconButton appearance="flat" level="primary" size="lg" icon={downIcon} aria-label={downLabel} disabled={disabled} onClick={() => onStep(-1)} />
      </Stack>
    </Box>
  );
}

/** F9 · TV (Figma 15991:10411): a remote on the phone for the Samsung TV in Mai Anh's living room, a device screen of her
 *  smart-home app. Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function TvRemote({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(18);
  const [channel, setChannel] = useState(7);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [input, setInput] = useState(0);
  const appsId = useId();
  const send = (title: string) => toast({ title, children: "Sent to Living room TV" });
  return (
    // Bar + None on Canvas/Default: Back and More over the device heading (brand, name, input), then the power switch
    // with what plays, the VOL rocker · round D-pad · CH rocker, the playback row (Tertiary Icon-Main, Play one size up)
    // and the apps.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label="Living room TV" topBar
        largeTitle="Living room TV" largeTitleCapline="Samsung" largeTitleSubheading={tvInputs[input]}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Living room", children: "6 devices · 4 on" }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: "More for Living room TV", onClick: () => toast({ title: "Living room TV", children: "Rename, move to another room or remove it." }) }]} />}
    >
      <Stack direction="row" gap="md" align="center">
        <ToggleButton size="xl" icon="icon-power-01-line" aria-label="Power" checked={on}
          onCheckedChange={(next) => { setOn(next); toast({ title: next ? "Living room TV on" : "Living room TV off", children: next ? `${tvInputs[input]} · Netflix` : "Standby until you turn it on." }); }} />
        <Stack gap="none" align="end" width="fill">
          <Text as="p" textStyle="Display/3">{on ? "Netflix" : "Standby"}</Text>
          <Text textStyle="Body/Small/Regular" tone="base" aria-live="polite">{on ? `Volume ${muted ? "muted" : volume} · channel ${channel}` : "Turn it on to use the remote"}</Text>
        </Stack>
      </Stack>
      <Stack direction="row" justify="between" align="center" gap="none">
        <RockerControl name="VOL" upLabel="Volume up" downLabel="Volume down" upIcon="icon-plus-line" downIcon="icon-minus-line" disabled={!on}
          onStep={(step) => { setMuted(false); setVolume((value) => Math.min(100, Math.max(0, value + step))); }} />
        {/* Figma D-Pad: a 200 Surface circle, Large Icon-Flat arrows 16 apart round a Large Primary Select. */}
        <Box surface="surface" radius="full" width={200} height={200}>
          <Stack gap="md" align="center" justify="center" height="fill">
            <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-up-line" aria-label="Up" disabled={!on} onClick={() => send("Up")} />
            <Stack direction="row" gap="none" align="center" justify="center">
              <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-left-line-medium" aria-label="Left" disabled={!on} onClick={() => send("Left")} />
              <Button level="primary" size="lg" disabled={!on} onClick={() => send("Select")}>Select</Button>
              <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-right-line-medium" aria-label="Right" disabled={!on} onClick={() => send("Right")} />
            </Stack>
            <IconButton appearance="flat" level="primary" size="lg" icon="icon-chevron-down-line" aria-label="Down" disabled={!on} onClick={() => send("Down")} />
          </Stack>
        </Box>
        <RockerControl name="CH" upLabel="Channel up" downLabel="Channel down" upIcon="icon-chevron-up-line" downIcon="icon-chevron-down-line" disabled={!on}
          onStep={(step) => setChannel((value) => Math.max(1, value + step))} />
      </Stack>
      <Stack direction="row" justify="between" align="center" gap="none">
        <IconButton level="tertiary" size="lg" icon={muted ? "icon-volume-x-line" : "icon-volume-min-line"} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted} disabled={!on} onClick={() => setMuted((value) => !value)} />
        <IconButton level="tertiary" size="lg" icon="icon-skip-back-solid" aria-label="Previous" disabled={!on} onClick={() => send("Previous")} />
        <IconButton level="tertiary" size="xl" icon={playing ? "icon-pause-solid" : "icon-play-solid"} aria-label={playing ? "Pause" : "Play"} disabled={!on} onClick={() => setPlaying((value) => !value)} />
        <IconButton level="tertiary" size="lg" icon="icon-skip-forward-solid" aria-label="Next" disabled={!on} onClick={() => send("Next")} />
        <IconButton level="tertiary" size="lg" icon="icon-tv-02-line" aria-label="Change input" disabled={!on}
          onClick={() => { const next = (input + 1) % tvInputs.length; setInput(next); toast({ title: `Input: ${tvInputs[next]}` }); }} />
      </Stack>
      <Card as="section" aria-labelledby={appsId}>
        <Stack gap="md">
          <Heading level={2} id={appsId} textStyle="Body/Base/Bold">Apps</Heading>
          <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-labelledby={appsId}>
            {tvApps.map((app) => (
              <Stack as="li" key={app.id} gap="xs" align="center" width={64}>
                <DockIcon size="lg" icon={app.icon} theme="neutral" background="subtle" />
                <Text as="span" textStyle="Caption/Medium">{app.label}</Text>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Card>
    </AppShell>
  );
}
