import { useRef, useState } from "react";
import { Box, Heading, IconButton, Stack, Text, Tooltip } from "@zen-ds/react";
import { videos } from "../../data";

const film = videos.canyonLandscape;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** A client's brand film: Black-Overlay controls and tooltips over the footage, the play tooltip following its state. */
export default function BrandFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ at: 0, length: 0 });
  // The film waits for Play: moving footage starts when someone asks for it.
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) { video.pause(); setPlaying(false); return; }
    setPlaying(true);
    void video.play().catch(() => setPlaying(false));
  };
  const seek = (by: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = Math.min(Math.max(0, video.currentTime + by), video.duration || 0);
  };
  // The tooltip names what a press does now, so it changes with the state: Pause while playing, Play while paused.
  const playLabel = playing ? "Pause" : "Play";
  return (
    <Stack gap="md" width="fill">
      {/* No clip on the frame: the film rounds its own corners, so the tooltips above the controls are never cut off. */}
      <Box>
        <video ref={videoRef} src={film.src} poster={film.poster} muted loop playsInline preload="metadata"
          style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--zen-corner-radius-large)", background: "var(--zen-color-background-surface-alt)" }}
          aria-label="Saola Outdoor brand film"
          onLoadedMetadata={(event) => setTime({ at: event.currentTarget.currentTime, length: event.currentTarget.duration })}
          onTimeUpdate={(event) => setTime({ at: event.currentTarget.currentTime, length: event.currentTarget.duration })} />
        {/* Center / Bottom, Padding/Small above the film's bottom edge. */}
        <Stack direction="row" gap="xs" position="absolute" constraintX="center" constraintY="bottom" insetBottom="sm" role="group" aria-label="Playback">
          <Tooltip content="Back 5 seconds" color="black-overlay">
            <IconButton appearance="overlay" level="black-overlay" icon="icon-fast-backward-solid" aria-label="Back 5 seconds" onClick={() => seek(-5)} />
          </Tooltip>
          <Tooltip content={playLabel} color="black-overlay">
            <IconButton appearance="overlay" level="black-overlay" icon={playing ? "icon-pause-solid" : "icon-play-solid"} aria-label={playLabel} onClick={togglePlay} />
          </Tooltip>
          <Tooltip content="Forward 5 seconds" color="black-overlay">
            <IconButton appearance="overlay" level="black-overlay" icon="icon-fast-forward-solid" aria-label="Forward 5 seconds" onClick={() => seek(5)} />
          </Tooltip>
        </Stack>
      </Box>
      <Stack gap="xs">
        <Heading level={4} textStyle="Heading/Subheading">Saola Outdoor – brand film v2.webm</Heading>
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{`Brand refresh · ${clock(time.at)} / ${clock(time.length)}`}</Text>
      </Stack>
    </Stack>
  );
}
