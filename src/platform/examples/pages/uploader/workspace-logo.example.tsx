import { useState } from "react";
import { FileUpload, plural, useToast, type UploaderFile } from "@zen-ds/react";
import { formatBytes, studio } from "../../data";

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
let uploadCount = 0;
/** A picked or dropped file, starting its upload from 0. */
const startUpload = (file: File, previewUrl?: string): DemoFile => ({
  id: `upload-${++uploadCount}`, name: file.name, bytes: file.size, size: formatBytes(file.size), previewUrl,
  state: "uploading", progress: 0, caption: `${plural(Math.ceil(secondsFor(file.size)), "second")} left`,
});
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

// ——— One file takes the field's place ——————————————————————————————————————————————————————————————
const LOGO_TYPES = ["png", "jpg", "jpeg", "svg"];
const LOGO_MAX = 2_000_000;
const logoSeed: DemoFile[] = [{ id: "logo", name: "dizai-studio-logo.png", bytes: 48_000, size: "48 KB", state: "uploaded", previewUrl: studio.logo }];

export default function WorkspaceLogo() {
  const { toast } = useToast();
  const [files, setFiles] = useState(logoSeed);
  const [error, setError] = useState<string | null>(null);
  // Each step replaces the file it moved on from, so a logo removed or replaced in the meantime is left alone.
  const track = (file: DemoFile) => simulateUpload(file, (next, previous) => setFiles((list) => list.map((item) => (item === previous ? next : item))));
  const add = ([file]: File[]) => {
    const reason = rejectReason(file, LOGO_TYPES, LOGO_MAX, "a PNG, JPG or SVG");
    setError(reason ? `${reason} Choose a PNG, JPG or SVG up to 2 MB.` : null);
    if (reason) return;
    const upload = startUpload(file, URL.createObjectURL(file));
    setFiles([upload]);
    track(upload);
  };
  // Remove brings the Upload logo button back, and FileUpload moves focus to it. Undo puts the logo back (an upload it
  // cancelled carries on).
  const remove = () => {
    const before = files;
    setFiles([]);
    toast({ title: "Logo removed", action: { label: "Undo", onClick: () => {
      setFiles(before);
      before.filter((file) => file.state === "uploading").forEach(track);
    } } });
  };
  // Single file: the File-Item replaces the button. Without onReplace, Replace re-opens the file picker.
  return (
    <FileUpload label="Workspace logo" type="button" buttonLabel="Upload logo" thumbnail="photo" accept=".png,.jpg,.jpeg,.svg"
      helpText="PNG, JPG or SVG, at least 256 × 256 px. Max size of 2 MB." error={error ?? undefined}
      files={files} onFilesAdd={add} onRemove={remove} />
  );
}
