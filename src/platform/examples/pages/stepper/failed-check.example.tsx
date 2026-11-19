import { useRef, useState } from "react";
import { Button, Card, Heading, InlineMessage, Stack, Stepper, Text, plural, useToast, useZen, type StepperOrientation, type StepperStep } from "@zen-ds/react";

const IMPORT_FILE = "timesheet-sep-2026.csv";
const IMPORT_ROWS = 214;

/** A timesheet import whose Check step failed: the stepper marks it, an Inline Message offers the fix. */
// orientation: horizontal while every step gets 104px, vertical in a narrower column (a card on a phone or beside
// another) instead of squeezing the titles. Unset, it follows the breakpoint: vertical on a phone.
export default function FailedCheck({ orientation }: { orientation?: StepperOrientation }) {
  const { toast } = useToast();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const importRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [fixed, setFixed] = useState(false);
  const [phase, setPhase] = useState<"check" | "importing" | "done">("check");
  const current = phase === "check" ? 2 : phase === "importing" ? 3 : 4;
  const steps: StepperStep[] = [
    { id: "upload", title: "Upload", caption: plural(IMPORT_ROWS, "row") },
    { id: "columns", title: "Columns", caption: "6 of 6 matched" },
    { id: "check", title: "Check", caption: fixed ? "All rows valid" : "3 rows to fix", error: !fixed },
    { id: "import", title: "Import" },
  ];
  const phone = useZen()?.breakpoint === "mobile";

  // Undo takes the entries out again: back to the checked file, focus on Import entries.
  const undoImport = () => {
    setPhase("check");
    setTimeout(() => importRef.current?.focus());
  };
  const fix = () => {
    setFixed(true);
    setTimeout(() => importRef.current?.focus());
  };
  // The status line takes focus, so it is read out now and again when the import is done. A demo import: a second and
  // a half, then the entries are in and a toast offers Undo.
  const start = () => {
    setPhase("importing");
    setTimeout(() => statusRef.current?.focus());
    setTimeout(() => {
      setPhase("done");
      toast({ type: "positive", title: "Time entries imported", children: `${plural(IMPORT_ROWS, "entry", "entries")} · Loyalty app`,
        action: { label: "Undo", onClick: undoImport } });
    }, 1500);
  };
  const reset = () => { setFixed(false); setPhase("check"); titleRef.current?.focus(); };

  return (
    <Card theme="default" as="section" aria-label="Import time entries">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading ref={titleRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">Import time entries</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{IMPORT_FILE}</Text>
        </Stack>
        <Stepper aria-label="Timesheet import" orientation={orientation ?? (phone ? "vertical" : "horizontal")} steps={steps} current={current} />
        {/* Blocks of one surface, md apart: the message or status, then the card's one action on the right. */}
        {phase === "check" ? (
          fixed ? (
            <InlineMessage theme="positive" title={`All ${IMPORT_ROWS} rows are ready`}>The 3 rows now log time to Loyalty app for Phin & Co.</InlineMessage>
          ) : (
            <InlineMessage theme="negative" title="3 rows have no project" action={{ label: "Use Loyalty app", onClick: fix }}>
              Rows 18, 57 and 140 say “Phin loyalty”, which isn’t a project in Zen.
            </InlineMessage>
          )
        ) : (
          <Text ref={statusRef} tabIndex={-1} role="status" textStyle="Body/Base/Regular" tone="base">
            {phase === "importing" ? `Importing ${plural(IMPORT_ROWS, "entry", "entries")}…` : `${plural(IMPORT_ROWS, "entry", "entries")} added to Loyalty app.`}
          </Text>
        )}
        {phase === "check" && fixed ? (
          <Stack direction="row" justify="end">
            <Button ref={importRef} level="primary" onClick={start}>Import entries</Button>
          </Stack>
        ) : phase === "done" ? (
          <Stack direction="row" justify="end">
            <Button level="tertiary" startIcon="icon-upload-01-line" onClick={reset}>Import another file</Button>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
