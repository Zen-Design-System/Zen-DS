import { useRef, useState } from "react";
import { AppShell, BottomNavigation, Box, Grid, IconButton, Image, VisuallyHidden, type BottomNavigationItem } from "@zen-ds/react";
import { photos, videos } from "../../data";

// Saola Outdoor's trail app (a studio client): every destination is imagery, so the pill floats on the picture.
const trails = [
  { name: "Sunset field loop", photo: photos.feed[0] },
  { name: "Forest creek", photo: photos.feed[1] },
  { name: "Balloon valley", photo: photos.feed[2] },
  { name: "Mountain road", photo: photos.feed[3] },
  { name: "Snow peaks", photo: photos.feed[4] },
  { name: "Desert hills", photo: photos.feed[5] },
  { name: "Coast road", photo: photos.feed[6] },
  { name: "Moss trail", photo: photos.feed[7] },
  { name: "Old town walk", photo: photos.site[2] },
];
const saved = [trails[1], trails[4], trails[6], trails[8]];
const film = videos.canyonPortrait;
const items: BottomNavigationItem[] = [
  { id: "today", label: "Today", icon: "icon-compass-line", selectedIcon: "icon-compass-solid" },
  { id: "trails", label: "Trails", icon: "icon-map-line", selectedIcon: "icon-map-solid" },
  { id: "saved", label: "Saved", icon: "icon-bookmark-line", selectedIcon: "icon-bookmark-solid" },
];
/** The status bar's height: the pictures start under it, and the video's control clears it. */
const safeTop = "var(--zen-safe-area-top, env(safe-area-inset-top, 0px))";

/** A trail app on media: the Floating Glass pill floats on the video and the photos. */
export default function GlassOverPhotos() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState("today");
  const [playing, setPlaying] = useState(false);
  // The clip waits for Play: moving footage starts when someone asks for it, and Pause stops it (WCAG 2.2.2).
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) { video.pause(); setPlaying(false); return; }
    setPlaying(true);
    void video.play().catch(() => setPlaying(false));
  };
  const openTab = (id: string) => {
    setTab(id);
    setPlaying(false);
  };
  const title = items.find((item) => item.id === tab)!.label;
  return (
    <AppShell
      // Over photos and video there is no Surface band under the pill (backdrop none), only the progressive blur.
      bottomNavigation={<BottomNavigation type="floating-glass" backdrop="none" items={items} value={tab} onValueChange={openTab} aria-label="Saola Trails" />}>
      {/* A full-bleed media screen shows no title bar; it still names itself with one h1. */}
      <VisuallyHidden as="h1">{title}</VisuallyHidden>
      {/* The media fills the whole screen, under the status bar and the pill: a black layer pinned to every edge.
          zen-allow-absolute-parent: AppShell is the frame here (its root is positioned), so the layer spans the screen. */}
      <Box position="absolute" constraintX="left-right" constraintY="top-bottom" surface="black">
        {tab === "today" ? (
          <>
            <video ref={videoRef} src={film.src} poster={film.poster} muted loop playsInline preload="metadata" aria-label="Grand Canyon timelapse"
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
            <Box position="absolute" constraintX="right" constraintY="top" insetRight="md" style={{ paddingTop: `calc(${safeTop} + var(--zen-spacing-padding-small, 12px))` }}>
              <IconButton appearance="overlay" level="black-overlay" size="sm" aria-label={playing ? "Pause video" : "Play video"} icon={playing ? "icon-pause-solid" : "icon-play-solid"} onClick={togglePlay} />
            </Box>
          </>
        ) : (
          <Grid as="ul" columns={tab === "trails" ? 3 : 2} gap="2xs" aria-label={title} style={{ paddingTop: safeTop }}>
            {(tab === "trails" ? trails : saved).map((trail) => (
              <li key={trail.name}><Image src={trail.photo.src} alt={trail.name} ratio="3:4" radius="none" /></li>
            ))}
          </Grid>
        )}
      </Box>
    </AppShell>
  );
}
