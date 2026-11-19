import { useState } from "react";
import { Box, FileUpload, plural, useToast, type UploaderFile } from "@zen-ds/react";
import { formatBytes } from "../../data";

// ——— A demo upload: about 3 MB a second, 2–8 seconds per file ———————————————————————————————————————
type DemoFile = UploaderFile & { bytes: number };
const TICK = 400;
const secondsFor = (bytes: number) => Math.min(8, Math.max(2, bytes / 3_000_000));
const advance = (file: DemoFile): DemoFile => {
  if (file.state !== "uploading") return file;
  const seconds = secondsFor(file.bytes);
  const progress = Math.min(100, (file.progress ?? 0) + (100 * TICK) / (seconds * 1000));
  if (progress >= 100) return { ...file, state: "uploaded", progress: 100, caption: undefined };
  const left = Math.max(1, Math.ceil(((100 - progress) / 100) * seconds));
  return { ...file, progress, caption: `${plural(left, "second")} left` };
};
/** Starts (or restarts, for Retry) a file's upload from 0. */
const restart = (file: DemoFile): DemoFile =>
  ({ ...file, state: "uploading", progress: 0, error: undefined, caption: `${plural(Math.ceil(secondsFor(file.bytes)), "second")} left` });
let uploadCount = 0;
/** A picked or dropped file, starting its upload. */
const startUpload = (file: File): DemoFile =>
  restart({ id: `upload-${++uploadCount}`, name: file.name, bytes: file.size, size: formatBytes(file.size) });
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

// ——— Many files, each with its own progress, error and retry ————————————————————————————————————————
const KICKOFF_TYPES = ["pdf", "key", "png", "jpg", "jpeg", "zip"];
const KICKOFF_MAX = 100_000_000;
const kickoffSeed: DemoFile[] = [
  { id: "audit", name: "Saola brand audit.pdf", bytes: 4_200_000, size: "4.2 MB", state: "uploaded" },
  { id: "moodboard", name: "Outdoor range moodboard – Da Lat and Sa Pa store visits.key", bytes: 42_700_000, size: "42.7 MB", state: "uploading", progress: 30, caption: "6 seconds left" },
  { id: "photos", name: "Store photos.zip", bytes: 86_000_000, size: "86 MB", state: "alert", error: "Upload failed. Check your connection and retry." },
];

export default function KickoffFiles() {
  const { toast } = useToast();
  const [files, setFiles] = useState(kickoffSeed);
  const [error, setError] = useState<string | null>(null);
  // Each step replaces the file it moved on from, so a file removed or retried in the meantime is left alone.
  const track = (file: DemoFile) => simulateUpload(file, (next, previous) => setFiles((list) => list.map((item) => (item === previous ? next : item))));
  // The demo: the upload already under way moves on once you point at or tab into the field, so you see it run.
  const [running, setRunning] = useState(false);
  const run = () => {
    if (running) return;
    setRunning(true);
    files.filter((file) => file.state === "uploading").forEach(track);
  };
  // Check type and size before anything uploads; the field says which file was turned away and why.
  const add = (picked: File[]) => {
    const checked = picked.map((file) => ({ file, reason: rejectReason(file, KICKOFF_TYPES, KICKOFF_MAX, "a PDF, Keynote, image or ZIP") }));
    const rejected = checked.filter((item) => item.reason);
    const added = checked.filter((item) => !item.reason).map((item) => startUpload(item.file));
    setFiles((list) => [...list, ...added]);
    added.forEach(track);
    setError(!rejected.length ? null
      : rejected.length === 1 ? `${rejected[0].reason} Add PDF, Keynote, images or ZIP files up to 100 MB.`
        : `${plural(rejected.length, "file")} weren't added. Add PDF, Keynote, images or ZIP files up to 100 MB.`);
  };
  // The X cancels an upload; on an uploaded file it removes it, and Undo puts it back in its place. FileUpload moves
  // focus to the next file's X (or the drop zone) by itself.
  const remove = (file: UploaderFile) => {
    const index = files.findIndex((item) => item.id === file.id);
    setFiles((list) => list.filter((item) => item.id !== file.id));
    if (file.state === "uploaded") {
      toast({ title: "File removed", children: file.name,
        action: { label: "Undo", onClick: () => setFiles((list) => [...list.slice(0, index), file as DemoFile, ...list.slice(index)]) } });
    }
  };
  const retry = (file: UploaderFile) => {
    const next = restart(file as DemoFile);
    setFiles((list) => list.map((item) => (item.id === file.id ? next : item)));
    track(next);
  };
  return (
    <Box onPointerEnter={run} onFocus={run}>
      <FileUpload label="Kickoff files" multiple thumbnail="file" accept=".pdf,.key,.png,.jpg,.jpeg,.zip"
        text="Drop files here or choose them" caption="PDF, Keynote, images or ZIP. Max size of 100 MB"
        helpText="Everyone on the Brand refresh team can open these files." error={error ?? undefined}
        files={files} onFilesAdd={add} onRemove={remove} onRetry={retry} />
    </Box>
  );
}
