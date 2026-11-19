import { useState, type RefObject } from "react";
import {
  AppShell, Card, DockIcon, Icon, IconButton, Image, ProgressBar, SliderField, Stack, Text, ToggleButton, TopNavigation, useToast,
} from "@zen-ds/react";
import { photos } from "../../data";

/** Figma Status (F3, F4): the power Toggle-Button XLarge (an icon in its dot) and the battery as Display/3 with its
 *  zap icon, Gap/Medium apart, the value pinned to the end over its caption. */
function PowerStatus({ device, on, onPowerChange, battery, caption }: { device: string; on: boolean; onPowerChange: (on: boolean) => void; battery: string; caption: string }) {
  return (
    <Stack direction="row" gap="md" align="center">
      <ToggleButton size="xl" icon="icon-power-01-line" checked={on} onCheckedChange={onPowerChange} aria-label={`${device} power`} />
      <Stack gap="none" align="end" width="fill">
        <Stack direction="row" gap="2xs" align="center">
          <Icon name="icon-zap-line" size="xl" decorative />
          <Text as="p" textStyle="Display/3" tabularNumbers>{battery}</Text>
        </Stack>
        <Text textStyle="Body/Small/Regular" tone="base">{caption}</Text>
      </Stack>
    </Stack>
  );
}

const playlist = [
  { title: "Sunday Morning", artist: "Maroon 5", elapsed: "2:14", length: "4:06", progress: 54 },
  { title: "She Will Be Loved", artist: "Maroon 5", elapsed: "0:00", length: "4:17", progress: 0 },
  { title: "This Love", artist: "Maroon 5", elapsed: "0:00", length: "3:26", progress: 0 },
];

/** F3 · Speaker (Figma 15991:10200): the Apple HomePod mini in Mai Anh's living room, a device screen of her smart-home
 *  app. Pattern/AppShell/Mobile · Top=Bar · Bottom=None on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function Speaker({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(75);
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const song = playlist[track];
  const skip = (step: number) => { setTrack((current) => (current + step + playlist.length) % playlist.length); setLiked(false); setPlaying(on); };
  return (
    // A device screen: Back and More in a Transparent bar, brand, name and room, the power Toggle-Button XLarge with the
    // battery, the product photo, the volume as an Accent Slider/Field, then now playing in one Shadow card.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" aria-label="HomePod mini" largeTitle="HomePod mini" largeTitleCapline="Apple" largeTitleSubheading="Living room"
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Living room" }) }}
        trailing={[{ icon: "icon-dots-vertical-line", label: "More for HomePod mini", onClick: () => toast({ title: "HomePod mini", children: "Rename, move to another room or remove it." }) }]} />}
    >
      <Stack gap="xl">
        <PowerStatus device="HomePod mini" on={on} battery="98%" caption="Battery"
          onPowerChange={(next) => { setOn(next); setPlaying(next); toast({ title: next ? "HomePod mini is on" : "HomePod mini is off" }); }} />
        {/* Figma Device: the speaker's photo, 350 × 240 with Corner-Radius/3XLarge. */}
        <Image src={photos.devices.smartSpeaker.src} alt="" ratio={350 / 240} frame={false} radius="3xl" />
        <SliderField label="Volume" theme="accent" value={volume} onValueChange={setVolume} formatValue={(value) => `${value}%`} />
        <Card theme="shadow" as="section" aria-label="Now playing">
          <Stack gap="md">
            <Stack direction="row" gap="sm" align="center">
              <DockIcon size="lg" icon="icon-music-note-01-line" theme="neutral" background="subtle" />
              <Stack gap="none" width="fill">
                <Text textStyle="Body/Base/Bold" truncate>{song.title}</Text>
                <Text textStyle="Body/Small/Regular" tone="base">{song.artist} · {playing ? song.elapsed : "Paused"} / {song.length}</Text>
              </Stack>
              <IconButton appearance="flat" level="primary" icon={liked ? "icon-heart-solid" : "icon-heart-line"} aria-label={`Like ${song.title}`} aria-pressed={liked} onClick={() => setLiked((value) => !value)} />
            </Stack>
            <ProgressBar value={song.progress} aria-label={`${song.title}, ${song.elapsed} of ${song.length}`} />
            <Stack direction="row" justify="between" align="center" gap="xs">
              <IconButton appearance="flat" level="primary" icon="icon-shuffle-line" aria-label="Shuffle" aria-pressed={shuffle}
                onClick={() => { setShuffle((value) => !value); toast({ title: shuffle ? "Shuffle off" : "Shuffle on" }); }} />
              <IconButton size="lg" level="tertiary" icon="icon-skip-back-solid" aria-label="Previous track" onClick={() => skip(-1)} />
              <IconButton size="xl" level="primary" icon={playing ? "icon-pause-solid" : "icon-play-solid"} aria-label={playing ? "Pause" : "Play"}
                onClick={() => { if (!on) { toast({ title: "HomePod mini is off", children: "Turn it on to play." }); return; } setPlaying((value) => !value); }} />
              <IconButton size="lg" level="tertiary" icon="icon-skip-forward-solid" aria-label="Next track" onClick={() => skip(1)} />
              <IconButton appearance="flat" level="primary" icon="icon-repeat-01-line" aria-label="Repeat" aria-pressed={repeat}
                onClick={() => { setRepeat((value) => !value); toast({ title: repeat ? "Repeat off" : "Repeat on" }); }} />
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </AppShell>
  );
}
