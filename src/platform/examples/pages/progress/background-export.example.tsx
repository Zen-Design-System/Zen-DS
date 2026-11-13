import { useId, useRef, useState } from "react";
import { Button, FileIcon, Heading, IconButton, List, ListBox, ListItem, ProgressBar, Stack, Text, VisuallyHidden, fileIconFormatOf, plural, useToast } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRange, formatRelative, workspacePlan } from "../../data";

type ExportFile = { id: string; name: string; size: string; at: Date };
const EXPORT_NAME = "q3-time-report.csv";
const earlierExports: ExportFile[] = [
  { id: "aug", name: "aug-time-report.csv", size: "740 KB", at: daysFromToday(-29, 17, 2) },
  { id: "q2", name: "q2-time-report.csv", size: "2.1 MB", at: daysFromToday(-91, 9, 14) },
];

/** A long export runs as a row in the list, so people keep working. */
export default function BackgroundExport() {
  const { toast } = useToast();
  const titleId = useId();
  const listId = useId();
  const exportRef = useRef<HTMLButtonElement>(null);
  const downloadRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [exports, setExports] = useState(earlierExports);
  const [percent, setPercent] = useState<number | null>(null);
  /** The job's next step, so Cancel can stop it. */
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();
  const [announcement, setAnnouncement] = useState("");
  const running = percent !== null;

  // View: put focus on the new file's Download button (the rows are Interactive=No: their only action is Download).
  const view = (id: string) => setTimeout(() => downloadRefs.current[id]?.focus());
  const finish = () => {
    const id = `q3-${Date.now()}`;
    setExports((list) => [{ id, name: EXPORT_NAME, size: "2.3 MB", at: TODAY }, ...list]);
    setPercent(null);
    setTimer(undefined);
    setAnnouncement("Export ready");
    toast({ type: "positive", title: "Export ready", children: `${EXPORT_NAME} · 2.3 MB`, action: { label: "View", onClick: () => view(id) } });
  };
  // A demo job: about six seconds of work, then a short save step so the bar never sits at 100% unexplained.
  const run = (at: number) => {
    setPercent(at);
    setTimer(at < 100 ? setTimeout(() => run(Math.min(100, at + 4)), 250) : setTimeout(finish, 700));
  };
  const start = () => { setAnnouncement("Export started"); run(0); };
  // Cancel leaves with its row: focus goes back to Export CSV, which is enabled again, not to <body>.
  const cancel = () => {
    clearTimeout(timer);
    setTimer(undefined);
    setPercent(null);
    setAnnouncement("Export cancelled");
    setTimeout(() => exportRef.current?.focus());
  };
  const secondsLeft = percent === null ? 0 : Math.ceil((100 - percent) / 16);

  return (
    // A ListBox: the title and Export CSV in its Header-Slot; the Exports kicker xs above the export rows in its Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack direction="row" gap="sm" justify="between" align="start" wrap>
        <Stack gap="2xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Q3 time report</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${formatRange(daysFromToday(-91), TODAY)} · ${plural(workspacePlan.seats, "person", "people")}`}</Text>
        </Stack>
        <Button ref={exportRef} level="tertiary" startIcon="icon-download-01-line" disabled={running} onClick={start}>Export CSV</Button>
      </Stack>}>
      <Stack gap="xs">
        <Heading level={5} id={listId} textStyle="Body/Small/Bold" tone="light">Exports</Heading>
        <List aria-labelledby={listId}>
          {running ? (
            <ListItem title={EXPORT_NAME} leading={<FileIcon format="sheet" size="xl" />}
              trailing={<IconButton appearance="flat" size="md" icon="icon-x-line" aria-label="Cancel export" onClick={cancel} />}>
              <Stack gap="2xs">
                {/* Layout=Stacked: the file name and its percentage on a row above the bar. */}
                <ProgressBar layout="stacked" value={percent} theme="accent" label={EXPORT_NAME} aria-label={`Exporting ${EXPORT_NAME}`} />
                <Text as="span" textStyle="Body/Small/Regular" tone="light">{percent < 100 ? `About ${plural(secondsLeft, "second")} left` : "Saving the file…"}</Text>
              </Stack>
            </ListItem>
          ) : null}
          {exports.map((file) => (
            <ListItem key={file.id} title={file.name} titleLines={2} caption={`${file.size} · ${formatRelative(file.at)}`}
              leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
              trailing={<IconButton ref={(button) => { downloadRefs.current[file.id] = button; }} appearance="flat" size="md" icon="icon-download-01-line"
                aria-label={`Download ${file.name}`} onClick={() => toast({ title: "Download started", children: file.name })} />} />
          ))}
        </List>
      </Stack>
      {/* Out of the flow (absolutely positioned), so it adds no gap under the rows. */}
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
    </ListBox>
  );
}
