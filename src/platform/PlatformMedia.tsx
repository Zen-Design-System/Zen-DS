import { useEffect, useRef, useState } from "react";
import { IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import { photos, type Photo } from "./examples/data";
import canyonPortrait from "../assets/media/canyon-portrait.webm";
import canyonPortraitPoster from "../assets/media/canyon-portrait-poster.webp";
import canyonLandscape from "../assets/media/canyon-landscape.webm";
import canyonLandscapePoster from "../assets/media/canyon-landscape-poster.webp";

/* Sample photos and video for the Platform examples (src/assets/media/CREDITS.md lists sources and licences). The photos
   live in the demo world (examples/data.ts `photos`), so a portable example imports them from "./demo". */
export type PlatformPhoto = Photo;
export type PlatformVideo = { src: string; poster: string; label: string };

export const platformMedia = {
  ...photos,
  canyonPortrait: { src: canyonPortrait, poster: canyonPortraitPoster, label: "Grand Canyon timelapse" } satisfies PlatformVideo,
  canyonLandscape: { src: canyonLandscape, poster: canyonLandscapePoster, label: "Grand Canyon timelapse" } satisfies PlatformVideo,
};

const prefersReducedMotion = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** A muted looping video with a play state: it starts on its own unless the reader prefers reduced motion (then it waits on the poster). */
export function usePlatformVideo(autoPlay = true) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(() => autoPlay && !prefersReducedMotion());
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [playing]);
  return { ref, playing, toggle: () => setPlaying((value) => !value) };
}

/**
 * Full-bleed media for a PlatformPhone screen (canvas="media"): a photo, or a muted looping video with a Pause / Play
 * control (moving content over 5 s must be pausable — WCAG 2.2.2).
 */
export function PlatformPhoneMedia({ photo, video }: { photo?: PlatformPhoto; video?: PlatformVideo }) {
  const player = usePlatformVideo();
  return (
    <div className="platform-phone__media">
      {video ? (
        <>
          <video ref={player.ref} src={video.src} poster={video.poster} muted loop playsInline preload="metadata" aria-label={video.label} />
          <IconButton className="platform-phone__media-control" appearance="overlay" level="black-overlay" size="sm" aria-label={player.playing ? "Pause video" : "Play video"} onClick={player.toggle} icon={<Icon name={player.playing ? "icon-pause-solid" : "icon-play-solid"} />} />
        </>
      ) : photo ? <img src={photo.src} alt={photo.alt} /> : null}
    </div>
  );
}
