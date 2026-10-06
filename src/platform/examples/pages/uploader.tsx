/* Uploader examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Uploader decision: many files track their own upload and
   retry, one file takes the field's place and can be replaced, a required file is checked with the rest of a form,
   a File-Item over a photo uses the Overlay theme, and a phone attaches a document to a request. Uploads are simulated
   (about 3 MB a second) so every state can be tried with real files. */
import { useEffect, useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormActions } from "../../../components/Form";
import { Image } from "../../../components/Image";
import { InputField, NumberField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { Heading, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { FileUpload, UploaderFileItem, type UploaderFile } from "../../../components/Uploader";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { daysFromToday, formatBytes, formatMoney, formatRange, people, studio } from "../data";
import type { ExampleDef } from "../types";

export const page: PlatformPage = "uploader";

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
/** Files in state, with uploads moving on their own until they finish (once `running`). */
function useUploads(seed: DemoFile[], running = true) {
  const [files, setFiles] = useState(seed);
  const busy = running && files.some((file) => file.state === "uploading");
  useEffect(() => {
    if (!busy) return undefined;
    const timer = window.setInterval(() => setFiles((list) => list.map(advance)), TICK);
    return () => window.clearInterval(timer);
  }, [busy]);
  return [files, setFiles] as const;
}
/** Checks a file against the extensions and size a field accepts; returns why it can't be added, or null. */
const rejectReason = (file: File, extensions: string[], maxBytes: number, kinds: string) => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions.includes(ext)) return `${file.name} isn't ${kinds} file.`;
  if (file.size > maxBytes) return `${file.name} is larger than ${formatBytes(maxBytes)}.`;
  return null;
};

// ——— 1. Kickoff files: many files, each with its own progress, error and retry —————————————————————
const KICKOFF_TYPES = ["pdf", "key", "png", "jpg", "jpeg", "zip"];
const KICKOFF_MAX = 100_000_000;
const kickoffSeed: DemoFile[] = [
  { id: "audit", name: "Saola brand audit.pdf", bytes: 4_200_000, size: "4.2 MB", state: "uploaded" },
  { id: "moodboard", name: "Outdoor range moodboard – Da Lat and Sa Pa store visits.key", bytes: 42_700_000, size: "42.7 MB", state: "uploading", progress: 30, caption: "6 seconds left" },
  { id: "photos", name: "Store photos.zip", bytes: 86_000_000, size: "86 MB", state: "alert", error: "Upload failed. Check your connection and retry." },
];

