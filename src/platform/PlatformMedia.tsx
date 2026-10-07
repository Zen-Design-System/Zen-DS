import { useEffect, useRef, useState } from "react";
import { IconButton } from "../components/Button";
import { Icon } from "../components/Icon";
import viewerCollege from "../assets/media/viewer-college.webp";
import mountainRoadTall from "../assets/media/mountain-road-tall.webp";
import siteCollege from "../assets/media/site-college.webp";
import siteRooftops from "../assets/media/site-rooftops.webp";
import siteOldTown from "../assets/media/site-old-town.webp";
import siteSantorini from "../assets/media/site-santorini.webp";
import siteBridge from "../assets/media/site-bridge.webp";
import siteCafe from "../assets/media/site-cafe.webp";
import feedSunsetField from "../assets/media/feed-sunset-field.webp";
import feedForestCreek from "../assets/media/feed-forest-creek.webp";
import feedBalloonPalms from "../assets/media/feed-balloon-palms.webp";
import feedMountainRoad from "../assets/media/feed-mountain-road.webp";
import feedSnowPeaks from "../assets/media/feed-snow-peaks.webp";
import feedDesert from "../assets/media/feed-desert.webp";
import feedCoastRoad from "../assets/media/feed-coast-road.webp";
import feedMoss from "../assets/media/feed-moss.webp";
import canyonPortrait from "../assets/media/canyon-portrait.webm";
import canyonPortraitPoster from "../assets/media/canyon-portrait-poster.webp";
import canyonLandscape from "../assets/media/canyon-landscape.webm";
import canyonLandscapePoster from "../assets/media/canyon-landscape-poster.webp";

/* Sample photos and video for the Platform examples (src/assets/media/CREDITS.md lists sources and licences). */
export type PlatformPhoto = { src: string; alt: string };
export type PlatformVideo = { src: string; poster: string; label: string };

export const platformMedia = {
  viewer: { src: viewerCollege, alt: "Gothic college building across a striped lawn" },
  mountainRoad: { src: mountainRoadTall, alt: "A mountain road curving above a green valley" },
  site: [
    { src: siteCollege, alt: "College courtyard" },
    { src: siteRooftops, alt: "Snowy rooftops of the old town" },
    { src: siteOldTown, alt: "Old town seen from the hill" },
    { src: siteSantorini, alt: "White houses and a windmill by the sea" },
    { src: siteBridge, alt: "Suspension bridge at dusk" },
    { src: siteCafe, alt: "Café table with a coffee" },
  ] satisfies PlatformPhoto[],
  feed: [
    { src: feedSunsetField, alt: "Trees on a field at sunset" },
    { src: feedForestCreek, alt: "A creek through a green forest" },
    { src: feedBalloonPalms, alt: "A hot-air balloon over palm trees" },
    { src: feedMountainRoad, alt: "A road along a mountainside" },
    { src: feedSnowPeaks, alt: "Snow-covered peaks under clouds" },
    { src: feedDesert, alt: "Desert hills under a blue sky" },
    { src: feedCoastRoad, alt: "A wet coast road at golden hour" },
    { src: feedMoss, alt: "Moss and shrubs in soft light" },
  ] satisfies PlatformPhoto[],
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
