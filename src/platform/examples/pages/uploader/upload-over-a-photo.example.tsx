import { useRef, useState } from "react";
import { FileUpload, Image, Stack, UploaderFileItem, plural, type UploaderFile } from "@zen-ds/react";
import { formatBytes, photos } from "../../data";

// ——— A demo upload: about 3 MB a second, 2–8 seconds per file ———————————————————————————————————————
/** `failAt`: the percentage at which this try drops (the studio Wi-Fi), once; Retry starts a clean try. */
type DemoFile = UploaderFile & { bytes: number; failAt?: number };
const TICK = 400;
const secondsFor = (bytes: number) => Math.min(8, Math.max(2, bytes / 3_000_000));
const advance = (file: DemoFile): DemoFile => {
  if (file.state !== "uploading") return file;
  const seconds = secondsFor(file.bytes);
  const progress = Math.min(100, (file.progress ?? 0) + (100 * TICK) / (seconds * 1000));
  if (file.failAt !== undefined && progress >= file.failAt) {
    return { ...file, state: "alert", progress: undefined, caption: undefined, failAt: undefined, error: "Upload failed. Check your connection and retry." };
  }
  if (progress >= 100) return { ...file, state: "uploaded", progress: 100, caption: undefined };
  const left = Math.max(1, Math.ceil(((100 - progress) / 100) * seconds));
  return { ...file, progress, caption: `${plural(left, "second")} left` };
};
/** Starts (or restarts, for Retry) a file's upload from 0. */
const restart = (file: DemoFile): DemoFile =>
  ({ ...file, state: "uploading", progress: 0, error: undefined, caption: `${plural(Math.ceil(secondsFor(file.bytes)), "second")} left` });
let uploadCount = 0;
/** A picked or dropped file, starting its upload. */
const startUpload = (file: File, previewUrl?: string): DemoFile =>
  restart({ id: `upload-${++uploadCount}`, name: file.name, bytes: file.size, size: formatBytes(file.size), previewUrl });
/** Moves a demo upload on every TICK until it ends, reporting each step as a real upload's progress events would. In
 *  your app, send the file and update it from those events instead. */
function simulateUpload(file: DemoFile, onStep: (next: DemoFile, previous: DemoFile) => void) {
  setTimeout(() => {
    const next = advance(file);
    onStep(next, file);
    if (next.state === "uploading") simulateUpload(next, onStep);
  }, TICK);
}
/** Checks a file against the extensions and size a field accepts; returns why it can't be added, or null. */
const rejectReason = (file: File, extensions: string[], maxBytes: number, kinds: string) => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions.includes(ext)) return `${file.name} isn't ${kinds} file.`;
  if (file.size > maxBytes) return `${file.name} is larger than ${formatBytes(maxBytes)}.`;
  return null;
};

// ——— The File-Item floats over the new photo while it uploads (Overlay theme) ———————————————————————————
const oldCover = photos.feed[7];
/** What the photo shows (never its file name): the seeded photo is known, a picked one is described generically. */
const altOf = (file: DemoFile) => (file.id === "cover" ? photos.feed[5].alt : "New cover photo");
// The new cover starts uploading; this first try drops at 70% on the studio Wi-Fi.
const coverSeed: DemoFile = { id: "cover", name: "desert-trail-lookbook.jpg", bytes: 7_400_000, size: "7.4 MB", state: "uploading", progress: 0, caption: "3 seconds left", failAt: 70, previewUrl: photos.feed[5].src };

export default function ProjectCover() {
  // The cover on show and the upload that may replace it, in one state: a finished upload becomes the cover in one step.
  const [cover, setCover] = useState<{ src: string; alt: string; upload?: DemoFile }>({ src: oldCover.src, alt: oldCover.alt, upload: coverSeed });
  const [error, setError] = useState<string | null>(null);
  const upload = cover.upload;
  const uploading = upload?.state === "uploading";
  // Focus follows the file, never falling to <body>: Retry → the upload on the photo; when the photo's item goes away
  // (cancelled, failed or finished) → the photo, one Tab before Change cover or the failed file's Retry.
  const photoRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLUListElement>(null);
  const track = (file: DemoFile) => simulateUpload(file, (next, previous) => {
    const focusOnPhoto = overlayRef.current?.matches(":focus-within");
    // Each step replaces the try it moved on from (a cancelled or retried one is left alone); a finished upload becomes
    // the cover and the overlay goes away.
    setCover((current) => (current.upload !== previous ? current
      : next.state === "uploaded" && next.previewUrl ? { src: next.previewUrl, alt: altOf(next) }
        : { ...current, upload: next }));
    if (focusOnPhoto && next.state !== "uploading") setTimeout(() => { if (!overlayRef.current) photoRef.current?.focus(); });
  });
  // The demo: the new cover's upload starts once you point at or tab into the example, so you see it run.
  const [running, setRunning] = useState(false);
  const run = () => {
    if (running) return;
    setRunning(true);
    if (upload && uploading) track(upload);
  };
  const retry = () => {
    if (!upload) return;
    const next = restart(upload);
    setCover((current) => ({ ...current, upload: next }));
    track(next);
    setTimeout(() => overlayRef.current?.focus());
  };
  // The X cancels and the old cover stays; in the field, FileUpload moves focus to Change cover by itself.
  const cancel = () => setCover((current) => ({ src: current.src, alt: current.alt }));
  const cancelOnPhoto = () => {
    cancel();
    setTimeout(() => photoRef.current?.focus());
  };
  const add = ([file]: File[]) => {
    const reason = rejectReason(file, ["jpg", "jpeg", "png"], 10_000_000, "a JPG or PNG");
    setError(reason ? `${reason} Choose a JPG or PNG up to 10 MB.` : null);
    if (reason) return;
    const next = startUpload(file, URL.createObjectURL(file));
    setCover((current) => ({ ...current, upload: next }));
    track(next);
  };
  return (
    <Stack gap="md" onPointerEnter={run} onFocus={run}>
      <Stack ref={photoRef} tabIndex={-1}>
        <Image src={uploading ? upload.previewUrl ?? cover.src : cover.src} alt={uploading ? altOf(upload) : cover.alt} ratio="16:9" radius="3xl" />
        {uploading ? (
          // Neutral progress floats on the photo (Left & right / Bottom, Padding/Small in from three edges); the photo's
          // radius (3XLarge, 28) is the item's (Large, 16) plus that inset, so the corners stay concentric. The X cancels
          // and the old cover stays.
          <Stack as="ul" ref={overlayRef} tabIndex={-1} position="absolute" constraintX="left-right" constraintY="bottom" insetLeft="sm" insetRight="sm" insetBottom="sm"
            aria-label="Cover upload">
            <UploaderFileItem theme="overlay" thumbnail="none" file={upload} onRemove={cancelOnPhoto} />
          </Stack>
        ) : null}
      </Stack>
      {/* A failed upload leaves the photo: it waits in the field, readable on the surface, with Retry and the X. */}
      <FileUpload label="Cover photo" type="button" buttonLabel="Change cover" accept=".jpg,.jpeg,.png"
        helpText="JPG or PNG, at least 1600 × 900 px. Max size of 10 MB." error={error ?? undefined}
        files={upload?.state === "alert" ? [upload] : []} onFilesAdd={add} onRetry={retry} onRemove={cancel} />
    </Stack>
  );
}