function KickoffFiles() {
  const { toast } = useToast();
  const [files, setFiles] = useUploads(kickoffSeed);
  const [error, setError] = useState<string | null>(null);
  // Check type and size before anything uploads; the field says which file was turned away and why.
  const add = (picked: File[]) => {
    const checked = picked.map((file) => ({ file, reason: rejectReason(file, KICKOFF_TYPES, KICKOFF_MAX, "a PDF, Keynote, image or ZIP") }));
    const rejected = checked.filter((item) => item.reason);
    setFiles((list) => [...list, ...checked.filter((item) => !item.reason).map((item) => startUpload(item.file))]);
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
  const retry = (file: UploaderFile) => setFiles((list) => list.map((item) => (item.id === file.id ? restart(item) : item)));
  return (
    <FileUpload label="Kickoff files" multiple thumbnail="file" accept=".pdf,.key,.png,.jpg,.jpeg,.zip"
      text="Drop files here or choose them" caption="PDF, Keynote, images or ZIP. Max size of 100 MB"
      helpText="Everyone on the Brand refresh team can open these files." error={error ?? undefined}
      files={files} onFilesAdd={add} onRemove={remove} onRetry={retry} />
  );
}

// ——— 2. Workspace logo: one file takes the field's place —————————————————————————————————————————
const LOGO_TYPES = ["png", "jpg", "jpeg", "svg"];
const LOGO_MAX = 2_000_000;
const logoSeed: DemoFile[] = [{ id: "logo", name: "dizai-studio-logo.png", bytes: 48_000, size: "48 KB", state: "uploaded", previewUrl: studio.logo }];

function WorkspaceLogo() {
  const { toast } = useToast();
  const [files, setFiles] = useUploads(logoSeed);
  const [error, setError] = useState<string | null>(null);
  const add = ([file]: File[]) => {
    const reason = rejectReason(file, LOGO_TYPES, LOGO_MAX, "a PNG, JPG or SVG");
    setError(reason ? `${reason} Choose a PNG, JPG or SVG up to 2 MB.` : null);
    if (!reason) setFiles([startUpload(file, URL.createObjectURL(file))]);
  };
  // Remove brings the Upload logo button back, and FileUpload moves focus to it.
  const remove = () => {
    const before = files;
    setFiles([]);
    toast({ title: "Logo removed", action: { label: "Undo", onClick: () => setFiles(before) } });
  };
  // Single file: the File-Item replaces the button. Without onReplace, Replace re-opens the file picker.
  return (
    <FileUpload label="Workspace logo" type="button" buttonLabel="Upload logo" thumbnail="photo" accept=".png,.jpg,.jpeg,.svg"
      helpText="PNG, JPG or SVG, at least 256 × 256 px. Max size of 2 MB." error={error ?? undefined}
      files={files} onFilesAdd={add} onRemove={remove} />
  );
}

// ——— 3. Expense claim: a required receipt is checked with the rest of the form ————————————————————
const RECEIPT_TYPES = ["pdf", "png", "jpg", "jpeg", "heic"];
const WAIT_RECEIPT = "Wait until the receipt finishes uploading.";
const RECEIPT_MAX = 10_000_000;

function ExpenseClaim() {
  const { toast } = useToast();
  const titleId = useId();
  const [description, setDescription] = useState("Lunch with Lumen Bank");
  const [amount, setAmount] = useState<number | null>(126);
  const [receipt, setReceipt] = useUploads([]);
  const [errors, setErrors] = useState<{ description?: string; amount?: string; receipt?: string }>({});
  // "Wait until…" holds only while the receipt uploads: it clears once the file is in.
  const receiptDone = receipt[0]?.state === "uploaded";
  useEffect(() => { if (receiptDone) setErrors((e) => (e.receipt === WAIT_RECEIPT ? { ...e, receipt: undefined } : e)); }, [receiptDone]);
  const addReceipt = ([file]: File[]) => {
    const reason = rejectReason(file, RECEIPT_TYPES, RECEIPT_MAX, "a PDF or photo");
    setErrors((e) => ({ ...e, receipt: reason ? `${reason} Add a PDF or photo up to 10 MB.` : undefined }));
    if (!reason) setReceipt([startUpload(file)]);
  };
  const submit = () => {
    const next = {
      description: description.trim() ? undefined : "Enter what the expense was for.",
      amount: amount ? undefined : "Enter the amount on the receipt.",
      receipt: !receipt.length ? "Add a receipt to submit this expense." : receipt[0].state === "uploading" ? WAIT_RECEIPT : undefined,
    };
    setErrors(next);
    if (next.description || next.amount || next.receipt) return;
    toast({ type: "positive", title: "Expense submitted", children: `${formatMoney(amount ?? 0, true)} · ${description.trim()}` });
    setDescription("");
    setAmount(null);
    setReceipt([]);
  };
  return (
    <Card theme="flat">
      {/* One level of blocks (md): title → fields → actions. */}
      <Form onSubmit={submit} gap="md" aria-labelledby={titleId}>
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">New expense</Heading>
        <InputField label="Description" value={description} error={errors.description}
          onValueChange={(value) => { setDescription(value); setErrors((e) => ({ ...e, description: undefined })); }} />
        <NumberField label="Amount (USD)" min={0} step={0.01} value={amount} error={errors.amount}
          onValueChange={(value) => { setAmount(value); setErrors((e) => ({ ...e, amount: undefined })); }} />
        {/* A dense form: the 48px drop zone row (extended={false}). */}
        <FileUpload label="Receipt" extended={false} thumbnail="file" accept=".pdf,.png,.jpg,.jpeg,.heic"
          text="Drop a receipt or choose a file" helpText="PDF or photo. Max size of 10 MB." error={errors.receipt}
          files={receipt} onFilesAdd={addReceipt} onRemove={() => setReceipt([])} />
        <FormActions>
          <Button level="primary" type="submit">Submit expense</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

// ——— 4. Project cover: the File-Item floats over the new photo while it uploads (Overlay theme) —————————
const oldCover = platformMedia.feed[7];
/** What the photo shows (never its file name): the seeded photo is known, a picked one is described generically. */
const altOf = (file: DemoFile) => (file.id === "cover" ? platformMedia.feed[5].alt : "New cover photo");
// The new cover starts uploading; this first try drops at 70% on the studio Wi-Fi.
const coverSeed: DemoFile[] = [{ id: "cover", name: "desert-trail-lookbook.jpg", bytes: 7_400_000, size: "7.4 MB", state: "uploading", progress: 0, caption: "3 seconds left", failAt: 70, previewUrl: platformMedia.feed[5].src }];

function ProjectCover() {
  const root = useRef<HTMLDivElement>(null);
  // The demo upload starts once the cover is on screen, so the reader sees it run.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (inView) return undefined;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true); }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);
  const [cover, setCover] = useState({ src: oldCover.src, alt: oldCover.alt });
  const [pending, setPending] = useUploads(coverSeed, inView);
  const [error, setError] = useState<string | null>(null);
  const upload = pending[0];
  const uploading = upload?.state === "uploading";
  // Focus follows the file, never falling to <body>: Retry → the X on the photo; a failed try → Retry in the field;
  // cancelled or finished → Change cover.
  const focusNext = useRef<string | null>(null);
  const onPhoto = useRef(false);
  useEffect(() => {
    const lost = onPhoto.current && document.activeElement === document.body;
    const selector = focusNext.current ?? (lost ? (upload?.state === "alert" ? ".zen-upload-file__actions button" : ".zen-file-upload__button button") : null);
    focusNext.current = null;
    if (!selector) return;
    onPhoto.current = false;
    root.current?.querySelector<HTMLElement>(selector)?.focus();
  }, [upload?.state]);
  // A finished upload becomes the cover; the overlay goes away.
  useEffect(() => {
    if (upload?.state === "uploaded" && upload.previewUrl) {
      setCover({ src: upload.previewUrl, alt: altOf(upload) });
      setPending([]);
    }
  }, [upload, setPending]);
  const retry = () => { focusNext.current = 'ul[aria-label="Cover upload"] button'; setPending((list) => list.map(restart)); };
  const cancel = () => { focusNext.current = ".zen-file-upload__button button"; setPending([]); };
  const add = ([file]: File[]) => {
    const reason = rejectReason(file, ["jpg", "jpeg", "png"], 10_000_000, "a JPG or PNG");
    setError(reason ? `${reason} Choose a JPG or PNG up to 10 MB.` : null);
    if (!reason) setPending([startUpload(file, URL.createObjectURL(file))]);
  };
  return (
    <Stack ref={root} gap="md">
      <Stack>
        <Image src={uploading ? upload.previewUrl ?? cover.src : cover.src} alt={uploading ? altOf(upload) : cover.alt} ratio="16:9" radius="3xl" />
        {uploading ? (
          // Neutral progress floats on the photo (Left & right / Bottom, Padding/Small in from three edges); the photo's
          // radius (3XLarge, 28) is the item's (Large, 16) plus that inset, so the corners stay concentric. The X cancels
          // and the old cover stays.
          <Stack as="ul" position="absolute" constraintX="left-right" constraintY="bottom" insetLeft="sm" insetRight="sm" insetBottom="sm"
            aria-label="Cover upload" onFocus={() => { onPhoto.current = true; }}
            onBlur={(event) => { if (event.relatedTarget) onPhoto.current = false; }}>
            <UploaderFileItem theme="overlay" thumbnail="none" file={upload} onRemove={cancel} />
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

// ——— 5. On a phone: attach a doctor's note to a sick-leave request ——————————————————————————————
// Studio policy (the Accordion page's FAQ): 12 paid sick days a year, and a doctor's note for more than 2 days in a row.
// Alex's balance matches the Dock Icon page: 9 of 18 annual days and 10 of 12 sick days left.
const leave = { start: daysFromToday(1), end: daysFromToday(5), days: 3, approver: people.minhAnh };
const WAIT_NOTE = "Wait until the note finishes uploading.";
type PhoneStep = "root" | "request" | "sent";

function PhoneSickLeave() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  // The example opens on the request (the screen it teaches); Close leads back to Time off.
  const [step, setStep] = useState<PhoneStep>("request");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useUploads([]);
  const [error, setError] = useState<string | null>(null);
  // "Wait until…" holds only while the note uploads: it clears once the file is in.
  const noteDone = note[0]?.state === "uploaded";
  useEffect(() => { if (noteDone) setError((e) => (e === WAIT_NOTE ? null : e)); }, [noteDone]);
  const [confirming, setConfirming] = useState(false);
  const add = ([file]: File[]) => {
    const reason = rejectReason(file, RECEIPT_TYPES, RECEIPT_MAX, "a PDF or photo");
    setError(reason ? `${reason} Add a PDF or photo up to 10 MB.` : null);
    if (!reason) setNote([startUpload(file)]);
  };
  const openRequest = () => screen.go('.zen-top-nav__action[aria-label="Close"]', () => { setNote([]); setError(null); setStep("request"); });
  const toRoot = () => screen.go(".zen-action-bar button", () => { setConfirming(false); setStep("root"); });
  // Close asks first when there is something to lose: a note that is attached or still uploading.
  const close = () => (step === "request" && note.length ? setConfirming(true) : toRoot());
  // Send checks for the note; a missing or unfinished one shows its error on the field, and Form moves focus there.
  const send = () => {
    const reason = !note.length ? "Add a doctor's note for more than 2 days of sick leave." : note[0].state === "uploading" ? WAIT_NOTE : null;
    setError(reason);
    if (!reason) screen.go(".zen-action-bar button", () => { setPending(true); setStep("sent"); });
  };

  if (step === "root") {
    return (
      <PlatformPhone key="root" label="Time off" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Time off" largeTitle="Time off" scrollRef={screenRef} />}
        footer={<ActionBar position="static" primaryAction={{ label: "Request sick leave", onClick: openRequest }} />}>
        {screen.anchor}
        <Box padding="lg">
          <DescriptionList items={[
            { id: "annual", term: "Annual leave", description: "9 of 18 days left" },
            { id: "sick", term: "Sick leave", description: pending ? `10 of 12 days left · ${plural(leave.days, "day")} pending` : "10 of 12 days left" },
            { id: "approver", term: "Approver", description: leave.approver.name },
          ]} />
        </Box>
      </PlatformPhone>
    );
  }

  return (
    // A create screen opened from Time off: Close is its way out, and it asks before dropping the note.
    <PlatformPhone key="request" label="Sick leave" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="Sick leave" scrollRef={screenRef}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
      footer={step === "sent"
        ? <ActionBar position="static" primaryAction={{ label: "View balance", onClick: toRoot }} />
        : <ActionBar position="static" primaryAction={{ label: "Send request", type: "submit", form: formId }} />}>
      {screen.anchor}
      {step === "sent" ? (
        <Box padding="lg">
          <EmptyState headingLevel={2} icon="icon-check-circle-line" title="Request sent">
            {`${leave.approver.name} will review it. You'll get a notification when it's approved.`}
          </EmptyState>
        </Box>
      ) : (
        <Box padding="lg">
          <Form id={formId} onSubmit={send}>
            <DescriptionList items={[
              { id: "type", term: "Type", description: "Sick leave" },
              { id: "dates", term: "Dates", description: formatRange(leave.start, leave.end) },
              { id: "days", term: "Days", description: plural(leave.days, "working day") },
              { id: "approver", term: "Approver", description: leave.approver.name },
            ]} />
            <FileUpload label="Doctor's note" thumbnail="file" accept=".pdf,.png,.jpg,.jpeg,.heic"
              text="Take a photo or choose a file" caption="PDF or photo. Max size of 10 MB"
              helpText="Needed for more than 2 days of sick leave in a row." error={error ?? undefined}
              files={note} onFilesAdd={add} onRemove={() => setNote([])} />
          </Form>
        </Box>
      )}
      {/* Inside a PlatformPhone the Dialog opens in the device frame: its scrim covers this screen only. */}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Discard this request?"
        description="Your sick leave request and the doctor's note you attached won't be sent."
        actionsDirection="vertical"
        primaryAction={{ label: "Discard request", level: "danger", onClick: toRoot }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Kickoff files",
    description: "Several files upload side by side, each with its own progress and time left; the X cancels an upload or removes a file. A failed upload keeps its place with Retry, and a file that is too big or the wrong type is turned away at the field with the reason.",
    render: () => <KickoffFiles />,
    code: `const [files, setFiles] = useState(seed); // { id, name, size, state, progress, caption, error }

<FileUpload label="Kickoff files" multiple thumbnail="file" accept=".pdf,.key,.png,.jpg,.jpeg,.zip"
  text="Drop files here or choose them" caption="PDF, Keynote, images or ZIP. Max size of 100 MB"
  helpText="Everyone on the Brand refresh team can open these files." error={error}
  files={files} onFilesAdd={add} onRemove={remove} onRetry={retry} />

// add: check type and size first, then upload the rest
//   { state: "uploading", progress: 30, caption: "6 seconds left" } → { state: "uploaded" }
// retry: { ...file, state: "uploading", progress: 0, error: undefined }`,
  },
  {
    title: "Attach on a phone",
    description: "On a phone the drop zone is one large target that opens the camera or files, so its text says so. Send request checks for the note and says what's missing on the field; Close asks before it drops an attached note.",
    render: () => <PhoneSickLeave />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="request" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Sick leave" scrollRef={screenRef}
    leading={{ icon: "icon-x-medium-line", label: "Close", onClick: () => (note.length ? setConfirming(true) : close()) }} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Send request", type: "submit", form: formId }} />}>
  <Form id={formId} onSubmit={send}>
    <DescriptionList items={summary} />
    <FileUpload label="Doctor's note" thumbnail="file" accept=".pdf,.png,.jpg,.jpeg,.heic"
      text="Take a photo or choose a file" caption="PDF or photo. Max size of 10 MB"
      helpText="Needed for more than 2 days of sick leave in a row." error={error}
      files={note} onFilesAdd={add} onRemove={() => setNote([])} />
  </Form>
  {/* Inside the phone the Dialog opens in the device frame: its scrim covers this screen only. */}
  <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Discard this request?" actionsDirection="vertical"
    primaryAction={{ label: "Discard request", level: "danger", onClick: close }}
    secondaryAction={{ label: "Keep editing", autoFocus: true }} />
</PlatformPhone>`,
  },
  {
    title: "Required receipt",
    description: "In a dense form the drop zone is a 48px row (extended={false}). Submit checks the receipt with the other fields: a missing or unfinished upload shows its error on the field and focus moves to it.",
    render: () => <ExpenseClaim />,
    code: `<Form onSubmit={submit} gap="md">
  <InputField label="Description" value={description} onValueChange={setDescription} error={errors.description} />
  <NumberField label="Amount (USD)" min={0} step={0.01} value={amount} onValueChange={setAmount} error={errors.amount} />
  <FileUpload label="Receipt" extended={false} thumbnail="file" accept=".pdf,.png,.jpg,.jpeg,.heic"
    text="Drop a receipt or choose a file" helpText="PDF or photo. Max size of 10 MB."
    error={errors.receipt} files={receipt} onFilesAdd={addReceipt} onRemove={() => setReceipt([])} />
  <FormActions>
    <Button level="primary" type="submit">Submit expense</Button>
  </FormActions>
</Form>

// submit: receipt.length === 0 → errors.receipt = "Add a receipt to submit this expense."`,
  },
  {
    title: "Upload over a photo",
    description: "The new cover shows at once, and its File-Item floats on the photo in the Overlay theme while it uploads. If the upload fails, the old cover comes back and the file waits in the field with its error and Retry, readable on the surface; the X drops it.",
    render: () => <ProjectCover />,
    code: `<Stack>
  <Image src={uploading ? upload.previewUrl : cover.src} alt={cover.alt} ratio="16:9" radius="3xl" />
  {uploading ? (
    // Pinned Left & right / Bottom, sm in (image radius 3xl = item radius lg + sm)
    <Stack as="ul" position="absolute" constraintX="left-right" constraintY="bottom" insetLeft="sm" insetRight="sm" insetBottom="sm" aria-label="Cover upload">
      <UploaderFileItem theme="overlay" thumbnail="none" file={upload} onRemove={cancel} />
    </Stack>
  ) : null}
</Stack>
{/* A failed upload (state "alert") moves into the field: error text and Retry on the surface, never on the photo. */}
<FileUpload label="Cover photo" type="button" buttonLabel="Change cover" accept=".jpg,.jpeg,.png"
  helpText="JPG or PNG, at least 1600 × 900 px. Max size of 10 MB."
  files={upload?.state === "alert" ? [upload] : []}
  onFilesAdd={([file]) => startUpload(file)} onRetry={retry} onRemove={cancel} />`,
  },
  {
    title: "Workspace logo",
    description: "A single-file field: the logo's File-Item takes the button's place. Replace opens the file picker again, and Remove brings the Upload logo button back, with Undo in the toast.",
    render: () => <WorkspaceLogo />,
    code: `<FileUpload label="Workspace logo" type="button" buttonLabel="Upload logo" thumbnail="photo"
  accept=".png,.jpg,.jpeg,.svg" helpText="PNG, JPG or SVG, at least 256 × 256 px. Max size of 2 MB."
  files={[{ id: "logo", name: "dizai-studio-logo.png", size: "48 KB", state: "uploaded", previewUrl: logoUrl }]}
  onFilesAdd={([file]) => upload(file)} onRemove={remove} />
{/* No onReplace: Replace re-opens the file picker. */}`,
  },
];
