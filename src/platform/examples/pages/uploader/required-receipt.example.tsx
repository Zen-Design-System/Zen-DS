import { useId, useState } from "react";
import { Button, Card, FileUpload, Form, FormActions, Heading, InputField, NumberField, plural, useToast, type UploaderFile } from "@zen-ds/react";
import { formatBytes, formatMoney } from "../../data";

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

// ——— A required receipt is checked with the rest of the form ——————————————————————————————————————
const RECEIPT_TYPES = ["pdf", "png", "jpg", "jpeg", "heic"];
const WAIT_RECEIPT = "Wait until the receipt finishes uploading.";
const RECEIPT_MAX = 10_000_000;

export default function ExpenseClaim() {
  const { toast } = useToast();
  const titleId = useId();
  const [description, setDescription] = useState("Lunch with Lumen Bank");
  const [amount, setAmount] = useState<number | null>(126);
  const [receipt, setReceipt] = useState<DemoFile[]>([]);
  const [errors, setErrors] = useState<{ description?: string; amount?: string; receipt?: string }>({});
  const track = (file: DemoFile) => simulateUpload(file, (next, previous) => {
    // Each step replaces the file it moved on from, so a receipt removed in the meantime is left alone.
    setReceipt((list) => list.map((item) => (item === previous ? next : item)));
    // "Wait until…" holds only while the receipt uploads: it clears once the file is in.
    if (next.state === "uploaded") setErrors((e) => (e.receipt === WAIT_RECEIPT ? { ...e, receipt: undefined } : e));
  });
  const addReceipt = ([file]: File[]) => {
    const reason = rejectReason(file, RECEIPT_TYPES, RECEIPT_MAX, "a PDF or photo");
    setErrors((e) => ({ ...e, receipt: reason ? `${reason} Add a PDF or photo up to 10 MB.` : undefined }));
    if (reason) return;
    const upload = startUpload(file);
    setReceipt([upload]);
    track(upload);
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
    <Card theme="default">
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
