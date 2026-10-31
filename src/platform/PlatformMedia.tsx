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
import canyonAntelope from "../assets/media/canyon-antelope.webp";
import productSneakerOffwhite from "../assets/media/product-sneaker-offwhite.webp";
import productSneakerSand from "../assets/media/product-sneaker-sand.webp";
import productSneakerRedVioletHigh from "../assets/media/product-sneaker-red-violet-high.webp";
import productSneakerSilver from "../assets/media/product-sneaker-silver.webp";
import productSneakerOlive from "../assets/media/product-sneaker-olive.webp";
import productSneakerBlack from "../assets/media/product-sneaker-black.webp";
import productSneakerNavy from "../assets/media/product-sneaker-navy.webp";
import productCapTrucker from "../assets/media/product-cap-trucker.webp";
import brandSneakersOrange from "../assets/media/brand-sneakers-orange.webp";
import mascotBurger from "../assets/media/mascot-burger.webp";
import foodBento from "../assets/media/food-bento.webp";
import foodHotpot from "../assets/media/food-hotpot.webp";
import portraitRedHair from "../assets/media/portrait-red-hair.webp";
import portraitShortHair from "../assets/media/portrait-short-hair.webp";
import portraitCurlyHoodie from "../assets/media/portrait-curly-hoodie.webp";
import portraitCurlyHair from "../assets/media/portrait-curly-hair.webp";
import portraitSmile from "../assets/media/portrait-smile.webp";
import portraitWindow from "../assets/media/portrait-window.webp";
import portraitBlazer from "../assets/media/portrait-blazer.webp";
import avatarBao from "../assets/media/avatar-bao.webp";
import avatarChi from "../assets/media/avatar-chi.webp";
import avatarDuy from "../assets/media/avatar-duy.webp";
import deviceCeilingLight from "../assets/media/device-ceiling-light.webp";
import deviceAirConditioner from "../assets/media/device-air-conditioner.webp";
import deviceSmartSpeaker from "../assets/media/device-smart-speaker.webp";
import deviceRobotVacuum from "../assets/media/device-robot-vacuum.webp";
import deviceRobotVacuumF4 from "../assets/media/device-robot-vacuum-f4.webp";
import roomRollerBlind from "../assets/media/room-roller-blind.webp";
import porchLiveView from "../assets/media/porch-live-view.webp";

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
  /* The pictures of the Zen Figma file's ◇ Master-Layout · Example screens (the design team's example assets). */
  antelopeCanyon: { src: canyonAntelope, alt: "Sky seen through the curved red walls of Antelope Canyon" } satisfies PlatformPhoto,
  /** A sneaker shop's catalogue, each on a light grey studio floor. */
  products: {
    offwhite: { src: productSneakerOffwhite, alt: "Off-white canvas slip-on sneaker with embroidered patches" },
    sand: { src: productSneakerSand, alt: "Sand low-top sneaker with blue piping and a gum sole" },
    redViolet: { src: productSneakerRedVioletHigh, alt: "Red-violet corduroy high-top sneaker" },
    silver: { src: productSneakerSilver, alt: "Silver and white sneaker with a clear blue sole" },
    olive: { src: productSneakerOlive, alt: "Olive canvas low-top sneaker with a gum sole" },
    black: { src: productSneakerBlack, alt: "Black low-top sneaker with a cream sole" },
    navy: { src: productSneakerNavy, alt: "Navy canvas low-top sneaker with a gum sole" },
    cap: { src: productCapTrucker, alt: "Black and white trucker cap with a printed logo" },
  } satisfies Record<string, PlatformPhoto>,
  /** A brand's campaign photo, for a featured-brand card. */
  campaign: { src: brandSneakersOrange, alt: "Two white and tan sneakers against an orange wall" } satisfies PlatformPhoto,
  food: {
    mascot: { src: mascotBurger, alt: "A smiling cartoon burger waving hello" },
    bento: { src: foodBento, alt: "Bento lunch box with grilled meat, rice, vegetables and an egg" },
    hotpot: { src: foodHotpot, alt: "Hot pot with beef, greens and noodles on a table for two" },
  } satisfies Record<string, PlatformPhoto>,
  /** Studio portraits: 3:4, except the two square ones (window, blazer). */
  portraits: {
    redHair: { src: portraitRedHair, alt: "Young woman with long red hair" },
    shortHair: { src: portraitShortHair, alt: "Woman with short hair in a patterned shirt" },
    curlyHoodie: { src: portraitCurlyHoodie, alt: "Young man with curly hair in a grey hoodie" },
    curlyHair: { src: portraitCurlyHair, alt: "Woman with curly hair in a cream sweater" },
    smile: { src: portraitSmile, alt: "Smiling man in a white T-shirt" },
    window: { src: portraitWindow, alt: "Woman by a blue window frame, looking aside" },
    blazer: { src: portraitBlazer, alt: "Bearded man in a blue blazer" },
  } satisfies Record<string, PlatformPhoto>,
  /** Studio people's avatar photos (examples/data.ts), for the Assets people pickers (Studio `zen-media:avatar-<id>`). */
  avatars: {
    bao: { src: avatarBao, alt: "Bao Nguyen" },
    chi: { src: avatarChi, alt: "Chi Tran" },
    duy: { src: avatarDuy, alt: "Duy Le" },
  } satisfies Record<string, PlatformPhoto>,
  /** Smart-home devices as cut-outs (transparent background), the bedroom window and the porch camera's view. */
  devices: {
    ceilingLight: { src: deviceCeilingLight, alt: "Round white ceiling light glowing warm white" },
    airConditioner: { src: deviceAirConditioner, alt: "White wall-mounted air conditioner" },
    smartSpeaker: { src: deviceSmartSpeaker, alt: "Round grey smart speaker with a coloured light on top" },
    robotVacuum: { src: deviceRobotVacuum, alt: "White robot vacuum" },
    /** F4's close crop of the same cut-out (Figma Device: a Crop fill, about 1.18× in). */
    robotVacuumClose: { src: deviceRobotVacuumF4, alt: "White robot vacuum, close up" },
    rollerBlind: { src: roomRollerBlind, alt: "Bedroom window with a grey roller blind partly down" },
    porchCamera: { src: porchLiveView, alt: "Wide-angle camera view of the porch and the wooden front door" },
  } satisfies Record<string, PlatformPhoto>,
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
