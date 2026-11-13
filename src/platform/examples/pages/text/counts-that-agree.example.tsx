import { useId, useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Form, FormActions, FormFieldset, Heading, Stack, Text, plural, useToast } from "@zen-ds/react";
import { formatBytes } from "../../data";

type Deliverable = { id: string; name: string; pages?: number; bytes: number };
const deliverables: Deliverable[] = [
  { id: "spec", name: "Points history – design spec.pdf", pages: 12, bytes: 4_210_000 },
  { id: "summary", name: "Sprint 14 summary.pdf", pages: 1, bytes: 380_000 },
  { id: "plan", name: "Android beta – test plan.pdf", pages: 4, bytes: 920_000 },
  { id: "contract", name: "Rewards API contract.json", bytes: 86_000 },
];
const clientEmail = "trang.le@phinco.vn";

export default function SendFiles() {
  const { toast } = useToast();
  const [picked, setPicked] = useState<string[]>(["spec", "summary"]);
  const [error, setError] = useState<string>();
  const titleId = useId();
  const chosen = deliverables.filter((file) => picked.includes(file.id));
  const bytes = chosen.reduce((sum, file) => sum + file.bytes, 0);
  const toggle = (id: string, on: boolean) => { setPicked((list) => (on ? [...list, id] : list.filter((item) => item !== id))); setError(undefined); };
  // Nothing chosen: the error goes on the group and Form moves focus to it and announces it.
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chosen.length) { setError("Choose at least one file to send."); return; }
    toast({ type: "positive", title: `${plural(chosen.length, "file")} sent`, children: `To ${clientEmail}` });
    setPicked([]);
  };
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Send files to Phin & Co</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`To ${clientEmail}`}</Text>
        </Stack>
        <Form onSubmit={send} gap="md" aria-labelledby={titleId}>
          <FormFieldset kind="checkbox" legend="Files to send" hideLegend error={error}>
            {deliverables.map((file) => (
              <Checkbox key={file.id} label={file.name} checked={picked.includes(file.id)} onCheckedChange={(on) => toggle(file.id, on)}
                caption={file.pages ? `${plural(file.pages, "page")} · ${formatBytes(file.bytes)}` : formatBytes(file.bytes)} />
            ))}
          </FormFieldset>
          {/* Every count goes through plural(): 1 file, 2 files, 1 page, 12 pages. */}
          <Text role="status" textStyle="Body/Small/Regular" tone="base">
            {chosen.length ? `${plural(chosen.length, "file")} selected · ${formatBytes(bytes)}` : "No files selected"}
          </Text>
          <FormActions>
            <Button level="primary" type="submit">{chosen.length ? `Send ${plural(chosen.length, "file")}` : "Send files"}</Button>
          </FormActions>
        </Form>
      </Stack>
    </Card>
  );
}
