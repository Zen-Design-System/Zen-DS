import { useId, useRef, useState, type RefObject } from "react";
import { ActionBar, AppShell, DescriptionList, Dialog, EmptyState, FileUpload, Form, TopNavigation, plural, type UploaderFile } from "@zen-ds/react";
import { daysFromToday, formatBytes, formatRange, people } from "../../data";

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
/** A picked file or photo, starting its upload from 0. */
const startUpload = (file: File): DemoFile => ({
  id: `upload-${++uploadCount}`, name: file.name, bytes: file.size, size: formatBytes(file.size),
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

// ——— Attach a doctor's note to a sick-leave request ——————————————————————————————————————————————
// Studio policy: 12 paid sick days a year, and a doctor's note for more than 2 days in a row. Alex has 9 of 18 annual
// days and 10 of 12 sick days left.
const NOTE_TYPES = ["pdf", "png", "jpg", "jpeg", "heic"];
const NOTE_MAX = 10_000_000;
const leave = { start: daysFromToday(1), end: daysFromToday(5), days: 3, approver: people.minhAnh };
const WAIT_NOTE = "Wait until the note finishes uploading.";
type PhoneStep = "root" | "request" | "sent";

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneSickLeave({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const formId = useId();
  // The example opens on the request (the screen it teaches); Close leads back to Time off.
  const [step, setStep] = useState<PhoneStep>("request");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<DemoFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Focus follows the screen: the request focuses its title, Time off its title, and a sent request "Request sent".
  const rootTitleRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const sentRef = useRef<HTMLSpanElement>(null);
  const show = (next: PhoneStep, focus: RefObject<HTMLElement | null>) => {
    setStep(next);
    setTimeout(() => focus.current?.focus());
  };
  const track = (file: DemoFile) => simulateUpload(file, (next, previous) => {
    // Each step replaces the file it moved on from, so a note removed in the meantime is left alone.
    setNote((list) => list.map((item) => (item === previous ? next : item)));
    // "Wait until…" holds only while the note uploads: it clears once the file is in.
    if (next.state === "uploaded") setError((e) => (e === WAIT_NOTE ? null : e));
  });
  const add = ([file]: File[]) => {
    const reason = rejectReason(file, NOTE_TYPES, NOTE_MAX, "a PDF or photo");
    setError(reason ? `${reason} Add a PDF or photo up to 10 MB.` : null);
    if (reason) return;
    const upload = startUpload(file);
    setNote([upload]);
    track(upload);
  };
  const openRequest = () => {
    setNote([]);
    setError(null);
    show("request", titleRef);
  };
  const toRoot = () => {
    setConfirming(false);
    show("root", rootTitleRef);
  };
  // Close asks first when there is something to lose: a note that is attached or still uploading.
  const close = () => (step === "request" && note.length ? setConfirming(true) : toRoot());
  // Send checks for the note; a missing or unfinished one shows its error on the field, and Form moves focus there.
  const send = () => {
    const reason = !note.length ? "Add a doctor's note for more than 2 days of sick leave." : note[0].state === "uploading" ? WAIT_NOTE : null;
    setError(reason);
    if (reason) return;
    setPending(true);
    show("sent", sentRef);
  };

  if (step === "root") {
    return (
      // A tab root: the large title folds into the bar as the screen scrolls.
      <AppShell key="root"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Time off" largeTitle={<span ref={rootTitleRef} tabIndex={-1}>Time off</span>} />}
        actionBar={<ActionBar primaryAction={{ label: "Request sick leave", onClick: openRequest }} />}>
        <DescriptionList items={[
          { id: "annual", term: "Annual leave", description: "9 of 18 days left" },
          { id: "sick", term: "Sick leave", description: pending ? `10 of 12 days left · ${plural(leave.days, "day")} pending` : "10 of 12 days left" },
          { id: "approver", term: "Approver", description: leave.approver.name },
        ]} />
      </AppShell>
    );
  }

  return (
    // A create screen opened from Time off: Close is its way out, and it asks before dropping the note.
    <AppShell key="request"
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>Sick leave</span>}
        leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
      actionBar={step === "sent"
        ? <ActionBar primaryAction={{ label: "View balance", onClick: toRoot }} />
        : <ActionBar primaryAction={{ label: "Send request", type: "submit", form: formId }} />}>
      {step === "sent" ? (
        <EmptyState headingLevel={2} icon="icon-check-circle-line" title={<span ref={sentRef} tabIndex={-1}>Request sent</span>}>
          {`${leave.approver.name} will review it. You'll get a notification when it's approved.`}
        </EmptyState>
      ) : (
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
      )}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="negative" title="Discard this request?"
        description="Your sick leave request and the doctor's note you attached won't be sent."
        actionsDirection="vertical"
        primaryAction={{ label: "Discard request", level: "danger", onClick: toRoot }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </AppShell>
  );
}
