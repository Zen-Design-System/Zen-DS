import { useId, useRef, useState } from "react";
import { FileIcon, Heading, InlineMessage, List, ListBox, ListItem, SkeletonShape, SkeletonText, Stack, Text, VisuallyHidden, fileIconFormatOf, plural } from "@zen-ds/react";
import { daysFromToday, formatBytes, formatRelative } from "../../data";

type ProjectFile = { id: string; name: string; bytes: number; at: Date };
const projectFiles: ProjectFile[] = [
  { id: "sow", name: "Lumen Bank SOW v3.pdf", bytes: 420_000, at: daysFromToday(0, 9, 12) },
  { id: "plan", name: "Usability plan – transfers.pdf", bytes: 1_240_000, at: daysFromToday(-1, 16, 5) },
  { id: "wires", name: "Account overview wireframes.fig", bytes: 12_800_000, at: daysFromToday(-2, 11, 40) },
];

/* A placeholder in a text slot stays on the text's line, as wide as the text it stands for (in characters). */
const line = (width: string) => <SkeletonText lines={1} style={{ display: "inline-flex", width, maxWidth: "100%", verticalAlign: "middle" }} />;

export default function ProjectFiles() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  // The first request timed out; Try again shows the placeholders while it runs (1.2 s here), then the files.
  const [phase, setPhase] = useState<"failed" | "retrying" | "ready">("failed");
  const retry = () => {
    setPhase("retrying");
    titleRef.current?.focus();
    setTimeout(() => setPhase("ready"), 1200);
  };
  const busy = phase === "retrying";
  return (
    // A ListBox: the title and project in its Header-Slot; the rows, their placeholders or the failure message in its
    // Body-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Stack gap="2xs">
        <Heading ref={titleRef} tabIndex={-1} level={4} id={titleId} textStyle="Heading/Subheading">Files</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Online banking redesign · Lumen Bank</Text>
      </Stack>}>
      {phase === "failed" ? (
        <InlineMessage theme="negative" title="Files didn’t load" action={{ label: "Try again", onClick: retry }}>
          The file service took too long to answer.
        </InlineMessage>
      ) : (
        <List aria-labelledby={titleId} aria-busy={busy}>
          {busy
            ? projectFiles.map((file) => (
              <ListItem key={file.id} aria-hidden="true" leading={<SkeletonShape shape="square" size="md" />}
                title={line("18ch")} caption={line("11ch")} />
            ))
            : projectFiles.map((file) => (
              <ListItem key={file.id} leading={<FileIcon format={fileIconFormatOf(file.name)} size="xl" />}
                title={file.name} caption={`${formatBytes(file.bytes)} · ${formatRelative(file.at)}`} />
            ))}
        </List>
      )}
      {/* Out of the flow (absolutely positioned), so it adds no gap under the rows. */}
      <VisuallyHidden role="status">{busy ? "Loading files…" : phase === "ready" ? `${plural(projectFiles.length, "file")} loaded` : ""}</VisuallyHidden>
    </ListBox>
  );
}
