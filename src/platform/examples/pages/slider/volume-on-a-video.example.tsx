import { useRef, useState } from "react";
import { Box, Heading, IconButton, Slider, Stack, Text } from "@zen-ds/react";
import { people, videos } from "../../data";

const film = videos.canyonLandscape;

export default function VideoVolume() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The film waits for Play (a video with sound doesn't autoplay); Mute keeps the last volume to come back to.
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const level = muted ? 0 : volume;
  // The video element takes its sound from the handlers that change it (volume 0–1, muted on its own).
  const sound = (nextVolume: number, nextMuted: boolean) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume / 100;
    video.muted = nextMuted;
  };
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) { video.pause(); setPlaying(false); return; }
    sound(volume, muted);
    setPlaying(true);
    void video.play().catch(() => setPlaying(false));
  };
  const changeVolume = (next: number) => {
    const nextVolume = next > 0 ? next : volume;
    setMuted(next === 0);
    setVolume(nextVolume);
    sound(nextVolume, next === 0);
  };
  const toggleMute = () => {
    const nextVolume = muted && volume === 0 ? 50 : volume;
    setVolume(nextVolume);
    setMuted(!muted);
    sound(nextVolume, !muted);
  };
  return (
    <Stack gap="md">
      {/* A 16:9 player that clips the film to its radius. The film fills it (Left & right × Top & bottom); the control
          bar is pinned along the bottom edge (Left & right / Bottom) on a dark scrim and paints above the film because it
          comes after it. */}
      <Box radius="lg" clip surface="inverse-solid" style={{ aspectRatio: "16 / 9" }}>
        <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
          <video ref={videoRef} src={film.src} poster={film.poster} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            loop playsInline preload="metadata" aria-label="Saola Outdoor brand film, draft 3" />
        </Box>
        <Stack direction="row" gap="xs" align="center" padding="sm" position="absolute" constraintX="left-right" constraintY="bottom"
          style={{ background: "linear-gradient(to top, var(--zen-color-background-black-overlay-default), transparent)" }}>
          <IconButton appearance="overlay" level="black-overlay" size="sm" aria-label={playing ? "Pause" : "Play"}
            icon={playing ? "icon-pause-solid" : "icon-play-solid"} onClick={togglePlay} />
          <IconButton appearance="overlay" level="black-overlay" size="sm" aria-label={muted ? "Unmute" : "Mute"}
            icon={level === 0 ? "icon-volume-x-solid" : "icon-volume-max-solid"} onClick={toggleMute} />
          {/* The volume takes the room left, up to 200px. */}
          <Box width="fill" maxWidth={200}>
            <Slider aria-label="Volume" theme="white" size="md" value={level} onValueChange={changeVolume}
              icon="icon-volume-max-solid" valueText={(value) => (value === 0 ? "Muted" : `${value}%`)} />
          </Box>
        </Stack>
      </Box>
      <Stack gap="xs">
        <Heading level={4} textStyle="Heading/Subheading">Brand film, draft 3</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · shared by {people.emi.name}</Text>
      </Stack>
    </Stack>
  );
}
